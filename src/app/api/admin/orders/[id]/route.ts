import { NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cancelStripeCheckoutOrder } from "@/lib/order-payment";

type RouteContext = { params: { id: string } };

/** PATCH /api/admin/orders/[id] — actualizează controlat statusul comenzii. */
export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautentificat." }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acces interzis." }, { status: 403 });
  }

  let body: { status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload invalid." }, { status: 400 });
  }

  if (
    typeof body.status !== "string" ||
    !Object.values(OrderStatus).includes(body.status as OrderStatus)
  ) {
    return NextResponse.json({ error: "Status invalid." }, { status: 400 });
  }
  const nextStatus = body.status as OrderStatus;

  const existing = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: { select: { productId: true, quantity: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Comanda nu există." }, { status: 404 });
  }
  if (existing.status === nextStatus) {
    return NextResponse.json({
      id: existing.id,
      status: existing.status,
      paymentStatus: existing.paymentStatus,
    });
  }
  if (existing.status === "CANCELLED") {
    return NextResponse.json(
      { error: "O comandă anulată nu poate fi redeschisă." },
      { status: 409 },
    );
  }

  if (existing.paymentMethod === "STRIPE_TEST") {
    if (existing.paymentStatus === "PAID") {
      return NextResponse.json(
        { error: "O comandă Stripe plătită necesită un flux separat de rambursare." },
        { status: 409 },
      );
    }
    if (nextStatus !== "CANCELLED") {
      return NextResponse.json(
        { error: "Comenzile Stripe sunt confirmate exclusiv prin webhook." },
        { status: 409 },
      );
    }

    try {
      const paymentStatus = await cancelStripeCheckoutOrder(existing.id);
      if (paymentStatus === "PAID") {
        return NextResponse.json(
          { error: "Plata a fost confirmată între timp și nu poate fi anulată fără rambursare." },
          { status: 409 },
        );
      }
      if (paymentStatus === "PENDING") {
        return NextResponse.json(
          { error: "Plata este în procesare și nu poate fi anulată momentan." },
          { status: 409 },
        );
      }
      if (paymentStatus !== "CANCELLED") {
        return NextResponse.json(
          { error: "Comanda Stripe nu a putut fi anulată." },
          { status: 409 },
        );
      }
      return NextResponse.json({
        id: existing.id,
        status: "CANCELLED",
        paymentStatus,
      });
    } catch (error) {
      console.error("[admin-orders] anularea sesiunii Stripe a eșuat", error);
      return NextResponse.json(
        { error: "Sesiunea Stripe nu a putut fi anulată." },
        { status: 502 },
      );
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      // updateMany face tranziția condiționată atomică și împiedică două cereri
      // simultane de anulare să restaureze stocul de două ori.
      const transition = await tx.order.updateMany({
        where: { id: existing.id, status: { not: "CANCELLED" } },
        data: { status: nextStatus },
      });
      if (transition.count !== 1) {
        throw new Error("ORDER_STATUS_CHANGED");
      }

      if (nextStatus === "CANCELLED") {
        await tx.order.update({
          where: { id: existing.id },
          data: { paymentStatus: "CANCELLED" },
        });
        for (const item of existing.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_STATUS_CHANGED") {
      return NextResponse.json(
        { error: "Statusul comenzii a fost deja modificat. Reîncarcă pagina." },
        { status: 409 },
      );
    }
    throw error;
  }

  return NextResponse.json({
    id: existing.id,
    status: nextStatus,
    paymentStatus: nextStatus === "CANCELLED" ? "CANCELLED" : existing.paymentStatus,
  });
}
