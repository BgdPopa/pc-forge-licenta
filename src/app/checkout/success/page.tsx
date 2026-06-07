import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { formatPrice } from "@/lib/format";

type PageProps = {
  searchParams: { orderId?: string };
};

export default async function CheckoutSuccessPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const orderId = searchParams.orderId;
  if (!orderId) {
    notFound();
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  // Verificare ownership: comanda trebuie să aparțină utilizatorului curent.
  if (!order || order.userId !== session.user.id) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteHeader />

      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-6 text-center">
          <h1 className="text-2xl font-bold text-emerald-400">
            Comandă înregistrată
          </h1>
          <p className="mt-2 text-sm text-zinc-300">
            Comanda ta a fost plasată cu succes. Plata este simulată — nu s-a
            procesat nicio tranzacție reală.
          </p>
          <p className="mt-3 text-xs text-zinc-500">
            Număr comandă: <span className="font-mono text-zinc-400">{order.id}</span>
          </p>
        </div>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold">Detalii comandă</h2>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">Status</dt>
              <dd className="font-medium text-amber-400">{order.status}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Client</dt>
              <dd className="text-zinc-200">{order.customerName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Email</dt>
              <dd className="text-zinc-200">{order.customerEmail}</dd>
            </div>
            <div className="flex justify-between gap-6">
              <dt className="text-zinc-500">Adresă livrare</dt>
              <dd className="text-right text-zinc-200">{order.shippingAddress}</dd>
            </div>
          </dl>

          <ul className="mt-6 space-y-3 border-t border-zinc-800 pt-4">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3 text-sm">
                <span className="min-w-0 text-zinc-400">
                  {item.productName}
                  <span className="text-zinc-600"> × {item.quantity}</span>
                </span>
                <span className="whitespace-nowrap font-medium text-zinc-200">
                  {formatPrice(Number(item.totalPrice))}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex justify-between border-t border-zinc-800 pt-4 font-bold text-zinc-100">
            <span>Total</span>
            <span>{formatPrice(Number(order.totalAmount))}</span>
          </div>
        </section>

        <div className="mt-8 text-center">
          <Link
            href="/catalog"
            className="text-sm font-medium text-red-500 hover:text-red-400"
          >
            ← Continuă cumpărăturile
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
