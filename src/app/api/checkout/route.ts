import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautentificat." }, { status: 401 });
  }

  const body = await request.json();
  const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
  const customerEmail = typeof body.customerEmail === "string" ? body.customerEmail.trim() : "";
  const shippingAddress = typeof body.shippingAddress === "string" ? body.shippingAddress.trim() : "";

  if (!customerName || !customerEmail || !shippingAddress) {
    return NextResponse.json(
      { error: "Toate câmpurile sunt obligatorii." },
      { status: 400 },
    );
  }

  const cart = await prisma.cart.findUnique({
    where: { userId: session.user.id },
    include: { items: { include: { product: true } } },
  });

  if (!cart || cart.items.length === 0) {
    return NextResponse.json({ error: "Coșul este gol." }, { status: 400 });
  }

  // Reverificarea stocului înainte de a plasa comanda (stocul se poate fi
  // modificat între adăugarea în coș și checkout).
  for (const item of cart.items) {
    if (!item.product.isActive) {
      return NextResponse.json(
        { error: `Produsul „${item.product.name}" nu mai este disponibil.` },
        { status: 400 },
      );
    }
    if (item.quantity > item.product.stock) {
      return NextResponse.json(
        {
          error: `Stoc insuficient pentru „${item.product.name}". Disponibil: ${item.product.stock} buc.`,
        },
        { status: 400 },
      );
    }
  }

  const userId = session.user.id;
  const cartId = cart.id;
  const items = cart.items;

  // Tranzacție: crearea comenzii, a liniilor de comandă, scăderea stocului și
  // golirea coșului se fac atomic. Dacă orice pas eșuează, nimic nu se aplică.
  const order = await prisma.$transaction(async (tx) => {
    let totalAmount = new Prisma.Decimal(0);
    for (const item of items) {
      totalAmount = totalAmount.add(
        item.product.price.mul(item.quantity),
      );
    }

    const createdOrder = await tx.order.create({
      data: {
        userId,
        status: "PENDING",
        totalAmount,
        customerName,
        customerEmail,
        shippingAddress,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            // Snapshot: valorile rămân corecte istoric chiar dacă produsul
            // este redenumit sau prețul se schimbă ulterior.
            productName: item.product.name,
            quantity: item.quantity,
            unitPrice: item.product.price,
            totalPrice: item.product.price.mul(item.quantity),
          })),
        },
      },
    });

    for (const item of items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    await tx.cartItem.deleteMany({ where: { cartId } });

    return createdOrder;
  });

  return NextResponse.json({ success: true, orderId: order.id }, { status: 201 });
}
