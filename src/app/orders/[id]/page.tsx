import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PaymentStatus } from "@/components/payment-status";
import { OrderPaymentActions } from "@/components/order-payment-actions";

export default async function OrderDetailsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect(`/auth/login?callbackUrl=/orders/${params.id}`);

  const order = await prisma.order.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: { items: true },
  });
  if (!order) notFound();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link href="/orders" className="text-sm font-medium text-red-500 hover:text-red-400">← Comenzile mele</Link>
        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-800 pb-5">
            <div>
              <h1 className="text-2xl font-bold">Detalii comandă</h1>
              <p className="mt-1 font-mono text-xs text-zinc-600">{order.id}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold">{formatPrice(Number(order.totalAmount))}</p>
              <PaymentStatus orderId={order.id} initialStatus={order.paymentStatus} />
            </div>
          </div>

          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-zinc-500">Status comandă</dt><dd className="mt-1 text-zinc-200">{order.status}</dd></div>
            <div><dt className="text-zinc-500">Metodă plată</dt><dd className="mt-1 text-zinc-200">{order.paymentMethod === "STRIPE_TEST" ? "Stripe Test Mode" : "Simulată"}</dd></div>
            <div><dt className="text-zinc-500">Client</dt><dd className="mt-1 text-zinc-200">{order.customerName}</dd></div>
            <div><dt className="text-zinc-500">Email</dt><dd className="mt-1 text-zinc-200">{order.customerEmail}</dd></div>
            <div className="sm:col-span-2"><dt className="text-zinc-500">Adresă de livrare</dt><dd className="mt-1 text-zinc-200">{order.shippingAddress}</dd></div>
          </dl>

          {order.paymentMethod === "STRIPE_TEST" && order.paymentStatus === "PENDING" && (
            <OrderPaymentActions orderId={order.id} />
          )}

          <div className="mt-6 border-t border-zinc-800 pt-5">
            <h2 className="font-semibold">Produse</h2>
            <ul className="mt-3 space-y-2">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4 rounded-lg bg-zinc-950 px-3 py-2 text-sm">
                  <span className="text-zinc-300">{item.productName} <span className="text-zinc-600">× {item.quantity}</span></span>
                  <span className="font-medium text-zinc-200">{formatPrice(Number(item.totalPrice))}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
