"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";

export type AdminProductRow = {
  id: string;
  name: string;
  brand: string;
  slug: string;
  categoryName: string;
  categoryType: string;
  price: number;
  stock: number;
  isActive: boolean;
};

type EditState = {
  price: string;
  stock: string;
  saving: boolean;
  error: string | null;
};

export function AdminProductsTable({
  products: initialProducts,
}: {
  products: AdminProductRow[];
}) {
  const [products, setProducts] = useState(initialProducts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({
    price: "",
    stock: "",
    saving: false,
    error: null,
  });

  function startEdit(product: AdminProductRow) {
    setEditingId(product.id);
    setEditState({
      price: String(product.price),
      stock: String(product.stock),
      saving: false,
      error: null,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditState({ price: "", stock: "", saving: false, error: null });
  }

  async function saveEdit(productId: string) {
    const price = parseFloat(editState.price);
    const stock = parseInt(editState.stock, 10);

    if (isNaN(price) || price <= 0) {
      setEditState((s) => ({ ...s, error: "Prețul trebuie să fie un număr pozitiv." }));
      return;
    }
    if (isNaN(stock) || stock < 0) {
      setEditState((s) => ({ ...s, error: "Stocul trebuie să fie un număr întreg ≥ 0." }));
      return;
    }

    setEditState((s) => ({ ...s, saving: true, error: null }));

    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price, stock }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Eroare necunoscută");
      }

      const updated = await res.json();
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, price: updated.price, stock: updated.stock } : p,
        ),
      );
      cancelEdit();
    } catch (err) {
      setEditState((s) => ({
        ...s,
        saving: false,
        error: err instanceof Error ? err.message : "Salvarea a eșuat.",
      }));
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full text-sm">
        <thead className="border-b border-zinc-800 bg-zinc-900/80">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Produs
            </th>
            <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 md:table-cell">
              Categorie
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Preț (RON)
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Stoc
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Status
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Acțiuni
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-zinc-800 bg-zinc-900">
          {products.map((product) => {
            const isEditing = editingId === product.id;

            return (
              <tr
                key={product.id}
                className={`transition-colors ${isEditing ? "bg-zinc-800/60" : "hover:bg-zinc-800/30"}`}
              >
                {/* Produs */}
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-100">{product.name}</p>
                  <p className="text-xs text-zinc-500">{product.brand}</p>
                </td>

                {/* Categorie */}
                <td className="hidden px-4 py-3 text-zinc-400 md:table-cell">
                  {product.categoryName}
                </td>

                {/* Preț — editabil */}
                <td className="px-4 py-3 text-right">
                  {isEditing ? (
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={editState.price}
                      onChange={(e) =>
                        setEditState((s) => ({ ...s, price: e.target.value }))
                      }
                      className="w-24 rounded border border-zinc-600 bg-zinc-950 px-2 py-1 text-right text-sm text-zinc-100 focus:border-red-600 focus:outline-none"
                    />
                  ) : (
                    <span className="font-semibold text-zinc-100">
                      {formatPrice(product.price)}
                    </span>
                  )}
                </td>

                {/* Stoc — editabil */}
                <td className="px-4 py-3 text-right">
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={editState.stock}
                      onChange={(e) =>
                        setEditState((s) => ({ ...s, stock: e.target.value }))
                      }
                      className="w-20 rounded border border-zinc-600 bg-zinc-950 px-2 py-1 text-right text-sm text-zinc-100 focus:border-red-600 focus:outline-none"
                    />
                  ) : (
                    <span
                      className={`font-semibold ${
                        product.stock === 0
                          ? "text-red-400"
                          : product.stock <= 5
                            ? "text-amber-400"
                            : "text-zinc-100"
                      }`}
                    >
                      {product.stock}
                    </span>
                  )}
                </td>

                {/* Status stoc */}
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      product.stock === 0
                        ? "bg-red-950/50 text-red-400"
                        : product.stock <= 5
                          ? "bg-amber-950/50 text-amber-400"
                          : "bg-emerald-950/40 text-emerald-400"
                    }`}
                  >
                    {product.stock === 0
                      ? "Epuizat"
                      : product.stock <= 5
                        ? "Stoc mic"
                        : "În stoc"}
                  </span>
                </td>

                {/* Acțiuni */}
                <td className="px-4 py-3 text-right">
                  {isEditing ? (
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => saveEdit(product.id)}
                          disabled={editState.saving}
                          className="rounded bg-red-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-60"
                        >
                          {editState.saving ? "…" : "Salvează"}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={editState.saving}
                          className="text-xs text-zinc-500 hover:text-zinc-300"
                        >
                          Anulează
                        </button>
                      </div>
                      {editState.error && (
                        <p className="text-[11px] text-red-400">{editState.error}</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => startEdit(product)}
                        className="text-xs text-zinc-500 transition-colors hover:text-zinc-200"
                      >
                        Editează
                      </button>
                      <Link
                        href={`/catalog/${product.slug}`}
                        target="_blank"
                        className="text-xs text-zinc-500 transition-colors hover:text-red-400"
                        title="Deschide pagina publică"
                      >
                        ↗
                      </Link>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
