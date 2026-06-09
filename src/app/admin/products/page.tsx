import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import {
  AdminProductsTable,
  type AdminProductRow,
} from "@/components/admin-products-table";

export const metadata: Metadata = {
  title: "Produse — Admin PC Forge",
};

export default async function AdminProductsPage() {
  const dbProducts = await prisma.product.findMany({
    include: { category: { select: { name: true } } },
    orderBy: [{ categoryType: "asc" }, { name: "asc" }],
  });

  const products: AdminProductRow[] = dbProducts.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    slug: p.slug,
    categoryName: p.category.name,
    categoryType: p.categoryType,
    price: Number(p.price),
    stock: p.stock,
    isActive: p.isActive,
  }));

  const outOfStock = products.filter((p) => p.stock === 0).length;
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 5).length;

  return (
    <div className="space-y-6">
      {/* Titlu */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Catalog produse</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {products.length} produse înregistrate. Poți edita prețul și stocul direct din tabel.
        </p>
      </div>

      {/* Sumar stoc */}
      {(outOfStock > 0 || lowStock > 0) && (
        <div className="flex flex-wrap gap-3">
          {outOfStock > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-red-900/40 bg-red-950/20 px-3 py-2 text-xs">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-red-400 font-medium">
                {outOfStock} {outOfStock === 1 ? "produs epuizat" : "produse epuizate"}
              </span>
            </div>
          )}
          {lowStock > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-xs">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-amber-400 font-medium">
                {lowStock} {lowStock === 1 ? "produs cu stoc mic" : "produse cu stoc mic"} (≤ 5 buc.)
              </span>
            </div>
          )}
        </div>
      )}

      {/* Notă editare */}
      <div className="flex items-start gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-xs text-zinc-500">
        <svg xmlns="http://www.w3.org/2000/svg" className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>
          Apasă <strong className="text-zinc-400">Editează</strong> pe orice rând pentru a
          modifica prețul sau stocul. Modificările sunt salvate imediat în baza de date.
          Simbolul <strong className="text-zinc-400">↗</strong> deschide pagina publică a produsului.
        </span>
      </div>

      {/* Tabel */}
      <AdminProductsTable products={products} />
    </div>
  );
}
