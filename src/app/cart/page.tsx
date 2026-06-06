"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { formatPrice } from "@/lib/format";

type CartItem = {
  id: string;
  productId: string;
  name: string;
  brand: string;
  slug: string;
  price: number;
  quantity: number;
  stock: number;
  subtotal: number;
  inStock: boolean;
};

type CartData = {
  items: CartItem[];
  total: number;
};

export default function CartPage() {
  const { status } = useSession();
  const router = useRouter();
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCart = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/cart");
    if (res.ok) {
      const data = await res.json();
      setCart(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    if (status === "authenticated") {
      fetchCart();
    }
  }, [status, router, fetchCart]);

  async function updateQuantity(itemId: string, quantity: number) {
    setError(null);
    const res = await fetch(`/api/cart/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Nu s-a putut actualiza cantitatea.");
    }
    fetchCart();
  }

  async function removeItem(itemId: string) {
    setError(null);
    await fetch(`/api/cart/${itemId}`, { method: "DELETE" });
    fetchCart();
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="mb-8 text-3xl font-bold tracking-tight">Coșul meu</h1>

        {loading && <p className="text-zinc-400">Se încarcă coșul...</p>}

        {error && (
          <p className="mb-6 rounded-md bg-red-950 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        {!loading && cart?.items.length === 0 && (
          <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/40 p-12 text-center">
            <p className="text-zinc-400">Coșul tău este gol.</p>
            <Link
              href="/catalog"
              className="mt-4 inline-block text-sm font-medium text-red-500 hover:text-red-400"
            >
              Explorează catalogul
            </Link>
          </div>
        )}

        {!loading && cart && cart.items.length > 0 && (
          <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
            <ul className="space-y-4">
              {cart.items.map((item) => (
                <li
                  key={item.id}
                  className="flex gap-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/catalog/${item.slug}`}
                      className="font-semibold text-zinc-100 transition-colors hover:text-red-500"
                    >
                      {item.name}
                    </Link>
                    <p className="mt-0.5 text-sm text-zinc-500">{item.brand}</p>
                    <p className="mt-1 text-sm font-medium text-zinc-300">
                      {formatPrice(item.price)} / buc.
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <p className="font-bold text-zinc-100">
                      {formatPrice(item.subtotal)}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="rounded border border-zinc-700 px-2 py-0.5 text-sm text-zinc-300 hover:border-red-600 disabled:opacity-30"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={item.quantity >= item.stock}
                        className="rounded border border-zinc-700 px-2 py-0.5 text-sm text-zinc-300 hover:border-red-600 disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-xs text-zinc-600 transition-colors hover:text-red-500"
                    >
                      Elimină
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <aside className="h-fit rounded-lg border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="mb-4 text-lg font-semibold">Sumar comandă</h2>
              <div className="mb-2 flex justify-between text-sm text-zinc-400">
                <span>Produse ({cart.items.length})</span>
                <span>{formatPrice(cart.total)}</span>
              </div>
              <div className="mt-3 flex justify-between border-t border-zinc-800 pt-3 font-bold text-zinc-100">
                <span>Total</span>
                <span>{formatPrice(cart.total)}</span>
              </div>
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="mt-6 w-full cursor-not-allowed rounded-md bg-zinc-800 px-4 py-3 text-center text-sm font-semibold text-zinc-500"
              >
                Finalizează comanda
              </button>
              <p className="mt-2 text-center text-xs text-zinc-600">
                Finalizarea comenzii va fi disponibilă într-o etapă viitoare.
              </p>
            </aside>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
