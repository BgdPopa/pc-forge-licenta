import Link from "next/link";
import { Prisma, ProductCategory } from "@prisma/client";
import { ProductCard } from "@/components/product-card";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { prisma } from "@/lib/prisma";
import { categoryLabels, type ProductCardData } from "@/types/product";

const PAGE_SIZE = 12;

type SortKey = "price-asc" | "price-desc" | "name-asc";

const sortOptions: Record<
  SortKey,
  { label: string; orderBy: Prisma.ProductOrderByWithRelationInput }
> = {
  "price-desc": { label: "Preț descrescător", orderBy: { price: "desc" } },
  "price-asc": { label: "Preț crescător", orderBy: { price: "asc" } },
  "name-asc": { label: "Nume (A–Z)", orderBy: { name: "asc" } },
};

type SearchParams = {
  [key: string]: string | string[] | undefined;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v.length > 0 ? v : undefined;
}

function parsePositiveInt(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Citirea și normalizarea filtrelor din query params (URL).
  const categoryParam = firstValue(searchParams.category);
  const brandParam = firstValue(searchParams.brand);
  const minPrice = parsePositiveInt(firstValue(searchParams.minPrice));
  const maxPrice = parsePositiveInt(firstValue(searchParams.maxPrice));
  const sortParam = firstValue(searchParams.sort);

  const categoryValues = Object.values(ProductCategory);
  const category =
    categoryParam && categoryValues.includes(categoryParam as ProductCategory)
      ? (categoryParam as ProductCategory)
      : undefined;

  const sort: SortKey =
    sortParam && sortParam in sortOptions ? (sortParam as SortKey) : "price-desc";

  const currentPage = Math.max(
    1,
    parsePositiveInt(firstValue(searchParams.page)) ?? 1,
  );

  // Construirea clauzei WHERE pentru Prisma în funcție de filtrele active.
  const where: Prisma.ProductWhereInput = { isActive: true };
  if (category) where.categoryType = category;
  if (brandParam) where.brand = brandParam;
  if (minPrice !== undefined || maxPrice !== undefined) {
    const priceFilter: Prisma.DecimalFilter = {};
    if (minPrice !== undefined) priceFilter.gte = minPrice;
    if (maxPrice !== undefined) priceFilter.lte = maxPrice;
    where.price = priceFilter;
  }

  const [categories, brandRows, totalCount, dbProducts] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: { isActive: true },
      select: { brand: true },
      distinct: ["brand"],
      orderBy: { brand: "asc" },
    }),
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: sortOptions[sort].orderBy,
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const brands = brandRows.map((row) => row.brand);

  const products: ProductCardData[] = dbProducts.map((product) => ({
    id: product.id,
    name: product.name,
    brand: product.brand,
    categoryLabel: categoryLabels[product.categoryType],
    price: Number(product.price),
    shortDescription: product.shortDescription ?? product.description,
    inStock: product.stock > 0,
  }));

  // Construiește un href păstrând filtrele curente, schimbând doar pagina.
  function buildPageHref(page: number): string {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (brandParam) params.set("brand", brandParam);
    if (minPrice !== undefined) params.set("minPrice", String(minPrice));
    if (maxPrice !== undefined) params.set("maxPrice", String(maxPrice));
    params.set("sort", sort);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return qs ? `/catalog?${qs}` : "/catalog";
  }

  const hasActiveFilters =
    category !== undefined ||
    brandParam !== undefined ||
    minPrice !== undefined ||
    maxPrice !== undefined;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Catalog produse</h1>
          <p className="mt-2 text-zinc-400">
            Filtrare server-side după categorie, brand și preț, cu paginare.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          {/* Filtre — formular GET care actualizează query params din URL */}
          <aside>
            <form
              method="get"
              action="/catalog"
              className="space-y-5 rounded-lg border border-zinc-800 bg-zinc-900 p-5"
            >
              <div>
                <label
                  htmlFor="category"
                  className="mb-1 block text-sm font-medium text-zinc-300"
                >
                  Categorie
                </label>
                <select
                  id="category"
                  name="category"
                  defaultValue={category ?? ""}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-red-600 focus:outline-none"
                >
                  <option value="">Toate categoriile</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.type}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="brand"
                  className="mb-1 block text-sm font-medium text-zinc-300"
                >
                  Brand
                </label>
                <select
                  id="brand"
                  name="brand"
                  defaultValue={brandParam ?? ""}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-red-600 focus:outline-none"
                >
                  <option value="">Toate brandurile</option>
                  {brands.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label
                    htmlFor="minPrice"
                    className="mb-1 block text-sm font-medium text-zinc-300"
                  >
                    Preț min.
                  </label>
                  <input
                    id="minPrice"
                    name="minPrice"
                    type="number"
                    min={0}
                    defaultValue={minPrice ?? ""}
                    placeholder="0"
                    className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-red-600 focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label
                    htmlFor="maxPrice"
                    className="mb-1 block text-sm font-medium text-zinc-300"
                  >
                    Preț max.
                  </label>
                  <input
                    id="maxPrice"
                    name="maxPrice"
                    type="number"
                    min={0}
                    defaultValue={maxPrice ?? ""}
                    placeholder="∞"
                    className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-red-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="sort"
                  className="mb-1 block text-sm font-medium text-zinc-300"
                >
                  Sortare
                </label>
                <select
                  id="sort"
                  name="sort"
                  defaultValue={sort}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-red-600 focus:outline-none"
                >
                  {(Object.keys(sortOptions) as SortKey[]).map((key) => (
                    <option key={key} value={key}>
                      {sortOptions[key].label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="submit"
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500"
                >
                  Filtrează
                </button>
                {hasActiveFilters && (
                  <Link
                    href="/catalog"
                    className="rounded-md border border-zinc-700 px-4 py-2 text-center text-sm font-medium text-zinc-300 transition-colors hover:border-red-600 hover:text-red-500"
                  >
                    Resetează filtrele
                  </Link>
                )}
              </div>
            </form>
          </aside>

          {/* Rezultate */}
          <section>
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm text-zinc-400">
                {totalCount}{" "}
                {totalCount === 1 ? "produs găsit" : "produse găsite"}
              </p>
              {totalPages > 1 && (
                <p className="text-sm text-zinc-500">
                  Pagina {currentPage} din {totalPages}
                </p>
              )}
            </div>

            {products.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/40 p-12 text-center">
                <p className="text-zinc-300">
                  Niciun produs nu corespunde filtrelor selectate.
                </p>
                <Link
                  href="/catalog"
                  className="mt-4 inline-block text-sm font-medium text-red-500 hover:text-red-400"
                >
                  Resetează filtrele
                </Link>
              </div>
            ) : (
              <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {products.map((product) => (
                  <li key={product.id}>
                    <ProductCard product={product} />
                  </li>
                ))}
              </ul>
            )}

            {totalPages > 1 && (
              <nav className="mt-10 flex items-center justify-center gap-3">
                {currentPage > 1 ? (
                  <Link
                    href={buildPageHref(currentPage - 1)}
                    className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-red-600 hover:text-red-500"
                  >
                    Anterior
                  </Link>
                ) : (
                  <span className="cursor-not-allowed rounded-md border border-zinc-800 px-4 py-2 text-sm font-medium text-zinc-600">
                    Anterior
                  </span>
                )}

                <span className="text-sm text-zinc-400">
                  {currentPage} / {totalPages}
                </span>

                {currentPage < totalPages ? (
                  <Link
                    href={buildPageHref(currentPage + 1)}
                    className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-red-600 hover:text-red-500"
                  >
                    Următor
                  </Link>
                ) : (
                  <span className="cursor-not-allowed rounded-md border border-zinc-800 px-4 py-2 text-sm font-medium text-zinc-600">
                    Următor
                  </span>
                )}
              </nav>
            )}
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
