import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautentificat." }, { status: 401 });
  }

  const cart = await prisma.cart.findUnique({
    where: { userId: session.user.id },
    include: {
      items: {
        include: { product: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!cart) {
    return NextResponse.json({ items: [], total: 0 });
  }

  const items = cart.items.map((item) => ({
    id: item.id,
    productId: item.productId,
    name: item.product.name,
    brand: item.product.brand,
    slug: item.product.slug,
    price: Number(item.product.price),
    quantity: item.quantity,
    stock: item.product.stock,
    subtotal: Number(item.product.price) * item.quantity,
    inStock: item.product.stock > 0,
  }));

  const total = items.reduce((sum, item) => sum + item.subtotal, 0);

  return NextResponse.json({ items, total });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautentificat." }, { status: 401 });
  }

  const body = await request.json();
  const { productId, quantity = 1 } = body;

  if (!productId || typeof quantity !== "number" || quantity < 1) {
    return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId, isActive: true },
  });

  if (!product || product.stock === 0) {
    return NextResponse.json(
      { error: "Produsul nu este disponibil." },
      { status: 400 },
    );
  }

  const cart = await prisma.cart.upsert({
    where: { userId: session.user.id },
    update: {},
    create: { userId: session.user.id },
  });

  const existingItem = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId } },
  });

  // Cantitatea totală rezultată nu trebuie să depășească stocul disponibil.
  const currentQuantity = existingItem?.quantity ?? 0;
  const newQuantity = currentQuantity + quantity;

  if (newQuantity > product.stock) {
    return NextResponse.json(
      {
        error: `Stoc insuficient. Disponibil: ${product.stock} buc., în coș: ${currentQuantity} buc.`,
      },
      { status: 400 },
    );
  }

  if (existingItem) {
    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: newQuantity },
    });
  } else {
    await prisma.cartItem.create({
      data: { cartId: cart.id, productId, quantity },
    });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
