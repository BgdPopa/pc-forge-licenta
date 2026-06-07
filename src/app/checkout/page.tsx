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
  name: string;
  brand: string;
  price: number;
  quantity: number;
  subtotal: number;
};

type CartData = {
  items: CartItem[];
  total: number;
};

export default function CheckoutPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCart = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/cart");
    if (res.ok) {
      setCart(await res.json());
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: formData.get("customerName"),
        customerEmail: formData.get("customerEmail"),
        shippingAddress: formData.get("shippingAddress"),
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setError(data?.error ?? "Comanda nu a putut fi plasată.");
      setSubmitting(false);
      return;
    }

    router.push(`/checkout/success?orderId=${data.orderId}`);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="mb-8 text-3xl font-bold tracking-tight">
          Finalizează comanda
        </h1>

        {loading && <p className="text-zinc-400">Se încarcă...</p>}

        {!loading && cart && cart.items.length === 0 && (
          <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/40 p-12 text-center">
            <p className="text-zinc-400">
              Coșul tău este gol, nu poți plasa o comandă.
            </p>
            <Link
              href="/catalog"
              className="mt-4 inline-block text-sm font-medium text-red-500 hover:text-red-400"
            >
              Explorează catalogul
            </Link>
          </div>
        )}

        {!loading && cart && cart.items.length > 0 && (
          <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            {/* Formular date livrare */}
            <form
              onSubmit={handleSubmit}
              className="space-y-5 rounded-lg border border-zinc-800 bg-zinc-900 p-6"
            >
              <h2 className="text-lg font-semibold">Date de livrare</h2>

              <div>
                <label
                  htmlFor="customerName"
                  className="block text-sm font-medium text-zinc-300"
                >
                  Nume complet
                </label>
                <input
                  id="customerName"
                  name="customerName"
                  type="text"
                  required
                  defaultValue={session?.user?.name ?? ""}
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-red-600 focus:outline-none"
                  placeholder="Numele tău"
                />
              </div>

              <div>
                <label
                  htmlFor="customerEmail"
                  className="block text-sm font-medium text-zinc-300"
                >
                  Email
                </label>
                <input
                  id="customerEmail"
                  name="customerEmail"
                  type="email"
                  required
                  defaultValue={session?.user?.email ?? ""}
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-red-600 focus:outline-none"
                  placeholder="exemplu@email.com"
                />
              </div>

              <div>
                <label
                  htmlFor="shippingAddress"
                  className="block text-sm font-medium text-zinc-300"
                >
                  Adresă de livrare
                </label>
                <textarea
                  id="shippingAddress"
                  name="shippingAddress"
                  required
                  rows={3}
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-red-600 focus:outline-none"
                  placeholder="Stradă, număr, oraș, județ, cod poștal"
                />
              </div>

              {error && (
                <p className="rounded-md bg-red-950 px-3 py-2 text-sm text-red-400">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
              >
                {submitting ? "Se plasează comanda..." : "Plasează comanda"}
              </button>

              <p className="text-center text-xs text-zinc-600">
                Plata este simulată. Nu se procesează nicio tranzacție reală.
              </p>
            </form>

            {/* Sumar comandă */}
            <aside className="h-fit rounded-lg border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="mb-4 text-lg font-semibold">Sumar comandă</h2>
              <ul className="space-y-3">
                {cart.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-3 text-sm">
                    <span className="min-w-0 text-zinc-400">
                      {item.name}
                      <span className="text-zinc-600"> × {item.quantity}</span>
                    </span>
                    <span className="whitespace-nowrap font-medium text-zinc-200">
                      {formatPrice(item.subtotal)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex justify-between border-t border-zinc-800 pt-4 font-bold text-zinc-100">
                <span>Total</span>
                <span>{formatPrice(cart.total)}</span>
              </div>
            </aside>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
