"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/format";

export type AdminOrderRow = {
  id: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "În așteptare",
  CONFIRMED: "Confirmată",
  CANCELLED: "Anulată",
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-950/50 text-amber-400 border-amber-900/40",
  CONFIRMED: "bg-emerald-950/40 text-emerald-400 border-emerald-900/40",
  CANCELLED: "bg-zinc-800 text-zinc-500 border-zinc-700",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminOrdersTable({ orders }: { orders: AdminOrderRow[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 py-16 text-center">
        <p className="text-sm text-zinc-500">Nu există comenzi înregistrate.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800">
      <table className="w-full text-sm">
        <thead className="border-b border-zinc-800 bg-zinc-900/80">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Client
            </th>
            <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 sm:table-cell">
              Data
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Produse
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Total
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Status
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Detalii
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-zinc-800 bg-zinc-900">
          {orders.map((order) => {
            const isExpanded = expandedId === order.id;
            const statusStyle = STATUS_STYLES[order.status] ?? STATUS_STYLES["PENDING"];

            return (
              <>
                <tr
                  key={order.id}
                  className="cursor-pointer transition-colors hover:bg-zinc-800/30"
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-100">{order.customerName}</p>
                    <p className="text-xs text-zinc-500">{order.customerEmail}</p>
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-zinc-400 sm:table-cell">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-300">
                      {order.items.reduce((s, i) => s + i.quantity, 0)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-zinc-100">
                    {formatPrice(order.totalAmount)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusStyle}`}
                    >
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`inline-block h-4 w-4 text-zinc-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </td>
                </tr>

                {/* Rând expandat cu detalii */}
                {isExpanded && (
                  <tr key={`${order.id}-details`} className="bg-zinc-950/60">
                    <td colSpan={6} className="px-4 pb-4 pt-3">
                      <div className="grid gap-4 sm:grid-cols-[1fr_260px]">
                        {/* Produse */}
                        <div>
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                            Produse comandate
                          </p>
                          <div className="space-y-1.5">
                            {order.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-3 py-2 text-xs"
                              >
                                <span className="text-zinc-300">{item.productName}</span>
                                <span className="ml-4 shrink-0 text-zinc-500">
                                  {item.quantity} × {formatPrice(item.unitPrice)}
                                  {" = "}
                                  <span className="font-semibold text-zinc-300">
                                    {formatPrice(item.totalPrice)}
                                  </span>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Date livrare */}
                        <div>
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                            Date livrare
                          </p>
                          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-xs text-zinc-400 space-y-1">
                            <p><span className="text-zinc-600">Nume:</span> {order.customerName}</p>
                            <p><span className="text-zinc-600">Email:</span> {order.customerEmail}</p>
                            <p><span className="text-zinc-600">Adresă:</span> {order.shippingAddress}</p>
                            <p className="pt-1 font-semibold text-zinc-300">
                              Total: {formatPrice(order.totalAmount)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
