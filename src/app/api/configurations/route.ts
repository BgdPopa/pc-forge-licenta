import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { evaluateConfiguration } from "@/lib/configuration-evaluation";
import type { ComponentData, CompatibilityConstraint } from "@/lib/csp/types";

function toComponentData(component: {
  socket: string | null;
  ramType: string | null;
  formFactor: string | null;
  interfaceType: string | null;
  tdpWatts: number | null;
  powerWatts: number | null;
  lengthMm: number | null;
  heightMm: number | null;
  widthMm: number | null;
  metadata: unknown;
} | null): ComponentData | null {
  if (!component) return null;
  return {
    ...component,
    metadata:
      component.metadata &&
      typeof component.metadata === "object" &&
      !Array.isArray(component.metadata)
        ? (component.metadata as Record<string, unknown>)
        : null,
  };
}

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
    items?: Array<{ productId?: string }>;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload invalid" }, { status: 400 });
  }

  const { name, items } = body;

  if (
    typeof name !== "string" ||
    !name.trim() ||
    !Array.isArray(items) ||
    items.length < 2 ||
    items.some((item) => !item || typeof item.productId !== "string")
  ) {
    return NextResponse.json(
      { error: "Sunt necesare un nume și cel puțin 2 componente" },
      { status: 400 },
    );
  }

  const productIds = items.map((item) => item.productId as string);
  if (new Set(productIds).size !== productIds.length) {
    return NextResponse.json(
      { error: "Același produs nu poate fi selectat de mai multe ori" },
      { status: 422 },
    );
  }

  const foundProducts = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
    include: { component: true },
  });

  if (foundProducts.length !== productIds.length) {
    return NextResponse.json(
      { error: "Unul sau mai multe produse nu există" },
      { status: 422 },
    );
  }

  const categories = foundProducts.map((product) => product.categoryType);
  if (new Set(categories).size !== categories.length) {
    return NextResponse.json(
      { error: "Poți selecta un singur produs din fiecare categorie" },
      { status: 422 },
    );
  }

  const dbRules = await prisma.compatibilityRule.findMany({
    where: { isActive: true },
  });
  const constraints: CompatibilityConstraint[] = dbRules.map((rule) => ({
    id: rule.id,
    name: rule.name,
    description: rule.description,
    sourceType: rule.sourceType,
    targetType: rule.targetType,
    sourceField: rule.sourceField,
    targetField: rule.targetField,
    operator: rule.operator,
  }));
  const evaluation = evaluateConfiguration(
    foundProducts.map((product) => ({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      categoryType: product.categoryType,
      component: toComponentData(product.component),
    })),
    constraints,
  );

  const configuration = await prisma.configuration.create({
    data: {
      name: name.trim(),
      userId: session.user.id,
      totalPrice: evaluation.totalPrice,
      totalPower: evaluation.totalPower,
      isValid: evaluation.isValid,
      items: {
        create: foundProducts.map((product) => ({
          productId: product.id,
          categoryType: product.categoryType,
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
