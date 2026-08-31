"use client";

import { useMemo, useState } from "react";
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

export type AdminCategoryOption = {
  id: string;
  name: string;
  type: string;
};

type EditState = {
  price: string;
  stock: string;
  saving: boolean;
  error: string | null;
};

type CreateState = {
  name: string;
  brand: string;
  categoryId: string;
  price: string;
  stock: string;
  shortDescription: string;
  description: string;
  imageUrl: string;
  specifications: string;
};

const EMPTY_CREATE_STATE: CreateState = {
  name: "",
  brand: "",
  categoryId: "",
  price: "",
  stock: "0",
  shortDescription: "",
  description: "",
  imageUrl: "",
  specifications: "{}",
};

export function AdminProductsTable({
  products: initialProducts,
  categories,
}: {
  products: AdminProductRow[];
  categories: AdminCategoryOption[];
}) {
  const [products, setProducts] = useState(initialProducts);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [createState, setCreateState] = useState<CreateState>(EMPTY_CREATE_STATE);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({
    price: "",
    stock: "",
    saving: false,
    error: null,
  });

  const visibleProducts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesQuery =
        !needle ||
        product.name.toLowerCase().includes(needle) ||
        product.brand.toLowerCase().includes(needle) ||
        product.slug.toLowerCase().includes(needle);
      const matchesCategory =
        categoryFilter === "ALL" || product.categoryType === categoryFilter;
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && product.isActive) ||
        (statusFilter === "INACTIVE" && !product.isActive) ||
        (statusFilter === "OUT" && product.stock === 0) ||
        (statusFilter === "LOW" && product.stock > 0 && product.stock <= 5);
      return matchesQuery && matchesCategory && matchesStatus;
    });
  }, [categoryFilter, products, query, statusFilter]);

  function updateCreateField<K extends keyof CreateState>(key: K, value: CreateState[K]) {
    setCreateState((current) => ({ ...current, [key]: value }));
  }

  async function createProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setCreateError(null);

    let specifications: Record<string, unknown>;
    try {
      const parsed = JSON.parse(createState.specifications || "{}");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error();
      }
      specifications = parsed;
    } catch {
      setCreateError("Specificațiile trebuie să fie un obiect JSON valid.");
      setCreating(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createState,
          price: Number(createState.price),
          stock: Number(createState.stock),
          specifications,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Adăugarea a eșuat.");
      setProducts((current) => [data, ...current]);
      setCreateState(EMPTY_CREATE_STATE);
      setShowCreate(false);
    } catch (caught) {
      setCreateError(caught instanceof Error ? caught.message : "Adăugarea a eșuat.");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(product: AdminProductRow) {
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !product.isActive }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Actualizarea a eșuat.");
      setProducts((current) =>
        current.map((entry) =>
          entry.id === product.id ? { ...entry, isActive: data.isActive } : entry,
        ),
      );
    } catch (caught) {
      setEditState((state) => ({
        ...state,
        error: caught instanceof Error ? caught.message : "Actualizarea a eșuat.",
      }));
    }
  }

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
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 lg:flex-row">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Caută nume, brand sau slug"
          className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-red-600 focus:outline-none"
        />
        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-red-600 focus:outline-none"
        >
          <option value="ALL">Toate categoriile</option>
          {categories.map((category) => (
            <option key={category.id} value={category.type}>{category.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-red-600 focus:outline-none"
        >
          <option value="ALL">Toate statusurile</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="LOW">Stoc mic</option>
          <option value="OUT">Fără stoc</option>
        </select>
        <button
          type="button"
          onClick={() => setShowCreate((value) => !value)}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
        >
          {showCreate ? "Închide formularul" : "+ Adaugă produs"}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={createProduct} className="space-y-4 rounded-xl border border-red-900/30 bg-zinc-900 p-5">
          <div>
            <h2 className="font-semibold text-zinc-100">Produs nou</h2>
            <p className="mt-1 text-xs text-zinc-500">Slugul este generat automat, iar produsul devine activ imediat.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <input required minLength={2} maxLength={160} value={createState.name} onChange={(e) => updateCreateField("name", e.target.value)} placeholder="Nume produs" className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-red-600 focus:outline-none" />
            <input required maxLength={80} value={createState.brand} onChange={(e) => updateCreateField("brand", e.target.value)} placeholder="Brand" className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-red-600 focus:outline-none" />
            <select required value={createState.categoryId} onChange={(e) => updateCreateField("categoryId", e.target.value)} className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-red-600 focus:outline-none">
              <option value="">Selectează categoria</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <input required type="number" min="0.01" step="0.01" value={createState.price} onChange={(e) => updateCreateField("price", e.target.value)} placeholder="Preț (RON)" className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-red-600 focus:outline-none" />
            <input required type="number" min="0" step="1" value={createState.stock} onChange={(e) => updateCreateField("stock", e.target.value)} placeholder="Stoc" className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-red-600 focus:outline-none" />
            <input value={createState.shortDescription} onChange={(e) => updateCreateField("shortDescription", e.target.value)} placeholder="Descriere scurtă" className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-red-600 focus:outline-none lg:col-span-2" />
            <input type="url" value={createState.imageUrl} onChange={(e) => updateCreateField("imageUrl", e.target.value)} placeholder="URL imagine (opțional)" className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-red-600 focus:outline-none" />
            <textarea required value={createState.description} onChange={(e) => updateCreateField("description", e.target.value)} placeholder="Descriere completă" rows={4} className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-red-600 focus:outline-none sm:col-span-2" />
            <textarea value={createState.specifications} onChange={(e) => updateCreateField("specifications", e.target.value)} placeholder='{"cores": 8, "boostClock": 5.4}' rows={4} spellCheck={false} className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100 focus:border-red-600 focus:outline-none sm:col-span-2" />
          </div>
          {createError && <p className="text-sm text-red-400">{createError}</p>}
          <button type="submit" disabled={creating} className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50">
            {creating ? "Se adaugă…" : "Adaugă în catalog"}
          </button>
        </form>
      )}

      {editState.error && editingId === null && <p className="rounded-md border border-red-900/40 bg-red-950/20 px-3 py-2 text-sm text-red-400">{editState.error}</p>}

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
          {visibleProducts.map((product) => {
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
                  {!product.isActive ? (
                    <span className="inline-block rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] font-semibold text-zinc-500">
                      Inactiv
                    </span>
                  ) : (
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
                  )}
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
                        href={`/admin/products/${product.id}`}
                        className="text-xs text-zinc-500 transition-colors hover:text-red-400"
                      >
                        Detalii
                      </Link>
                      <button
                        type="button"
                        onClick={() => toggleActive(product)}
                        className={`text-xs transition-colors ${product.isActive ? "text-zinc-500 hover:text-red-400" : "text-emerald-500 hover:text-emerald-400"}`}
                      >
                        {product.isActive ? "Dezactivează" : "Activează"}
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
      {visibleProducts.length === 0 && <p className="bg-zinc-900 py-10 text-center text-sm text-zinc-500">Niciun produs nu corespunde filtrelor.</p>}
      </div>
    </div>
  );
}
