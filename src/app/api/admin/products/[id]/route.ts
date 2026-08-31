import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: { id: string } };

/**
 * PATCH /api/admin/products/[id]
 *
 * Actualizare rapidă a unui produs de către administratori.
 * Câmpuri acceptate: price, stock și isActive.
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
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload invalid." }, { status: 400 });
  }

  const { price, stock, isActive } = body;
  const updateData: Prisma.ProductUncheckedUpdateInput = {};

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

  if (isActive !== undefined) {
    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "Statusul produsului trebuie să fie boolean." },
        { status: 400 },
      );
    }
    updateData.isActive = isActive;
  }

  const requiredTextFields = ["name", "brand", "description"] as const;
  for (const field of requiredTextFields) {
    if (body[field] !== undefined) {
      if (typeof body[field] !== "string" || !body[field].trim()) {
        return NextResponse.json(
          { error: `Câmpul ${field} nu poate fi gol.` },
          { status: 400 },
        );
      }
      updateData[field] = body[field].trim();
    }
  }

  for (const field of ["shortDescription", "imageUrl"] as const) {
    if (body[field] !== undefined) {
      if (body[field] !== null && typeof body[field] !== "string") {
        return NextResponse.json({ error: `Câmp invalid: ${field}.` }, { status: 400 });
      }
      updateData[field] =
        typeof body[field] === "string" ? body[field].trim() || null : null;
    }
  }

  let categoryType: Prisma.ProductUncheckedUpdateInput["categoryType"];
  if (body.categoryId !== undefined) {
    if (typeof body.categoryId !== "string") {
      return NextResponse.json({ error: "Categoria este invalidă." }, { status: 400 });
    }
    const category = await prisma.category.findUnique({
      where: { id: body.categoryId },
      select: { id: true, type: true },
    });
    if (!category) {
      return NextResponse.json({ error: "Categoria este invalidă." }, { status: 400 });
    }
    updateData.categoryId = category.id;
    updateData.categoryType = category.type;
    categoryType = category.type;
  }

  let specificationObject: Record<string, unknown> | undefined;
  if (body.specifications !== undefined) {
    if (
      body.specifications === null ||
      typeof body.specifications !== "object" ||
      Array.isArray(body.specifications)
    ) {
      return NextResponse.json(
        { error: "Specificațiile trebuie să fie un obiect JSON." },
        { status: 400 },
      );
    }
    specificationObject = body.specifications as Record<string, unknown>;
    updateData.specifications = specificationObject as Prisma.InputJsonValue;
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
  const optionalText = (key: string) => {
    const value = specificationObject?.[key];
    return typeof value === "string" && value.trim() ? value.trim() : null;
  };
  const optionalInteger = (key: string) => {
    const value = Number(specificationObject?.[key]);
    return Number.isInteger(value) && value >= 0 ? value : null;
  };

  const updated = await prisma.$transaction(async (tx) => {
    const product = await tx.product.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
        isActive: true,
        categoryType: true,
      },
    });

    if (specificationObject || categoryType) {
      const componentData = {
        type: product.categoryType,
        ...(specificationObject
          ? {
              socket: optionalText("socket"),
              ramType: optionalText("ramType"),
              formFactor: optionalText("formFactor"),
              interfaceType: optionalText("interfaceType"),
              tdpWatts: optionalInteger("tdpWatts"),
              powerWatts: optionalInteger("powerWatts"),
              lengthMm: optionalInteger("lengthMm"),
              heightMm: optionalInteger("heightMm"),
              widthMm: optionalInteger("widthMm"),
              metadata: specificationObject as Prisma.InputJsonValue,
            }
          : {}),
      };
      await tx.component.upsert({
        where: { productId: product.id },
        create: { productId: product.id, ...componentData },
        update: componentData,
      });
    }

    return product;
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    price: Number(updated.price),
    stock: updated.stock,
    isActive: updated.isActive,
  });
}
