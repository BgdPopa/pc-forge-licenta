import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: { id: string } };

/** PATCH /api/admin/rules/[id] — activează sau dezactivează o regulă CSP. */
export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautentificat." }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acces interzis." }, { status: 403 });
  }

  let body: { isActive?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload invalid." }, { status: 400 });
  }
  if (typeof body.isActive !== "boolean") {
    return NextResponse.json({ error: "Status invalid." }, { status: 400 });
  }

  const existing = await prisma.compatibilityRule.findUnique({
    where: { id: params.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Regulă inexistentă." }, { status: 404 });
  }

  const updated = await prisma.compatibilityRule.update({
    where: { id: params.id },
    data: { isActive: body.isActive },
    select: { id: true, isActive: true },
  });
  return NextResponse.json(updated);
}
