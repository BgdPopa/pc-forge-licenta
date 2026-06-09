import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/cart/configuration
 *
 * Adaugă toate produsele dintr-o configurație salvată direct în coșul
 * utilizatorului autentificat, cu cantitate 1 per produs.
 *
 * Comportament:
 * - Produsele deja în coș: cantitatea crește cu 1 (dacă stocul permite)
 * - Produsele fără stoc sau inactive: sărite (skipped)
 * - Produsele al căror stoc ar fi depășit de noua cantitate: sărite
 * - Configurația trebuie să aparțină utilizatorului curent (403 altfel)
 */
export async function POST(request: Request) {
  // ── Autentificare ───────────────────────────────────────────────────────────
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautentificat." }, { status: 401 });
  }

  // ── Parsare body ────────────────────────────────────────────────────────────
  let body: { configurationId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload invalid." }, { status: 400 });
  }

  const { configurationId } = body;
  if (!configurationId || typeof configurationId !== "string") {
    return NextResponse.json(
      { error: "Câmpul configurationId este obligatoriu." },
      { status: 400 },
    );
  }

  // ── Verificare configurație ─────────────────────────────────────────────────
  const configuration = await prisma.configuration.findUnique({
    where: { id: configurationId },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              stock: true,
              isActive: true,
            },
          },
        },
      },
    },
  });

  if (!configuration) {
    return NextResponse.json(
      { error: "Configurația nu există." },
      { status: 404 },
    );
  }

  // Utilizatorul poate adăuga doar configurațiile proprii.
  if (configuration.userId !== session.user.id) {
    return NextResponse.json({ error: "Acces interzis." }, { status: 403 });
  }

  if (configuration.items.length === 0) {
    return NextResponse.json(
      { error: "Configurația este goală." },
      { status: 400 },
    );
  }

  // ── Asigurăm existența coșului ──────────────────────────────────────────────
  const cart = await prisma.cart.upsert({
    where: { userId: session.user.id },
    update: {},
    create: { userId: session.user.id },
  });

  // Preluăm toate CartItem-urile existente o singură dată (un singur query).
  const existingCartItems = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    select: { id: true, productId: true, quantity: true },
  });
  const existingByProductId = new Map(
    existingCartItems.map((i) => [i.productId, i]),
  );

  // ── Procesare produse ───────────────────────────────────────────────────────
  let addedCount = 0;
  let skippedCount = 0;
  const skippedReasons: string[] = [];

  for (const configItem of configuration.items) {
    const { product } = configItem;

    // Produs inactiv sau fără stoc → sărim
    if (!product.isActive || product.stock === 0) {
      skippedCount++;
      skippedReasons.push(`${product.name} (stoc epuizat)`);
      continue;
    }

    const existing = existingByProductId.get(product.id);
    const currentQty = existing?.quantity ?? 0;
    const newQty = currentQty + 1;

    // Stocul disponibil nu acoperă cantitatea suplimentară → sărim
    if (newQty > product.stock) {
      skippedCount++;
      skippedReasons.push(`${product.name} (stoc insuficient)`);
      continue;
    }

    // Upsert CartItem: crește cantitatea dacă există, creează dacă nu
    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQty },
      });
    } else {
      await prisma.cartItem.create({
        data: { cartId: cart.id, productId: product.id, quantity: 1 },
      });
    }

    addedCount++;
  }

  // ── Răspuns ─────────────────────────────────────────────────────────────────
  if (addedCount === 0) {
    return NextResponse.json(
      {
        success: false,
        addedCount: 0,
        skippedCount,
        message:
          "Niciun produs din această configurație nu este disponibil pentru adăugare în coș.",
      },
      { status: 400 },
    );
  }

  const message =
    skippedCount > 0
      ? `Configurația a fost adăugată parțial în coș. ${skippedCount} ${
          skippedCount === 1 ? "produs nu mai este disponibil" : "produse nu mai sunt disponibile"
        }.`
      : "Configurația a fost adăugată în coș.";

  return NextResponse.json({
    success: true,
    addedCount,
    skippedCount,
    message,
  });
}
