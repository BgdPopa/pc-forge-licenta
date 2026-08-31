import { NextResponse } from "next/server";
import { ProductCategory, Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function createSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** POST /api/admin/products — adaugă un produs nou în catalog. */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautentificat." }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acces interzis." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload invalid." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const brand = typeof body.brand === "string" ? body.brand.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  const shortDescription =
    typeof body.shortDescription === "string"
      ? body.shortDescription.trim() || null
      : null;
  const imageUrl =
    typeof body.imageUrl === "string" ? body.imageUrl.trim() || null : null;
  const categoryId =
    typeof body.categoryId === "string" ? body.categoryId : "";
  const price = Number(body.price);
  const stock = Number(body.stock);

  if (name.length < 2 || name.length > 160) {
    return NextResponse.json(
      { error: "Numele trebuie să aibă între 2 și 160 de caractere." },
      { status: 400 },
    );
  }
  if (!brand || brand.length > 80 || !description) {
    return NextResponse.json(
      { error: "Brandul și descrierea sunt obligatorii." },
      { status: 400 },
    );
  }
  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json(
      { error: "Prețul trebuie să fie un număr pozitiv." },
      { status: 400 },
    );
  }
  if (!Number.isInteger(stock) || stock < 0) {
    return NextResponse.json(
      { error: "Stocul trebuie să fie un număr întreg pozitiv sau zero." },
      { status: 400 },
    );
  }

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, type: true },
  });
  if (!category) {
    return NextResponse.json({ error: "Categoria este invalidă." }, { status: 400 });
  }

  let specifications: Prisma.InputJsonValue | undefined;
  let specificationObject: Record<string, unknown> = {};
  if (body.specifications !== undefined && body.specifications !== null) {
    if (
      typeof body.specifications !== "object" ||
      Array.isArray(body.specifications)
    ) {
      return NextResponse.json(
        { error: "Specificațiile trebuie să fie un obiect JSON." },
        { status: 400 },
      );
    }
    specificationObject = body.specifications as Record<string, unknown>;
    specifications = specificationObject as Prisma.InputJsonValue;
  }

  const slugBase = createSlug(name);
  if (!slugBase) {
    return NextResponse.json({ error: "Numele nu poate genera un slug valid." }, { status: 400 });
  }

  let slug = slugBase;
  let suffix = 2;
  while (await prisma.product.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${slugBase}-${suffix}`;
    suffix += 1;
  }

  const optionalText = (key: string) => {
    const value = specificationObject[key];
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  };
  const optionalInteger = (key: string) => {
    const value = Number(specificationObject[key]);
    return Number.isInteger(value) && value >= 0 ? value : undefined;
  };

  const product = await prisma.product.create({
    data: {
      name,
      slug,
      brand,
      description,
      shortDescription,
      imageUrl,
      price,
      stock,
      categoryId: category.id,
      categoryType: category.type as ProductCategory,
      specifications,
      component: {
        create: {
          type: category.type as ProductCategory,
          socket: optionalText("socket"),
          ramType: optionalText("ramType"),
          formFactor: optionalText("formFactor"),
          interfaceType: optionalText("interfaceType"),
          tdpWatts: optionalInteger("tdpWatts"),
          powerWatts: optionalInteger("powerWatts"),
          lengthMm: optionalInteger("lengthMm"),
          heightMm: optionalInteger("heightMm"),
          widthMm: optionalInteger("widthMm"),
          metadata: specifications,
        },
      },
    },
    include: { category: { select: { name: true } } },
  });

  return NextResponse.json(
    {
      id: product.id,
      name: product.name,
      brand: product.brand,
      slug: product.slug,
      categoryName: product.category.name,
      categoryType: product.categoryType,
      price: Number(product.price),
      stock: product.stock,
      isActive: product.isActive,
    },
    { status: 201 },
  );
}
