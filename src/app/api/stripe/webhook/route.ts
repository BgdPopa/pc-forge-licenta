import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import {
  cancelPendingStripeOrder,
  retrieveAndReconcileStripeOrder,
} from "@/lib/order-payment";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret || !webhookSecret.startsWith("whsec_")) {
    return NextResponse.json({ error: "Webhook neconfigurat." }, { status: 503 });
  }

  let stripe: ReturnType<typeof getStripe>;
  try {
    stripe = getStripe();
  } catch {
    return NextResponse.json({ error: "Stripe Test Mode neconfigurat." }, { status: 503 });
  }

  let event: Stripe.Event;
  try {
    const payload = await request.text();
    if (Buffer.byteLength(payload, "utf8") > 1024 * 1024) {
      return NextResponse.json({ error: "Payload prea mare." }, { status: 413 });
    }
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error("[stripe-webhook] semnătură invalidă", error);
    return NextResponse.json({ error: "Semnătură invalidă." }, { status: 400 });
  }

  const handledEvents = new Set([
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
    "checkout.session.expired",
    "checkout.session.async_payment_failed",
  ]);
  if (!handledEvents.has(event.type)) {
    return NextResponse.json({ received: true });
  }

  const checkoutSession = event.data.object as Stripe.Checkout.Session;
  if (checkoutSession.livemode) {
    return NextResponse.json(
      { error: "Evenimentele Stripe Live nu sunt acceptate." },
      { status: 400 },
    );
  }

  try {
    if (
      (event.type === "checkout.session.completed" ||
        event.type === "checkout.session.async_payment_succeeded") &&
      checkoutSession.payment_status === "paid"
    ) {
      await retrieveAndReconcileStripeOrder(checkoutSession.id);
    }

    if (
      (event.type === "checkout.session.expired" ||
        event.type === "checkout.session.async_payment_failed")
    ) {
      const order = await prisma.order.findUnique({
        where: { stripeCheckoutSessionId: checkoutSession.id },
        select: { id: true },
      });
      if (order) {
        await cancelPendingStripeOrder(
          order.id,
          event.type === "checkout.session.expired" ? "CANCELLED" : "FAILED",
          true,
          checkoutSession.id,
        );
      }
    }
  } catch (error) {
    console.error(`[stripe-webhook] procesarea ${event.id} a eșuat`, error);
    return NextResponse.json({ error: "Procesarea webhookului a eșuat." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
