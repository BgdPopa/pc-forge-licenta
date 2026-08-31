"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ProductCategory } from "@prisma/client";
import { formatPrice } from "@/lib/format";
import {
  extractAttributes,
  getAttributeDefinitions,
  SCORABLE_CATEGORIES,
} from "@/lib/scoring/attributes";
import { formatAttributeDisplay } from "@/lib/scoring/display";
import { scoreProducts } from "@/lib/scoring/engine";
import {
  getWeights,
  profileDescriptions,
  profileLabels,
  USAGE_PROFILES,
} from "@/lib/scoring/profiles";
import type {
  ScoredProduct,
  UsageProfile,
  WeightMap,
} from "@/lib/scoring/types";
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

export function ScoringClient({ products }: { products: ScoringPageProduct[] }) {
  const availableCategories = useMemo(
    () =>
      SCORABLE_CATEGORIES.filter((category) =>
        products.some((product) => product.categoryType === category),
      ),
    [products],
  );

  const [profile, setProfile] = useState<UsageProfile>("gaming");
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>(
    availableCategories[0] ?? "CPU",
  );
  const [customWeights, setCustomWeights] = useState<
    Partial<Record<ProductCategory, WeightMap>>
  >({});

  const activeWeights =
    customWeights[selectedCategory] ?? getWeights(selectedCategory, profile);
  const attributeDefinitions = getAttributeDefinitions(selectedCategory);
  const isCustom = customWeights[selectedCategory] !== undefined;

  const rankedProducts = useMemo<RankedProduct[]>(() => {
    const categoryProducts = products.filter(
      (product) => product.categoryType === selectedCategory,
    );
    const inputs = categoryProducts.map((product) => ({
      id: product.id,
      name: product.name,
      brand: product.brand,
      price: product.price,
      categoryType: product.categoryType,
      attributes: extractAttributes(selectedCategory, product.specifications),
    }));
    const productMeta = new Map(
      categoryProducts.map((product) => [product.id, product]),
    );

    return scoreProducts(inputs, activeWeights)
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
  }, [activeWeights, products, selectedCategory]);

  function selectProfile(nextProfile: UsageProfile) {
    setProfile(nextProfile);
    setCustomWeights({});
  }

  function updateWeight(key: string, percent: number) {
    setCustomWeights((current) => ({
      ...current,
      [selectedCategory]: {
        ...getWeights(selectedCategory, profile),
        ...(current[selectedCategory] ?? {}),
        [key]: percent / 100,
      },
    }));
  }

  function resetWeights() {
    setCustomWeights((current) => {
      const next = { ...current };
      delete next[selectedCategory];
      return next;
    });
  }

  if (availableCategories.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-800 p-8 text-center text-zinc-400">
        Nu există momentan produse cu date suficiente pentru scoring.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-5 rounded-lg border border-zinc-800 bg-zinc-900 p-5 lg:grid-cols-2">
        <div>
          <label htmlFor="scoring-category" className="text-sm font-semibold text-zinc-100">
            Categoria comparată
          </label>
          <p className="mt-1 text-sm text-zinc-400">
            Produsele sunt normalizate și clasificate doar în interiorul aceleiași categorii.
          </p>
          <select
            id="scoring-category"
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value as ProductCategory)}
            className="mt-4 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-red-600 focus:outline-none"
          >
            {availableCategories.map((category) => (
              <option key={category} value={category}>
                {categoryLabels[category]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Profil de utilizare</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Profilul încarcă un vector de ponderi justificat pentru scenariul ales.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {USAGE_PROFILES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => selectProfile(option)}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  profile === option && !isCustom
                    ? "bg-red-600 text-white"
                    : "border border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-red-600/60 hover:text-red-400"
                }`}
              >
                {profileLabels[option]}
              </button>
            ))}
            {isCustom && (
              <span className="rounded-md border border-red-900/60 bg-red-950/30 px-4 py-2 text-sm font-medium text-red-400">
                Personalizat
              </span>
            )}
          </div>
          <p className="mt-3 text-sm text-zinc-500">{profileDescriptions[profile]}</p>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Ponderi ajustabile</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Modificarea unui slider recalculează instantaneu scorurile și ordinea produselor.
            </p>
          </div>
          <button
            type="button"
            onClick={resetWeights}
            disabled={!isCustom}
            className="rounded-md border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-red-600 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Revino la profilul {profileLabels[profile]}
          </button>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {attributeDefinitions.map((attribute) => {
            const percent = Math.round((activeWeights[attribute.key] ?? 0) * 100);
            return (
              <div key={attribute.key}>
                <label
                  htmlFor={`weight-${attribute.key}`}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="font-medium text-zinc-300">{attribute.label}</span>
                  <output htmlFor={`weight-${attribute.key}`} className="font-mono text-red-400">
                    {percent}%
                  </output>
                </label>
                <input
                  id={`weight-${attribute.key}`}
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={percent}
                  onChange={(event) => updateWeight(attribute.key, Number(event.target.value))}
                  className="mt-2 w-full accent-red-600"
                />
                <p className="mt-1 text-xs text-zinc-600">
                  {attribute.higherIsBetter
                    ? "Valoarea mai mare este preferată."
                    : "Valoarea mai mică este preferată."}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5 text-sm leading-relaxed text-zinc-400">
        <h2 className="text-base font-semibold text-zinc-200">Cum se calculează</h2>
        <p className="mt-2">
          Pentru fiecare categorie, atributele numerice sunt normalizate min-max între produsele
          din catalog. Indicele de performanță este media ponderată: P = Σ(wk · normk) / Σwk.
          Scorul de valoare compară raportul performanță/preț și îl aduce pe scara 0–10 raportat
          la cel mai bun produs din categorie. Pentru atribute precum consumul, o valoare mai
          mică primește un scor normalizat mai bun.
        </p>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">
              {categoryLabels[selectedCategory]}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Clasament după scorul de valoare (preț-performanță)
            </p>
          </div>
          <span className="text-sm text-zinc-500">
            {rankedProducts.length} {rankedProducts.length === 1 ? "produs" : "produse"}
          </span>
        </div>

        <div className="space-y-4">
          {rankedProducts.map((product) => (
            <article key={product.id} className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-lg font-bold text-red-500">
                    {product.rank}
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-zinc-500">{product.brand}</p>
                    <h3 className="text-lg font-semibold text-zinc-100">
                      <Link href={`/catalog/${product.slug}`} className="transition-colors hover:text-red-400">
                        {product.name}
                      </Link>
                    </h3>
                    <p className="mt-1 text-sm text-zinc-500">Preț: {formatPrice(product.price)}</p>
                  </div>
                </div>

                <div className="flex gap-6 text-right">
                  <div>
                    <p className="text-xs text-zinc-500">Performanță</p>
                    <p className="text-xl font-bold text-zinc-100">
                      {product.performanceScore.toFixed(1)}
                      <span className="text-sm font-normal text-zinc-500"> / 10</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Valoare</p>
                    <p className="text-xl font-bold text-red-500">
                      {product.valueScore.toFixed(1)}
                      <span className="text-sm font-normal text-zinc-500"> / 10</span>
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
                      <div key={contribution.key} className="rounded-md bg-zinc-950 px-3 py-2 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-zinc-300">{contribution.label}</span>
                          <span className="text-zinc-400">
                            {formatAttributeDisplay(
                              selectedCategory,
                              contribution.key,
                              contribution.rawValue,
                              contribution.unit,
                              product.specifications,
                            )}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs text-zinc-500">
                          <span>
                            norm {contribution.normalized.toFixed(2)} · pondere {contribution.weight.toFixed(2)}
                          </span>
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-800">
                            <div
                              className="h-full rounded-full bg-red-600"
                              style={{ width: `${contribution.normalized * 100}%` }}
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
    </div>
  );
}
