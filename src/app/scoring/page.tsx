import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { SCORABLE_CATEGORIES } from "@/lib/scoring/attributes";
import {
  ScoringClient,
  type ScoringPageProduct,
} from "@/components/scoring-client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

// Clasamentul folosește catalogul curent și se calculează la fiecare cerere.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Scoring preț-performanță — PC Forge",
  description:
    "Clasament de produse pe categorii, cu scoruri de performanță și valoare ajustabile per profil de utilizare.",
};

function toSpecifications(
  value: unknown,
  tdpWatts?: number | null,
): Record<string, unknown> | null {
  const specifications =
    value && typeof value === "object" && !Array.isArray(value)
      ? { ...(value as Record<string, unknown>) }
      : {};

  if (tdpWatts !== null && tdpWatts !== undefined) {
    specifications.tdpWatts = tdpWatts;
  }

  return Object.keys(specifications).length > 0 ? specifications : null;
}

export default async function ScoringPage() {
  const dbProducts = await prisma.product.findMany({
    where: {
      isActive: true,
      categoryType: { in: SCORABLE_CATEGORIES },
    },
    include: { component: { select: { tdpWatts: true } } },
    orderBy: { name: "asc" },
  });

  const products: ScoringPageProduct[] = dbProducts.map((product) => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    price: Number(product.price),
    categoryType: product.categoryType,
    specifications: toSpecifications(
      product.specifications,
      product.component?.tdpWatts,
    ),
  }));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Scoring preț-performanță
          </h1>
          <p className="mt-2 max-w-3xl text-zinc-400">
            A doua contribuție originală PC Forge: o funcție de scoring care
            evaluează componentele pe baza atributelor tehnice, cu ponderi
            ajustabile per profil (gaming, workstation, office). Produsele
            sunt comparate în interiorul categoriei, nu global.
          </p>
        </div>

        <ScoringClient products={products} />
      </main>

      <SiteFooter />
    </div>
  );
}
