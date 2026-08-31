"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function CheckoutCancelClient({ orderId }: { orderId: string }) {
  const [state, setState] = useState<"loading" | "done" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError("Identificatorul comenzii lipsește.");
      setState("error");
      return;
    }

    const controller = new AbortController();
    fetch("/api/checkout/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Anularea a eșuat.");
        setState("done");
      })
      .catch((caught) => {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError(caught instanceof Error ? caught.message : "Anularea a eșuat.");
        setState("error");
      });

    return () => controller.abort();
  }, [orderId]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
      <h1 className="text-2xl font-bold text-zinc-100">
        {state === "loading" ? "Se anulează plata…" : state === "done" ? "Plată anulată" : "Anularea nu a fost finalizată"}
      </h1>
      <p className={`mt-3 text-sm ${state === "error" ? "text-red-400" : "text-zinc-400"}`}>
        {state === "loading"
          ? "Restaurăm stocul rezervat și produsele din coș."
          : state === "done"
            ? "Nu a fost procesată nicio plată. Produsele au fost restaurate în coș."
            : error}
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/cart" className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500">Înapoi la coș</Link>
        <Link href="/orders" className="rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-600">Comenzile mele</Link>
      </div>
    </div>
  );
}
