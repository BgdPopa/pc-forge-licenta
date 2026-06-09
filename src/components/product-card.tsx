import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { ProductVisual } from "@/components/product-visual";
import type { ProductCardData } from "@/types/product";

type ProductCardProps = {
  product: ProductCardData;
};

function scoreColor(score: number): string {
  if (score >= 7.5) return "text-emerald-400";
  if (score >= 5) return "text-amber-400";
  return "text-zinc-400";
}

export function ProductCard({ product }: ProductCardProps) {
  const hasScores = product.valueScore !== undefined;

  return (
    <Link href={`/catalog/${product.slug}`} className="block h-full">
      <article className="flex h-full flex-col rounded-xl border border-zinc-800 bg-zinc-900 transition-colors duration-150 hover:border-red-600/50 hover:bg-zinc-900/70">

        {/* Zonă vizuală */}
        <div className="p-3 pb-0">
          <ProductVisual
            category={product.categoryLabel}
            slug={product.slug}
            size="card"
          />
        </div>

        <div className="flex flex-1 flex-col p-4">
          {/* Categorie + stoc */}
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="rounded-md bg-zinc-800 px-2.5 py-1 text-xs font-medium text-red-400">
              {product.categoryLabel}
            </span>
            <span
              className={`flex items-center gap-1.5 text-xs font-medium ${
                product.inStock ? "text-emerald-400" : "text-zinc-500"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  product.inStock ? "bg-emerald-400" : "bg-zinc-600"
                }`}
              />
              {product.inStock ? "În stoc" : "Stoc epuizat"}
            </span>
          </div>

          {/* Brand + Nume */}
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
            {product.brand}
          </p>
          <h3 className="mt-1 text-sm font-semibold leading-snug text-zinc-100 line-clamp-2">
            {product.name}
          </h3>

          {/* Descriere scurtă */}
          <p className="mt-2 flex-1 text-xs leading-relaxed text-zinc-400 line-clamp-3">
            {product.shortDescription}
          </p>

          {/* Badge-uri scoring */}
          {hasScores && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-0.5 text-xs">
                <span className="text-zinc-400">Valoare</span>
                <span className={`font-bold ${scoreColor(product.valueScore!)}`}>
                  {product.valueScore!.toFixed(1)}
                </span>
                <span className="text-zinc-600">/10</span>
              </span>

              {product.performanceScore !== undefined && (
                <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-0.5 text-xs">
                  <span className="text-zinc-400">Perf.</span>
                  <span className={`font-bold ${scoreColor(product.performanceScore)}`}>
                    {product.performanceScore.toFixed(1)}
                  </span>
                  <span className="text-zinc-600">/10</span>
                </span>
              )}
            </div>
          )}

          {/* Preț */}
          <div className="mt-4 border-t border-zinc-800 pt-3">
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">Preț</p>
            <p className="mt-0.5 text-lg font-bold text-red-500">
              {formatPrice(product.price)}
            </p>
          </div>
        </div>
      </article>
    </Link>
  );
}
