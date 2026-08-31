"use client";

import { Fragment, useMemo, useState } from "react";
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

export function AdminOrdersTable({ orders: initialOrders }: { orders: AdminOrderRow[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visibleOrders = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesQuery =
        !needle ||
        order.id.toLowerCase().includes(needle) ||
        order.customerName.toLowerCase().includes(needle) ||
        order.customerEmail.toLowerCase().includes(needle);
      return matchesQuery && (statusFilter === "ALL" || order.status === statusFilter);
    });
  }, [orders, query, statusFilter]);

  async function changeStatus(order: AdminOrderRow, status: string) {
    if (status === order.status) return;
    setSavingId(order.id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Actualizarea a eșuat.");
      setOrders((current) =>
        current.map((entry) =>
          entry.id === order.id ? { ...entry, status: data.status } : entry,
        ),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Actualizarea a eșuat.");
    } finally {
      setSavingId(null);
    }
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 py-16 text-center">
        <p className="text-sm text-zinc-500">Nu există comenzi înregistrate.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 sm:flex-row">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Caută client, email sau ID comandă"
          className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-red-600 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-red-600 focus:outline-none"
        >
          <option value="ALL">Toate statusurile</option>
          <option value="PENDING">În așteptare</option>
          <option value="CONFIRMED">Confirmate</option>
          <option value="CANCELLED">Anulate</option>
        </select>
      </div>
      {error && <p className="rounded-md border border-red-900/40 bg-red-950/20 px-3 py-2 text-sm text-red-400">{error}</p>}
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
          {visibleOrders.map((order) => {
            const isExpanded = expandedId === order.id;
            const statusStyle = STATUS_STYLES[order.status] ?? STATUS_STYLES["PENDING"];

            return (
              <Fragment key={order.id}>
                <tr
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
                    <select
                      value={order.status}
                      disabled={savingId === order.id || order.status === "CANCELLED"}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => changeStatus(order, event.target.value)}
                      aria-label={`Status comandă ${order.id}`}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold focus:outline-none disabled:cursor-not-allowed ${statusStyle}`}
                    >
                      <option value="PENDING">{STATUS_LABELS.PENDING}</option>
                      <option value="CONFIRMED">{STATUS_LABELS.CONFIRMED}</option>
                      <option value="CANCELLED">{STATUS_LABELS.CANCELLED}</option>
                    </select>
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
                  <tr className="bg-zinc-950/60">
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
              </Fragment>
            );
          })}
        </tbody>
      </table>
      {visibleOrders.length === 0 && <p className="bg-zinc-900 py-10 text-center text-sm text-zinc-500">Nicio comandă nu corespunde filtrelor.</p>}
      </div>
    </div>
  );
}
