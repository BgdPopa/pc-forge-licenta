import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautorizat." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Utilizatorul nu există." }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautorizat." }, { status: 401 });
  }

  const body = await req.json();
  const { name, email, currentPassword, newPassword } = body as {
    name?: string;
    email?: string;
    currentPassword?: string;
    newPassword?: string;
  };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: "Utilizatorul nu există." }, { status: 404 });
  }

  const updateData: { name?: string; email?: string; passwordHash?: string } = {};

  if (name !== undefined) {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      return NextResponse.json({ error: "Numele trebuie să aibă cel puțin 2 caractere." }, { status: 400 });
    }
    updateData.name = trimmed;
  }

  if (email !== undefined) {
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return NextResponse.json({ error: "Adresa de email nu este validă." }, { status: 400 });
    }
    if (trimmed !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email: trimmed } });
      if (existing) {
        return NextResponse.json({ error: "Adresa de email este deja folosită." }, { status: 400 });
      }
    }
    updateData.email = trimmed;
  }

  if (newPassword !== undefined) {
    if (!currentPassword) {
      return NextResponse.json({ error: "Parola curentă este necesară pentru schimbare." }, { status: 400 });
    }
    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) {
      return NextResponse.json({ error: "Parola curentă este incorectă." }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Parola nouă trebuie să aibă cel puțin 8 caractere." }, { status: 400 });
    }
    updateData.passwordHash = await bcrypt.hash(newPassword, 10);
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Nicio modificare de salvat." }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true },
  });

  return NextResponse.json(updated);
}
