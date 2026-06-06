import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: { itemId: string } };

export async function PATCH(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautentificat." }, { status: 401 });
  }

  const body = await request.json();
  const { quantity } = body;

  if (typeof quantity !== "number" || quantity < 1) {
    return NextResponse.json({ error: "Cantitate invalidă." }, { status: 400 });
  }

  const item = await prisma.cartItem.findUnique({
    where: { id: params.itemId },
    include: { cart: true, product: true },
  });

  // Verificare ownership: un utilizator nu poate modifica coșul altuia.
  if (!item || item.cart.userId !== session.user.id) {
    return NextResponse.json({ error: "Element negăsit." }, { status: 404 });
  }

  // Noua cantitate nu trebuie să depășească stocul real al produsului.
  if (quantity > item.product.stock) {
    return NextResponse.json(
      { error: `Stoc insuficient. Disponibil: ${item.product.stock} buc.` },
      { status: 400 },
    );
  }

  await prisma.cartItem.update({
    where: { id: params.itemId },
    data: { quantity },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautentificat." }, { status: 401 });
  }

  const item = await prisma.cartItem.findUnique({
    where: { id: params.itemId },
    include: { cart: true },
  });

  if (!item || item.cart.userId !== session.user.id) {
    return NextResponse.json({ error: "Element negăsit." }, { status: 404 });
  }

  await prisma.cartItem.delete({ where: { id: params.itemId } });

  return NextResponse.json({ success: true });
}
