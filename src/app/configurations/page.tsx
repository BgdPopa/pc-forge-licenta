import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ConfigurationsClient } from "@/components/configurations-client";

export const metadata: Metadata = {
  title: "Configurațiile mele — PC Forge",
  description: "Configurațiile PC salvate în contul tău PC Forge.",
};

export type SerializedConfiguration = {
  id: string;
  name: string;
  totalPrice: number | null;
  totalPower: number | null;
  isValid: boolean;
  createdAt: string;
  items: Array<{
    id: string;
    productId: string;
    categoryType: string;
    productName: string;
    productPrice: number;
  }>;
};

export default async function ConfigurationsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/configurations");
  }

  const configurations = await prisma.configuration.findMany({
    where: { userId: session.user.id },
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true, price: true, categoryType: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Serializăm Decimal → number și Date → string pentru client component
  const serialized: SerializedConfiguration[] = configurations.map((c) => ({
    id: c.id,
    name: c.name,
    totalPrice: c.totalPrice ? Number(c.totalPrice) : null,
    totalPower: c.totalPower,
    isValid: c.isValid,
    createdAt: c.createdAt.toISOString(),
    items: c.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      categoryType: item.categoryType,
      productName: item.product.name,
      productPrice: Number(item.product.price),
    })),
  }));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Configurațiile mele</h1>
          <p className="mt-2 text-zinc-400">
            Configurațiile PC salvate în contul tău. Poți crea oricâte configurații și le poți
            gestiona de aici.
          </p>
        </div>

        <ConfigurationsClient configurations={serialized} />
      </main>

      <SiteFooter />
    </div>
  );
}
