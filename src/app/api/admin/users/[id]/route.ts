import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: { id: string } };

/** PATCH /api/admin/users/[id] — schimbă rolul unui cont. */
export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautentificat." }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acces interzis." }, { status: 403 });
  }

  let body: { role?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload invalid." }, { status: 400 });
  }

  if (typeof body.role !== "string" || !Object.values(Role).includes(body.role as Role)) {
    return NextResponse.json({ error: "Rol invalid." }, { status: 400 });
  }
  const role = body.role as Role;

  if (params.id === session.user.id && role !== "ADMIN") {
    return NextResponse.json(
      { error: "Nu îți poți elimina propriul rol de administrator." },
      { status: 409 },
    );
  }

  const existing = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, role: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Utilizator inexistent." }, { status: 404 });
  }

  if (existing.role === "ADMIN" && role === "USER") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Trebuie să existe cel puțin un administrator." },
        { status: 409 },
      );
    }
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: { role },
    select: { id: true, role: true },
  });
  return NextResponse.json(updated);
}
