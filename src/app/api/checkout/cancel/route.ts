import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cancelStripeCheckoutOrder } from "@/lib/order-payment";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautentificat." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId: session.user.id,
      paymentMethod: "STRIPE_TEST",
    },
    select: { id: true, paymentStatus: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Comandă inexistentă." }, { status: 404 });
  }
  if (order.paymentStatus !== "PENDING") {
    return NextResponse.json({ success: true, status: order.paymentStatus });
  }

  try {
    const paymentStatus = await cancelStripeCheckoutOrder(order.id);
    if (paymentStatus === "PAID") {
      return NextResponse.json(
        { error: "Plata a fost deja confirmată.", status: paymentStatus },
        { status: 409 },
      );
    }
    if (paymentStatus === "PENDING") {
      return NextResponse.json(
        { error: "Plata este încă în procesare și nu poate fi anulată.", status: paymentStatus },
        { status: 409 },
      );
    }
    if (paymentStatus !== "CANCELLED") {
      return NextResponse.json(
        { error: "Plata nu a putut fi anulată." },
        { status: 409 },
      );
    }
    return NextResponse.json({ success: true, status: paymentStatus });
  } catch (error) {
    console.error("[checkout-cancel] sesiunea Stripe nu a putut fi închisă", error);
    return NextResponse.json({ error: "Plata nu a putut fi anulată." }, { status: 502 });
  }
}
