import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: { id: string } };

// DELETE /api/configurations/[id] — șterge configurația dacă aparține utilizatorului
export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  }

  const config = await prisma.configuration.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true },
  });

  if (!config) {
    return NextResponse.json({ error: "Configurație inexistentă" }, { status: 404 });
  }

  if (config.userId !== session.user.id) {
    return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
  }

  await prisma.configuration.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
