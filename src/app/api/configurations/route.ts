import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type { ProductCategory } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/configurations — returnează configurațiile utilizatorului autentificat
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  }

  const configurations = await prisma.configuration.findMany({
    where: { userId: session.user.id },
    include: {
      items: {
        include: { product: { select: { id: true, name: true, price: true, categoryType: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Serializare Decimal → number pentru răspuns JSON
  const serialized = configurations.map((c) => ({
    id: c.id,
    name: c.name,
    totalPrice: c.totalPrice ? Number(c.totalPrice) : null,
    totalPower: c.totalPower,
    isValid: c.isValid,
    createdAt: c.createdAt.toISOString(),
    itemCount: c.items.length,
    items: c.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      categoryType: item.categoryType,
      productName: item.product.name,
      productPrice: Number(item.product.price),
    })),
  }));

  return NextResponse.json(serialized);
}

// POST /api/configurations — salvează o configurație nouă
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  }

  let body: {
    name?: string;
    items?: Array<{ productId: string; categoryType: string }>;
    totalPrice?: number | null;
    totalPower?: number | null;
    isValid?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload invalid" }, { status: 400 });
  }

  const { name, items, totalPrice, totalPower, isValid } = body;

  if (!name || !items || items.length < 2) {
    return NextResponse.json(
      { error: "Sunt necesare un nume și cel puțin 2 componente" },
      { status: 400 },
    );
  }

  // Verificăm că produsele există și aparțin categoriilor corecte
  const productIds = items.map((i) => i.productId);
  const foundProducts = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
    select: { id: true, categoryType: true },
  });

  if (foundProducts.length !== productIds.length) {
    return NextResponse.json(
      { error: "Unul sau mai multe produse nu există" },
      { status: 422 },
    );
  }

  const configuration = await prisma.configuration.create({
    data: {
      name: name.trim(),
      userId: session.user.id,
      totalPrice: totalPrice ?? null,
      totalPower: totalPower ? Math.round(totalPower) : null,
      isValid: isValid ?? false,
      items: {
        create: items.map((item) => ({
          productId: item.productId,
          categoryType: item.categoryType as ProductCategory,
        })),
      },
    },
    include: { items: true },
  });

  return NextResponse.json(
    {
      id: configuration.id,
      name: configuration.name,
      createdAt: configuration.createdAt.toISOString(),
    },
    { status: 201 },
  );
}
