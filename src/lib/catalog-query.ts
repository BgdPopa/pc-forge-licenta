import { Prisma, type ProductCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type CatalogSort =
  | "relevance"
  | "price-asc"
  | "price-desc"
  | "name-asc";

export type CatalogProductRecord = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  description: string;
  shortDescription: string | null;
  price: number;
  stock: number;
  imageUrl: string | null;
  categoryType: ProductCategory;
  specifications: unknown;
  tdpWatts: number | null;
  searchRank: number;
};

export type CatalogQuery = {
  query?: string;
  category?: ProductCategory;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: CatalogSort;
  page?: number;
  pageSize?: number;
};

export type CatalogQueryResult = {
  products: CatalogProductRecord[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/**
 * Interogarea unică a catalogului, reutilizată de pagina Server Component și
 * de GET /api/products. Căutarea folosește full-text search nativ PostgreSQL
 * pe nume și descriere, iar rezultatele implicite sunt ordonate cu ts_rank.
 */
export async function queryCatalog(
  options: CatalogQuery = {},
): Promise<CatalogQueryResult> {
  const query = options.query?.trim().slice(0, 120) ?? "";
  // to_tsquery are o sintaxă proprie. Construim expresia numai din lexemele
  // introduse de utilizator și o transmitem parametrizat către PostgreSQL.
  const tsQuery = query
    .split(/[^A-Za-z0-9_\u00C0-\u024F]+/)
    .map((term) => term.trim())
    .filter(Boolean)
    .join(" & ");
  const pageSize = Math.min(Math.max(options.pageSize ?? 12, 1), 50);
  const page = Math.max(options.page ?? 1, 1);
  const offset = (page - 1) * pageSize;
  const conditions: Prisma.Sql[] = [Prisma.sql`p."isActive" = true`];

  if (options.category) {
    conditions.push(
      Prisma.sql`p."categoryType" = ${options.category}::"ProductCategory"`,
    );
  }
  if (options.brand) {
    conditions.push(Prisma.sql`p.brand = ${options.brand}`);
  }
  if (options.minPrice !== undefined) {
    conditions.push(Prisma.sql`p.price >= ${options.minPrice}`);
  }
  if (options.maxPrice !== undefined) {
    conditions.push(Prisma.sql`p.price <= ${options.maxPrice}`);
  }

  const documentVector = Prisma.sql`to_tsvector(
    'simple',
    COALESCE(p.name, '') || ' ' || COALESCE(p.description, '')
  )`;
  const textQuery = Prisma.sql`to_tsquery('simple', ${tsQuery})`;

  if (tsQuery) {
    conditions.push(Prisma.sql`${documentVector} @@ ${textQuery}`);
  }

  const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;
  const requestedSort = options.sort ?? (tsQuery ? "relevance" : "price-desc");
  const orderBy: Record<CatalogSort, Prisma.Sql> = {
    relevance: tsQuery
      ? Prisma.sql`"searchRank" DESC, p.name ASC`
      : Prisma.sql`p.name ASC`,
    "price-asc": Prisma.sql`p.price ASC, p.name ASC`,
    "price-desc": Prisma.sql`p.price DESC, p.name ASC`,
    "name-asc": Prisma.sql`p.name ASC`,
  };
  const rankExpression = tsQuery
    ? Prisma.sql`ts_rank(${documentVector}, ${textQuery})`
    : Prisma.sql`0::real`;

  type RawProduct = Omit<CatalogProductRecord, "price" | "searchRank"> & {
    price: string;
    searchRank: number | string;
  };

  const [countRows, rows] = await Promise.all([
    prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM products p
      ${whereClause}
    `),
    prisma.$queryRaw<RawProduct[]>(Prisma.sql`
      SELECT
        p.id,
        p.slug,
        p.name,
        p.brand,
        p.description,
        p."shortDescription",
        p.price::text AS price,
        p.stock,
        p."imageUrl",
        p."categoryType"::text AS "categoryType",
        p.specifications,
        c."tdpWatts",
        ${rankExpression} AS "searchRank"
      FROM products p
      LEFT JOIN components c ON c."productId" = p.id
      ${whereClause}
      ORDER BY ${orderBy[requestedSort]}
      LIMIT ${pageSize}
      OFFSET ${offset}
    `),
  ]);

  const totalCount = countRows[0]?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    products: rows.map((row) => ({
      ...row,
      categoryType: row.categoryType as ProductCategory,
      price: Number(row.price),
      searchRank: Number(row.searchRank),
    })),
    totalCount,
    page,
    pageSize,
    totalPages,
  };
}
