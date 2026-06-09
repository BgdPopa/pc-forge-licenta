import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: { id: string } };

/**
 * PATCH /api/admin/products/[id]
 *
 * Editare minimă a unui produs de către administratori.
 * Câmpuri acceptate: price (number > 0) și/sau stock (integer >= 0).
 * Necesită rol ADMIN — altfel returnează 403.
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  // ── Verificare autentificare și rol ADMIN ────────────────────────────────────
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautentificat." }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acces interzis." }, { status: 403 });
  }

  // ── Parsare body ─────────────────────────────────────────────────────────────
  let body: { price?: unknown; stock?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload invalid." }, { status: 400 });
  }

  const { price, stock } = body;
  const updateData: { price?: number; stock?: number } = {};

  if (price !== undefined) {
    const priceNum = Number(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      return NextResponse.json(
        { error: "Prețul trebuie să fie un număr pozitiv." },
        { status: 400 },
      );
    }
    updateData.price = priceNum;
  }

  if (stock !== undefined) {
    const stockNum = Number(stock);
    if (isNaN(stockNum) || stockNum < 0 || !Number.isInteger(stockNum)) {
      return NextResponse.json(
        { error: "Stocul trebuie să fie un număr întreg pozitiv sau zero." },
        { status: 400 },
      );
    }
    updateData.stock = stockNum;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: "Niciun câmp valid de actualizat." },
      { status: 400 },
    );
  }

  // ── Verificare existență produs ─────────────────────────────────────────────
  const existing = await prisma.product.findUnique({
    where: { id: params.id },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Produs inexistent." }, { status: 404 });
  }

  // ── Actualizare ──────────────────────────────────────────────────────────────
  const updated = await prisma.product.update({
    where: { id: params.id },
    data: updateData,
    select: {
      id: true,
      name: true,
      price: true,
      stock: true,
    },
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    price: Number(updated.price),
    stock: updated.stock,
  });
}
