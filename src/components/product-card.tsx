import type { ProductCardData } from "@/types/product";

type ProductCardProps = {
  product: ProductCardData;
};

function formatPrice(price: number): string {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "RON",
    maximumFractionDigits: 0,
  }).format(price);
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="flex h-full flex-col rounded-lg border border-zinc-800 bg-zinc-900 p-5 transition-colors hover:border-zinc-700">
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className="rounded-md bg-zinc-950 px-2 py-1 text-xs font-medium text-red-500">
          {product.categoryLabel}
        </span>
        <span
          className={`text-xs font-medium ${
            product.inStock ? "text-emerald-400" : "text-zinc-500"
          }`}
        >
          {product.inStock ? "În stoc" : "Stoc epuizat"}
        </span>
      </div>

      <p className="text-xs uppercase tracking-wide text-zinc-500">
        {product.brand}
      </p>
      <h3 className="mt-1 text-lg font-semibold text-zinc-100">
        {product.name}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-400">
        {product.shortDescription}
      </p>

      <div className="mt-5 flex items-end justify-between border-t border-zinc-800 pt-4">
        <div>
          <p className="text-xs text-zinc-500">Preț</p>
          <p className="text-xl font-bold text-red-500">
            {formatPrice(product.price)}
          </p>
        </div>
        {product.score !== undefined && (
          <div className="text-right">
            <p className="text-xs text-zinc-500">Scor</p>
            <p className="text-lg font-semibold text-zinc-100">
              {product.score.toFixed(1)}
              <span className="text-sm font-normal text-zinc-500"> / 10</span>
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
