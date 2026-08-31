"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const LABELS: Record<string, string> = {
  PENDING: "Confirmare în curs",
  PAID: "Plată confirmată",
  FAILED: "Plată eșuată",
  CANCELLED: "Plată anulată",
};

export function PaymentStatus({ orderId, initialStatus }: { orderId: string; initialStatus: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    if (status !== "PENDING") return;
    let attempts = 0;
    const timer = window.setInterval(async () => {
      attempts += 1;
      const response = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        setStatus(data.paymentStatus);
        if (data.paymentStatus !== "PENDING") {
          window.clearInterval(timer);
          router.refresh();
        }
      }
      if (attempts >= 10) window.clearInterval(timer);
    }, 1500);
    return () => window.clearInterval(timer);
  }, [orderId, router, status]);

  const color =
    status === "PAID"
      ? "text-emerald-400"
      : status === "PENDING"
        ? "text-amber-400"
        : "text-red-400";

  return <span className={`font-medium ${color}`}>{LABELS[status] ?? status}</span>;
}
