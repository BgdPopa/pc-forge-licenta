"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Props = {
  productId: string;
  inStock: boolean;
};

export function AddToCartButton({ productId, inStock }: Props) {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }

    setLoading(true);
    setAdded(false);
    setError(null);

    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity: 1 }),
    });

    setLoading(false);

    if (res.ok) {
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
      router.refresh();
      return;
    }

    const data = await res.json().catch(() => null);
    setError(data?.error ?? "Nu s-a putut adăuga produsul în coș.");
  }

  if (!inStock) {
    return (
      <button
        type="button"
        disabled
        aria-disabled="true"
        className="mt-6 w-full cursor-not-allowed rounded-md bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-500"
      >
        Stoc epuizat
      </button>
    );
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || status === "loading"}
        className="w-full rounded-md bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
      >
        {loading ? "Se adaugă..." : added ? "Adăugat în coș!" : "Adaugă în coș"}
      </button>
      {error && (
        <p className="mt-2 rounded-md bg-red-950 px-3 py-2 text-center text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
