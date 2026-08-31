import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  cancelPendingStripeOrder,
  retrieveAndReconcileStripeOrder,
} from "@/lib/order-payment";

type RouteContext = { params: { id: string } };

/** Redeschide în siguranță o sesiune Stripe Test încă activă. */
export async function POST(_request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautentificat." }, { status: 401 });
  }

  const order = await prisma.order.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: {
      id: true,
      paymentMethod: true,
      paymentStatus: true,
      stripeCheckoutSessionId: true,
    },
  });
  if (!order) {
    return NextResponse.json({ error: "Comandă inexistentă." }, { status: 404 });
  }
  if (order.paymentMethod !== "STRIPE_TEST") {
    return NextResponse.json(
      { error: "Comanda nu folosește Stripe Test Mode." },
      { status: 409 },
    );
  }
  if (order.paymentStatus === "PAID") {
    return NextResponse.json({ status: "PAID" });
  }
  if (order.paymentStatus !== "PENDING") {
    return NextResponse.json(
      { error: "Această plată nu mai poate fi reluată.", status: order.paymentStatus },
      { status: 409 },
    );
  }

  if (!order.stripeCheckoutSessionId) {
    await cancelPendingStripeOrder(order.id, "FAILED", true, null);
    return NextResponse.json(
      { error: "Sesiunea Stripe lipsește. Produsele au fost restaurate în coș." },
      { status: 409 },
    );
  }

  try {
    const { checkoutSession, order: reconciledOrder } =
      await retrieveAndReconcileStripeOrder(order.stripeCheckoutSessionId);

    if (reconciledOrder?.paymentStatus === "PAID") {
      return NextResponse.json({ status: "PAID" });
    }
    if (checkoutSession.status === "open" && checkoutSession.url) {
      return NextResponse.json({
        status: "PENDING",
        checkoutUrl: checkoutSession.url,
      });
    }
    if (checkoutSession.status === "expired") {
      await cancelPendingStripeOrder(
        order.id,
        "CANCELLED",
        true,
        order.stripeCheckoutSessionId,
      );
      return NextResponse.json(
        { error: "Sesiunea a expirat. Produsele au fost restaurate în coș." },
        { status: 410 },
      );
    }

    return NextResponse.json(
      { error: "Plata este încă în procesare. Verifică din nou în câteva momente." },
      { status: 409 },
    );
  } catch (error) {
    console.error("[order-checkout] sesiunea Stripe nu a putut fi recuperată", error);
    return NextResponse.json(
      { error: "Sesiunea Stripe nu a putut fi recuperată." },
      { status: 502 },
    );
  }
}
