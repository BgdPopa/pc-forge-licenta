import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import {
  AdminOrdersTable,
  type AdminOrderRow,
} from "@/components/admin-orders-table";

export const metadata: Metadata = {
  title: "Comenzi — Admin PC Forge",
};

export default async function AdminOrdersPage() {
  const dbOrders = await prisma.order.findMany({
    include: {
      items: {
        select: {
          id: true,
          productName: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const orders: AdminOrderRow[] = dbOrders.map((o) => ({
    id: o.id,
    customerName: o.customerName,
    customerEmail: o.customerEmail,
    shippingAddress: o.shippingAddress,
    totalAmount: Number(o.totalAmount),
    status: o.status,
    createdAt: o.createdAt.toISOString(),
    items: o.items.map((i) => ({
      id: i.id,
      productName: i.productName,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      totalPrice: Number(i.totalPrice),
    })),
  }));

  // Statistici sumar
  const totalRevenue = orders.reduce((s, o) => s + o.totalAmount, 0);
  const byStatus = {
    PENDING: orders.filter((o) => o.status === "PENDING").length,
    CONFIRMED: orders.filter((o) => o.status === "CONFIRMED").length,
    CANCELLED: orders.filter((o) => o.status === "CANCELLED").length,
  };

  return (
    <div className="space-y-6">
      {/* Titlu */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Comenzi clienți</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {orders.length === 0
            ? "Nu există comenzi înregistrate."
            : `${orders.length} ${orders.length === 1 ? "comandă" : "comenzi"} — ${formatPrice(totalRevenue)} valoare totală.`}
        </p>
      </div>

      {/* Sumar pe statusuri */}
      {orders.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-xs">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-amber-400 font-medium">
              {byStatus.PENDING} în așteptare
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-emerald-900/40 bg-emerald-950/20 px-3 py-2 text-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-emerald-400 font-medium">
              {byStatus.CONFIRMED} confirmate
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs">
            <span className="h-2 w-2 rounded-full bg-zinc-600" />
            <span className="text-zinc-500 font-medium">
              {byStatus.CANCELLED} anulate
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs">
            <span className="text-zinc-400">Valoare totală:</span>
            <span className="font-bold text-zinc-100">{formatPrice(totalRevenue)}</span>
          </div>
        </div>
      )}

      {/* Notă navigare */}
      {orders.length > 0 && (
        <p className="text-xs text-zinc-600">
          Apasă pe o comandă pentru a vedea detaliile complete (produse comandate și date de livrare).
        </p>
      )}

      {/* Tabel */}
      <AdminOrdersTable orders={orders} />
    </div>
  );
}
