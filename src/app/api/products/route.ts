import { NextRequest, NextResponse } from "next/server";
import { ProductCategory } from "@prisma/client";
import { queryCatalog, type CatalogSort } from "@/lib/catalog-query";

const SORT_VALUES = new Set<CatalogSort>([
  "relevance",
  "price-asc",
  "price-desc",
  "name-asc",
]);

function parseNonNegative(value: string | null): number | undefined {
  if (value === null || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function parsePositiveInteger(value: string | null): number | undefined {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : undefined;
}

/** Catalog public cu filtrare, paginare și căutare full-text PostgreSQL. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const categoryValue = params.get("category");
  const category = Object.values(ProductCategory).includes(
    categoryValue as ProductCategory,
  )
    ? (categoryValue as ProductCategory)
    : undefined;
  const sortValue = params.get("sort") as CatalogSort | null;
  const sort = sortValue && SORT_VALUES.has(sortValue) ? sortValue : undefined;

  try {
    const result = await queryCatalog({
      query: params.get("q") ?? undefined,
      category,
      brand: params.get("brand")?.slice(0, 80) || undefined,
      minPrice: parseNonNegative(params.get("minPrice")),
      maxPrice: parseNonNegative(params.get("maxPrice")),
      sort,
      page: parsePositiveInteger(params.get("page")),
      pageSize: parsePositiveInteger(params.get("pageSize")),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[products] catalog query failed", error);
    return NextResponse.json(
      { error: "Catalogul nu a putut fi încărcat." },
      { status: 500 },
    );
  }
}
