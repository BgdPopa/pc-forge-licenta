import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { ProductCardData } from "@/types/product";

type ProductCardProps = {
  product: ProductCardData;
};

// Culoare scor: verde ≥7.5, galben ≥5, gri sub 5
function scoreColor(score: number): string {
  if (score >= 7.5) return "text-emerald-400";
  if (score >= 5) return "text-amber-400";
  return "text-zinc-400";
}

const categoryVisuals: Record<string, { label: string; abbr: string }> = {
  CPU: { label: "Procesor", abbr: "CPU" },
  GPU: { label: "Placă video", abbr: "GPU" },
  MOTHERBOARD: { label: "Placă de bază", abbr: "MBO" },
  RAM: { label: "Memorie RAM", abbr: "RAM" },
  STORAGE: { label: "Stocare", abbr: "SSD" },
  PSU: { label: "Sursă", abbr: "PSU" },
  CASE: { label: "Carcasă", abbr: "CASE" },
  COOLER: { label: "Răcire", abbr: "FAN" },
  PERIPHERAL: { label: "Periferic", abbr: "PRF" },
  ACCESSORY: { label: "Accesoriu", abbr: "ACC" },
};

function ProductVisual({ categoryLabel }: { categoryLabel: string }) {
  const upper = categoryLabel.toUpperCase();
  const entry = Object.values(categoryVisuals).find((v) => v.label === categoryLabel)
    ?? Object.entries(categoryVisuals).find(([k]) => k === upper)?.[1]
    ?? { label: categoryLabel, abbr: categoryLabel.slice(0, 3).toUpperCase() };

  return (
    <div className="mb-4 flex h-28 items-center justify-center rounded-lg border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-red-950/20">
      <div className="text-center">
        <p className="text-2xl font-bold tracking-widest text-red-600/60">{entry.abbr}</p>
        <p className="mt-1 text-xs text-zinc-500">{entry.label}</p>
      </div>
    </div>
  );
}

export function ProductCard({ product }: ProductCardProps) {
  const hasScores = product.valueScore !== undefined;

  return (
    <Link href={`/catalog/${product.slug}`} className="block h-full">
      <article className="flex h-full flex-col rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition-colors duration-150 hover:border-red-600/50 hover:bg-zinc-900/70">

        {/* Fallback vizual pe categorie */}
        <ProductVisual categoryLabel={product.categoryLabel} />

        {/* Rând 1: categorie + indicator stoc */}
        <div className="mb-4 flex items-center justify-between gap-2">
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
        <h3 className="mt-1 text-base font-semibold leading-snug text-zinc-100 line-clamp-2">
          {product.name}
        </h3>

        {/* Descriere scurtă */}
        <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-400 line-clamp-3">
          {product.shortDescription}
        </p>

        {/* Badge-uri scoring — afișate doar pentru categorii scorabile */}
        {hasScores && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2.5 py-1 text-xs">
              <span className="text-zinc-400">Scor valoare</span>
              <span className={`font-bold ${scoreColor(product.valueScore!)}`}>
                {product.valueScore!.toFixed(1)}
              </span>
              <span className="text-zinc-600">/10</span>
            </span>

            {product.performanceScore !== undefined && (
              <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2.5 py-1 text-xs">
                <span className="text-zinc-400">Performanță</span>
                <span className={`font-bold ${scoreColor(product.performanceScore)}`}>
                  {product.performanceScore.toFixed(1)}
                </span>
                <span className="text-zinc-600">/10</span>
              </span>
            )}

            <span className="rounded-md bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-500">
              Gaming
            </span>
          </div>
        )}

        {/* Preț */}
        <div className="mt-4 border-t border-zinc-800 pt-4">
          <p className="mb-0.5 text-xs text-zinc-500">Preț</p>
          <p className="text-xl font-bold text-red-500">
            {formatPrice(product.price)}
          </p>
        </div>
      </article>
    </Link>
  );
}
