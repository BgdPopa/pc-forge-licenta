import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = {
  title: "Panou administrare — PC Forge",
};

export default async function AdminDashboardPage() {
  const [
    totalProducts,
    outOfStockProducts,
    totalOrders,
    totalUsers,
    totalConfigurations,
    ordersAggregate,
    recentOrders,
  ] = await Promise.all([
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.count({ where: { isActive: true, stock: 0 } }),
    prisma.order.count(),
    prisma.user.count(),
    prisma.configuration.count(),
    prisma.order.aggregate({ _sum: { totalAmount: true } }),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  const totalRevenue = Number(ordersAggregate._sum.totalAmount ?? 0);

  const stats = [
    {
      label: "Produse active",
      value: totalProducts,
      note: outOfStockProducts > 0 ? `${outOfStockProducts} fără stoc` : "Toate disponibile",
      noteColor: outOfStockProducts > 0 ? "text-amber-400" : "text-emerald-400",
      href: "/admin/products",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      label: "Comenzi plasate",
      value: totalOrders,
      note: totalRevenue > 0 ? formatPrice(totalRevenue) + " total" : "Nicio vânzare",
      noteColor: "text-zinc-400",
      href: "/admin/orders",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      label: "Utilizatori înregistrați",
      value: totalUsers,
      note: "Conturi active",
      noteColor: "text-zinc-400",
      href: null,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      label: "Configurații salvate",
      value: totalConfigurations,
      note: "Configurații CSP",
      noteColor: "text-zinc-400",
      href: null,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
        </svg>
      ),
    },
    {
      label: "Produse fără stoc",
      value: outOfStockProducts,
      note: outOfStockProducts === 0 ? "Stoc complet" : "Necesită reaprovizionare",
      noteColor: outOfStockProducts === 0 ? "text-emerald-400" : "text-red-400",
      href: "/admin/products",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      ),
    },
  ];

  const statusLabels: Record<string, string> = {
    PENDING: "În așteptare",
    CONFIRMED: "Confirmată",
    CANCELLED: "Anulată",
  };
  const statusColors: Record<string, string> = {
    PENDING: "text-amber-400 bg-amber-950/40",
    CONFIRMED: "text-emerald-400 bg-emerald-950/40",
    CANCELLED: "text-zinc-500 bg-zinc-800",
  };

  return (
    <div className="space-y-8">
      {/* Titlu */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Panou administrare
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Monitorizare generală pentru catalog, comenzi și utilizatori.
        </p>
      </div>

      {/* Carduri statistici */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat) => {
          const card = (
            <div
              className={`rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition-colors ${
                stat.href ? "hover:border-zinc-700" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="text-red-600/70">{stat.icon}</span>
                {stat.href && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
              <p className="mt-3 text-3xl font-bold text-zinc-100">{stat.value}</p>
              <p className="mt-1 text-sm font-medium text-zinc-400">{stat.label}</p>
              <p className={`mt-1 text-xs ${stat.noteColor}`}>{stat.note}</p>
            </div>
          );

          return stat.href ? (
            <Link key={stat.label} href={stat.href}>
              {card}
            </Link>
          ) : (
            <div key={stat.label}>{card}</div>
          );
        })}
      </div>

      {/* Comenzi recente */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-100">Comenzi recente</h2>
          <Link
            href="/admin/orders"
            className="text-xs font-medium text-red-500 hover:text-red-400"
          >
            Toate comenzile →
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 py-10 text-center">
            <p className="text-sm text-zinc-500">Nu există comenzi încă.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-900/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Utilizator</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Data</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 bg-zinc-900">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-zinc-800/40">
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-200">{order.customerName}</p>
                      <p className="text-xs text-zinc-500">{order.customerEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {new Date(order.createdAt).toLocaleDateString("ro-RO")}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-zinc-100">
                      {formatPrice(Number(order.totalAmount))}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusColors[order.status] ?? "text-zinc-500 bg-zinc-800"}`}>
                        {statusLabels[order.status] ?? order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Link-uri rapide */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/products"
          className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-zinc-700"
        >
          <div>
            <p className="font-medium text-zinc-200">Gestionează produse</p>
            <p className="mt-0.5 text-xs text-zinc-500">Editează prețuri și stocuri</p>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
        <Link
          href="/admin/orders"
          className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-zinc-700"
        >
          <div>
            <p className="font-medium text-zinc-200">Vizualizează comenzi</p>
            <p className="mt-0.5 text-xs text-zinc-500">Listă completă comenzi clienți</p>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
