"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ProductForm = {
  id: string;
  name: string;
  brand: string;
  categoryId: string;
  price: number;
  stock: number;
  shortDescription: string | null;
  description: string;
  imageUrl: string | null;
  isActive: boolean;
  specifications: string;
};

export function AdminProductEditor({
  product,
  categories,
}: {
  product: ProductForm;
  categories: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    ...product,
    price: String(product.price),
    stock: String(product.stock),
    shortDescription: product.shortDescription ?? "",
    imageUrl: product.imageUrl ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update(key: keyof typeof form, value: string | boolean) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    let specifications: Record<string, unknown>;
    try {
      const parsed = JSON.parse(form.specifications || "{}");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
      specifications = parsed;
    } catch {
      setError("Specificațiile trebuie să fie un obiect JSON valid.");
      setSaving(false);
      return;
    }

    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          brand: form.brand,
          categoryId: form.categoryId,
          price: Number(form.price),
          stock: Number(form.stock),
          shortDescription: form.shortDescription,
          description: form.description,
          imageUrl: form.imageUrl,
          isActive: form.isActive,
          specifications,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Salvarea a eșuat.");
      setMessage("Produsul a fost actualizat.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Salvarea a eșuat.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-red-600 focus:outline-none";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/admin/products" className="text-xs font-medium text-red-500 hover:text-red-400">← Înapoi la produse</Link>
          <h1 className="mt-2 text-2xl font-bold text-zinc-100">Editare produs</h1>
          <p className="mt-1 text-sm text-zinc-500">Actualizează datele comerciale și tehnice folosite în catalog, scoring și configurator.</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${form.isActive ? "bg-emerald-950/40 text-emerald-400" : "bg-zinc-800 text-zinc-500"}`}>
          {form.isActive ? "Activ" : "Inactiv"}
        </span>
      </div>

      <form onSubmit={save} className="space-y-6">
        <section className="grid gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5 sm:grid-cols-2">
          <label className="text-sm text-zinc-300">Nume<input required value={form.name} onChange={(e) => update("name", e.target.value)} className={inputClass} /></label>
          <label className="text-sm text-zinc-300">Brand<input required value={form.brand} onChange={(e) => update("brand", e.target.value)} className={inputClass} /></label>
          <label className="text-sm text-zinc-300">Categorie<select required value={form.categoryId} onChange={(e) => update("categoryId", e.target.value)} className={inputClass}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-zinc-300">Preț<input required type="number" min="0.01" step="0.01" value={form.price} onChange={(e) => update("price", e.target.value)} className={inputClass} /></label>
            <label className="text-sm text-zinc-300">Stoc<input required type="number" min="0" step="1" value={form.stock} onChange={(e) => update("stock", e.target.value)} className={inputClass} /></label>
          </div>
          <label className="text-sm text-zinc-300 sm:col-span-2">Descriere scurtă<input value={form.shortDescription} onChange={(e) => update("shortDescription", e.target.value)} className={inputClass} /></label>
          <label className="text-sm text-zinc-300 sm:col-span-2">Descriere completă<textarea required rows={5} value={form.description} onChange={(e) => update("description", e.target.value)} className={inputClass} /></label>
          <label className="text-sm text-zinc-300 sm:col-span-2">URL imagine<input type="url" value={form.imageUrl} onChange={(e) => update("imageUrl", e.target.value)} className={inputClass} /></label>
          <label className="flex items-center gap-3 text-sm text-zinc-300 sm:col-span-2">
            <input type="checkbox" checked={form.isActive} onChange={(e) => update("isActive", e.target.checked)} className="h-4 w-4 accent-red-600" />
            Produs vizibil în catalog
          </label>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <label className="text-sm font-medium text-zinc-300">Specificații tehnice JSON</label>
          <p className="mt-1 text-xs text-zinc-500">Câmpurile socket, ramType, formFactor, interfaceType, tdpWatts, powerWatts și dimensiunile sunt sincronizate automat cu motorul CSP.</p>
          <textarea value={form.specifications} onChange={(e) => update("specifications", e.target.value)} rows={16} spellCheck={false} className={`${inputClass} font-mono text-xs`} />
        </section>

        {error && <p className="rounded-md border border-red-900/40 bg-red-950/20 px-3 py-2 text-sm text-red-400">{error}</p>}
        {message && <p className="rounded-md border border-emerald-900/40 bg-emerald-950/20 px-3 py-2 text-sm text-emerald-400">{message}</p>}
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="rounded-md bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50">{saving ? "Se salvează…" : "Salvează modificările"}</button>
          <Link href="/admin/products" className="rounded-md border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 hover:border-zinc-600">Anulează</Link>
        </div>
      </form>
    </div>
  );
}
