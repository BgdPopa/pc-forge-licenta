"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ProductCategory } from "@prisma/client";
import { formatPrice } from "@/lib/format";
import { extractAttributes, SCORABLE_CATEGORIES } from "@/lib/scoring/attributes";
import { formatAttributeDisplay } from "@/lib/scoring/display";
import { scoreProducts } from "@/lib/scoring/engine";
import {
  getWeights,
  profileDescriptions,
  profileLabels,
  USAGE_PROFILES,
} from "@/lib/scoring/profiles";
import type { ScoredProduct, UsageProfile } from "@/lib/scoring/types";
import { categoryLabels } from "@/types/product";

export type ScoringPageProduct = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  price: number;
  categoryType: ProductCategory;
  specifications: Record<string, unknown> | null;
};

type RankedProduct = ScoredProduct & {
  slug: string;
  specifications: Record<string, unknown> | null;
  rank: number;
};

type Props = {
  products: ScoringPageProduct[];
};

export function ScoringClient({ products }: Props) {
  const [profile, setProfile] = useState<UsageProfile>("gaming");

  const rankedByCategory = useMemo(() => {
    const result = new Map<ProductCategory, RankedProduct[]>();

    for (const category of SCORABLE_CATEGORIES) {
      const categoryProducts = products.filter(
        (product) => product.categoryType === category,
      );
      if (categoryProducts.length === 0) continue;

      const inputs = categoryProducts.map((product) => ({
        id: product.id,
        name: product.name,
        brand: product.brand,
        price: product.price,
        categoryType: product.categoryType,
        attributes: extractAttributes(category, product.specifications),
      }));

      const scored = scoreProducts(inputs, getWeights(category, profile));
      const productMeta = new Map(
        categoryProducts.map((product) => [product.id, product]),
      );

      const ranked = scored
        .map((entry) => {
          const meta = productMeta.get(entry.id);
          return {
            ...entry,
            slug: meta?.slug ?? "",
            specifications: meta?.specifications ?? null,
            rank: 0,
          };
        })
        .sort((a, b) => b.valueScore - a.valueScore)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

      result.set(category, ranked);
    }

    return result;
  }, [products, profile]);

  return (
    <div className="space-y-10">
      <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="text-lg font-semibold text-zinc-100">Profil de utilizare</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Ponderile atributelor se schimbă în funcție de profil. Același produs
          poate avea scoruri diferite la gaming față de workstation.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {USAGE_PROFILES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setProfile(option)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                profile === option
                  ? "bg-red-600 text-white"
                  : "border border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-red-600/60 hover:text-red-400"
              }`}
            >
              {profileLabels[option]}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-zinc-500">{profileDescriptions[profile]}</p>
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5 text-sm leading-relaxed text-zinc-400">
        <h2 className="text-base font-semibold text-zinc-200">Cum se calculează</h2>
        <p className="mt-2">
          Pentru fiecare categorie, atributele numerice sunt normalizate min-max
          între produsele din catalog. Indicele de performanță este media
          ponderată: P = Σ(wk · normk) / Σwk.
          Scorul de valoare compară raportul performanță/preț și îl aduce pe
          scara 0–10 raportat la cel mai bun produs din categorie.
        </p>
      </section>

      {SCORABLE_CATEGORIES.map((category) => {
        const ranked = rankedByCategory.get(category);
        if (!ranked || ranked.length === 0) return null;

        return (
          <section key={category}>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-zinc-100">
                  {categoryLabels[category]}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Clasament după scorul de valoare (preț-performanță)
                </p>
              </div>
              <span className="text-sm text-zinc-500">
                {ranked.length} {ranked.length === 1 ? "produs" : "produse"}
              </span>
            </div>

            <div className="space-y-4">
              {ranked.map((product) => (
                <article
                  key={product.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-lg font-bold text-red-500">
                        {product.rank}
                      </span>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-zinc-500">
                          {product.brand}
                        </p>
                        <h3 className="text-lg font-semibold text-zinc-100">
                          <Link
                            href={`/catalog/${product.slug}`}
                            className="transition-colors hover:text-red-400"
                          >
                            {product.name}
                          </Link>
                        </h3>
                        <p className="mt-1 text-sm text-zinc-500">
                          Preț: {formatPrice(product.price)}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-6 text-right">
                      <div>
                        <p className="text-xs text-zinc-500">Performanță</p>
                        <p className="text-xl font-bold text-zinc-100">
                          {product.performanceScore.toFixed(1)}
                          <span className="text-sm font-normal text-zinc-500">
                            {" "}
                            / 10
                          </span>
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500">Valoare</p>
                        <p className="text-xl font-bold text-red-500">
                          {product.valueScore.toFixed(1)}
                          <span className="text-sm font-normal text-zinc-500">
                            {" "}
                            / 10
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {product.contributions.length > 0 && (
                    <div className="mt-4 border-t border-zinc-800 pt-4">
                      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Defalcare pe atribute
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {product.contributions.map((contribution) => (
                          <div
                            key={contribution.key}
                            className="rounded-md bg-zinc-950 px-3 py-2 text-sm"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-zinc-300">
                                {contribution.label}
                              </span>
                              <span className="text-zinc-400">
                                {formatAttributeDisplay(
                                  category,
                                  contribution.key,
                                  contribution.rawValue,
                                  contribution.unit,
                                  product.specifications,
                                )}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-xs text-zinc-500">
                              <span>
                                norm {contribution.normalized.toFixed(2)} · pondere{" "}
                                {contribution.weight}
                              </span>
                              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-800">
                                <div
                                  className="h-full rounded-full bg-red-600"
                                  style={{
                                    width: `${contribution.normalized * 100}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
