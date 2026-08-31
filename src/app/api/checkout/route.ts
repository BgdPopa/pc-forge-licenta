import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getApplicationUrl, getStripe } from "@/lib/stripe";
import {
  cancelPendingStripeOrder,
  runSerializableTransaction,
} from "@/lib/order-payment";

class StockUnavailableError extends Error {}
class CartEmptyError extends Error {}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautentificat." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload invalid." }, { status: 400 });
  }

  const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
  const customerEmail = typeof body.customerEmail === "string" ? body.customerEmail.trim() : "";
  const shippingAddress = typeof body.shippingAddress === "string" ? body.shippingAddress.trim() : "";

  if (customerName.length < 2 || !/^\S+@\S+\.\S+$/.test(customerEmail) || shippingAddress.length < 8) {
    return NextResponse.json(
      { error: "Completează corect numele, emailul și adresa de livrare." },
      { status: 400 },
    );
  }

  let stripe: ReturnType<typeof getStripe>;
  try {
    stripe = getStripe();
  } catch {
    return NextResponse.json(
      { error: "Stripe Test Mode nu este configurat încă." },
      { status: 503 },
    );
  }

  let reservation: {
    orderId: string;
    lineItems: Array<{
      name: string;
      description: string;
      quantity: number;
      unitAmount: number;
    }>;
  };
  try {
    reservation = await runSerializableTransaction(async (tx) => {
      const cartRecord = await tx.cart.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (!cartRecord) throw new CartEmptyError();

      // Blocarea rândului coșului serializează două clickuri/cereri simultane.
      await tx.$queryRaw`
        SELECT "id" FROM "carts"
        WHERE "id" = ${cartRecord.id}
        FOR UPDATE
      `;

      const cart = await tx.cart.findUnique({
        where: { id: cartRecord.id },
        include: { items: { include: { product: true } } },
      });
      if (!cart || cart.items.length === 0) throw new CartEmptyError();

      const items = cart.items;
      let totalAmount = new Prisma.Decimal(0);
      for (const item of items) {
        totalAmount = totalAmount.add(item.product.price.mul(item.quantity));
      }

      const order = await tx.order.create({
        data: {
          userId: session.user.id,
          status: "PENDING",
          paymentMethod: "STRIPE_TEST",
          paymentStatus: "PENDING",
          totalAmount,
          customerName,
          customerEmail,
          shippingAddress,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              productName: item.product.name,
              quantity: item.quantity,
              unitPrice: item.product.price,
              totalPrice: item.product.price.mul(item.quantity),
            })),
          },
        },
      });

      for (const item of items) {
        const reserved = await tx.product.updateMany({
          where: { id: item.productId, isActive: true, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (reserved.count !== 1) throw new StockUnavailableError(item.product.name);
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return {
        orderId: order.id,
        lineItems: items.map((item) => ({
          name: item.product.name,
          description: item.product.shortDescription ?? item.product.brand,
          quantity: item.quantity,
          unitAmount: Number(item.product.price.mul(100).toFixed(0)),
        })),
      };
    });
  } catch (error) {
    if (error instanceof CartEmptyError) {
      return NextResponse.json(
        { error: "Coșul este gol sau checkout-ul a fost deja inițiat." },
        { status: 409 },
      );
    }
    if (error instanceof StockUnavailableError) {
      return NextResponse.json(
        { error: `Stocul pentru „${error.message}” s-a modificat. Reîncarcă coșul.` },
        { status: 409 },
      );
    }
    console.error("[checkout] rezervarea comenzii a eșuat", error);
    return NextResponse.json({ error: "Comanda nu a putut fi rezervată." }, { status: 500 });
  }

  let createdStripeSessionId: string | null = null;
  try {
    const stripeSession = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        payment_method_types: ["card"],
        customer_email: customerEmail,
        client_reference_id: reservation.orderId,
        metadata: { orderId: reservation.orderId, userId: session.user.id },
        line_items: reservation.lineItems.map((item) => ({
          quantity: item.quantity,
          price_data: {
            currency: "ron",
            unit_amount: item.unitAmount,
            product_data: {
              name: item.name,
              description: item.description,
            },
          },
        })),
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
        success_url: `${getApplicationUrl()}/checkout/success?orderId=${reservation.orderId}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${getApplicationUrl()}/checkout/cancel?orderId=${reservation.orderId}`,
      },
      { idempotencyKey: `pcforge-checkout-${reservation.orderId}` },
    );
    createdStripeSessionId = stripeSession.id;

    if (!stripeSession.url) throw new Error("STRIPE_CHECKOUT_URL_MISSING");

    const linkedOrder = await prisma.order.updateMany({
      where: {
        id: reservation.orderId,
        status: "PENDING",
        paymentStatus: "PENDING",
        stripeCheckoutSessionId: null,
      },
      data: { stripeCheckoutSessionId: stripeSession.id },
    });
    if (linkedOrder.count !== 1) throw new Error("ORDER_NOT_PENDING");
    return NextResponse.json({ checkoutUrl: stripeSession.url }, { status: 201 });
  } catch (error) {
    console.error("[checkout] sesiunea Stripe nu a putut fi creată", error);
    if (createdStripeSessionId) {
      try {
        await stripe.checkout.sessions.expire(createdStripeSessionId);
      } catch (expireError) {
        console.error("[checkout] sesiunea Stripe orfană nu a putut fi închisă", expireError);
      }
    }
    await cancelPendingStripeOrder(reservation.orderId, "FAILED", true);
    return NextResponse.json(
      { error: "Sesiunea Stripe nu a putut fi creată. Coșul a fost restaurat." },
      { status: 502 },
    );
  }
}
