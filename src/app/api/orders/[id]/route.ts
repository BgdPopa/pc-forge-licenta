import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: { id: string } };

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautentificat." }, { status: 401 });
  }

  const order = await prisma.order.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: {
      id: true,
      status: true,
      paymentMethod: true,
      paymentStatus: true,
      paidAt: true,
    },
  });
  if (!order) {
    return NextResponse.json({ error: "Comandă inexistentă." }, { status: 404 });
  }

  return NextResponse.json({
    ...order,
    paidAt: order.paidAt?.toISOString() ?? null,
  });
}
