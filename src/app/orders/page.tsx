import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProductVisual } from "@/components/product-visual";

export const metadata = { title: "Comenzile mele — PC Forge" };

const ORDER_LABELS: Record<string, string> = {
  PENDING: "În așteptare",
  CONFIRMED: "Confirmată",
  CANCELLED: "Anulată",
};
const PAYMENT_LABELS: Record<string, string> = {
  PENDING: "Plată în curs",
  PAID: "Plătită",
  FAILED: "Plată eșuată",
  CANCELLED: "Plată anulată",
};

export default async function OrdersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/orders");

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    include: {
      items: {
        take: 3,
        include: { product: { select: { slug: true, imageUrl: true, categoryType: true } } },
      },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Comenzile mele</h1>
          <p className="mt-2 text-zinc-400">Istoricul comenzilor și al plăților de test.</p>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center">
            <p className="text-zinc-400">Nu ai plasat încă nicio comandă.</p>
            <Link href="/catalog" className="mt-4 inline-block text-sm font-medium text-red-500 hover:text-red-400">Explorează catalogul</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Link key={order.id} href={`/orders/${order.id}`} className="block rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition-colors hover:border-zinc-700">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs text-zinc-600">{order.id}</p>
                    <p className="mt-1 text-sm text-zinc-400">{new Date(order.createdAt).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                    <p className="mt-2 text-xs text-zinc-500">{order._count.items} poziții · {ORDER_LABELS[order.status] ?? order.status}</p>
                    <div className="mt-3 flex gap-2">
                      {order.items.map((item) => (
                        <div key={item.id} className="w-14">
                          <ProductVisual category={item.product.categoryType} slug={item.product.slug} imageUrl={item.product.imageUrl} alt={item.productName} size="thumbnail" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-zinc-100">{formatPrice(Number(order.totalAmount))}</p>
                    <p className={`mt-1 text-xs font-semibold ${order.paymentStatus === "PAID" ? "text-emerald-400" : order.paymentStatus === "PENDING" ? "text-amber-400" : "text-red-400"}`}>{PAYMENT_LABELS[order.paymentStatus] ?? order.paymentStatus}</p>
                    <p className="mt-1 text-[10px] text-zinc-600">{order.paymentMethod === "STRIPE_TEST" ? "Stripe Test Mode" : "Plată simulată"}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
