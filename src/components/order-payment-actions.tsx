"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OrderPaymentActions({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [action, setAction] = useState<"continue" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function continuePayment() {
    setAction("continue");
    setError(null);
    try {
      const response = await fetch(`/api/orders/${orderId}/checkout`, {
        method: "POST",
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error ?? "Plata nu a putut fi reluată.");
      }
      if (data?.status === "PAID") {
        router.refresh();
        return;
      }
      if (typeof data?.checkoutUrl !== "string") {
        throw new Error("Stripe nu a returnat o adresă de plată validă.");
      }
      window.location.assign(data.checkoutUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Plata nu a putut fi reluată.");
      setAction(null);
    }
  }

  async function cancelPayment() {
    setAction("cancel");
    setError(null);
    try {
      const response = await fetch("/api/checkout/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error ?? "Plata nu a putut fi anulată.");
      }
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Plata nu a putut fi anulată.");
      setAction(null);
    }
  }

  return (
    <div className="mt-5 rounded-lg border border-amber-900/40 bg-amber-950/20 p-4">
      <p className="text-sm text-amber-200">
        Plata de test nu este finalizată. Poți reveni la sesiunea Stripe sau o poți anula.
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={continuePayment}
          disabled={action !== null}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
        >
          {action === "continue" ? "Se deschide Stripe…" : "Continuă plata"}
        </button>
        <button
          type="button"
          onClick={cancelPayment}
          disabled={action !== null}
          className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:border-zinc-600 disabled:opacity-50"
        >
          {action === "cancel" ? "Se anulează…" : "Anulează plata"}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}
