import { Prisma, type PaymentStatus } from "@prisma/client";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

const SERIALIZABLE_RETRY_LIMIT = 3;

export class StripeOrderMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeOrderMismatchError";
  }
}

/** Reîncearcă tranzacțiile PostgreSQL care intră într-un conflict serializabil. */
export async function runSerializableTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 1; attempt <= SERIALIZABLE_RETRY_LIMIT; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const canRetry =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < SERIALIZABLE_RETRY_LIMIT;
      if (!canRetry) throw error;
    }
  }

  throw new Error("SERIALIZABLE_TRANSACTION_RETRY_EXHAUSTED");
}

function paymentIntentId(checkoutSession: Stripe.Checkout.Session) {
  return typeof checkoutSession.payment_intent === "string"
    ? checkoutSession.payment_intent
    : checkoutSession.payment_intent?.id ?? null;
}

/**
 * Sincronizează idempotent o comandă cu o sesiune Stripe recuperată de pe
 * server. Verifică identitatea, utilizatorul, moneda și suma înainte de plată.
 */
export async function reconcileStripeCheckoutSession(
  checkoutSession: Stripe.Checkout.Session,
) {
  return runSerializableTransaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { stripeCheckoutSessionId: checkoutSession.id },
      select: {
        id: true,
        userId: true,
        paymentMethod: true,
        paymentStatus: true,
        totalAmount: true,
      },
    });
    if (!order) return null;

    const expectedAmount = Number(order.totalAmount.mul(100).toFixed(0));
    const matchesOrder =
      order.paymentMethod === "STRIPE_TEST" &&
      checkoutSession.livemode === false &&
      checkoutSession.client_reference_id === order.id &&
      checkoutSession.metadata?.orderId === order.id &&
      checkoutSession.metadata?.userId === order.userId &&
      checkoutSession.currency?.toLowerCase() === "ron" &&
      checkoutSession.amount_total === expectedAmount;

    if (!matchesOrder) {
      throw new StripeOrderMismatchError(
        `Sesiunea Stripe ${checkoutSession.id} nu corespunde comenzii ${order.id}.`,
      );
    }

    if (checkoutSession.payment_status !== "paid") {
      return { orderId: order.id, paymentStatus: order.paymentStatus };
    }
    if (order.paymentStatus === "PAID") {
      return { orderId: order.id, paymentStatus: order.paymentStatus };
    }
    if (order.paymentStatus !== "PENDING") {
      throw new StripeOrderMismatchError(
        `Comanda ${order.id} este ${order.paymentStatus}, dar Stripe o raportează plătită.`,
      );
    }

    const confirmation = await tx.order.updateMany({
      where: {
        id: order.id,
        paymentMethod: "STRIPE_TEST",
        paymentStatus: "PENDING",
      },
      data: {
        paymentStatus: "PAID",
        status: "CONFIRMED",
        stripePaymentIntentId: paymentIntentId(checkoutSession),
        paidAt: new Date(),
      },
    });

    if (confirmation.count !== 1) {
      const current = await tx.order.findUnique({
        where: { id: order.id },
        select: { paymentStatus: true },
      });
      return current
        ? { orderId: order.id, paymentStatus: current.paymentStatus }
        : null;
    }

    return { orderId: order.id, paymentStatus: "PAID" as const };
  });
}

/** Recuperează starea reală de la Stripe înainte de reconcilierea locală. */
export async function retrieveAndReconcileStripeOrder(
  stripeCheckoutSessionId: string,
) {
  const checkoutSession = await getStripe().checkout.sessions.retrieve(
    stripeCheckoutSessionId,
  );
  const order = await reconcileStripeCheckoutSession(checkoutSession);
  return { checkoutSession, order };
}

/**
 * Anulează idempotent o plată nefinalizată, restaurează stocul rezervat și,
 * opțional, reface coșul utilizatorului.
 */
export async function cancelPendingStripeOrder(
  orderId: string,
  paymentStatus: Extract<PaymentStatus, "FAILED" | "CANCELLED">,
  restoreCart: boolean,
  stripeCheckoutSessionId?: string | null,
) {
  return runSerializableTransaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: {
        id: orderId,
        paymentMethod: "STRIPE_TEST",
        ...(stripeCheckoutSessionId !== undefined
          ? { stripeCheckoutSessionId }
          : {}),
      },
      include: { items: { select: { productId: true, quantity: true } } },
    });
    if (
      !order ||
      order.paymentStatus !== "PENDING" ||
      order.status !== "PENDING"
    ) {
      return false;
    }

    const claim = await tx.order.updateMany({
      where: {
        id: order.id,
        paymentMethod: "STRIPE_TEST",
        paymentStatus: "PENDING",
        status: "PENDING",
      },
      data: { paymentStatus, status: "CANCELLED" },
    });
    if (claim.count !== 1) return false;

    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }

    if (restoreCart) {
      const cart = await tx.cart.upsert({
        where: { userId: order.userId },
        update: {},
        create: { userId: order.userId },
      });
      for (const item of order.items) {
        await tx.cartItem.upsert({
          where: {
            cartId_productId: { cartId: cart.id, productId: item.productId },
          },
          update: { quantity: { increment: item.quantity } },
          create: {
            cartId: cart.id,
            productId: item.productId,
            quantity: item.quantity,
          },
        });
      }
    }

    return true;
  });
}

/**
 * Închide mai întâi sesiunea Stripe și anulează local numai dacă plata nu a
 * fost finalizată între timp. Rezultatul reflectă mereu starea locală finală.
 */
export async function cancelStripeCheckoutOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      paymentMethod: true,
      paymentStatus: true,
      stripeCheckoutSessionId: true,
    },
  });
  if (!order || order.paymentMethod !== "STRIPE_TEST") return null;
  if (order.paymentStatus !== "PENDING") return order.paymentStatus;

  if (order.stripeCheckoutSessionId) {
    const { checkoutSession, order: reconciledOrder } =
      await retrieveAndReconcileStripeOrder(order.stripeCheckoutSessionId);

    if (reconciledOrder?.paymentStatus === "PAID") return "PAID" as const;
    if (checkoutSession.status === "open") {
      await getStripe().checkout.sessions.expire(order.stripeCheckoutSessionId);
    } else if (checkoutSession.status === "complete") {
      // O sesiune completă, dar încă neplătită, poate fi în procesare.
      return "PENDING" as const;
    }
  }

  await cancelPendingStripeOrder(
    order.id,
    "CANCELLED",
    true,
    order.stripeCheckoutSessionId,
  );
  const current = await prisma.order.findUnique({
    where: { id: order.id },
    select: { paymentStatus: true },
  });
  return current?.paymentStatus ?? null;
}
