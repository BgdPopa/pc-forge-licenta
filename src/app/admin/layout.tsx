import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AdminNav } from "@/components/admin-nav";

/**
 * Layout pentru zona /admin.
 *
 * Protecție dublă server-side:
 * - Utilizator neautentificat → redirect la login
 * - Utilizator autentificat fără rol ADMIN → mesaj acces interzis
 * - Utilizator ADMIN → randare normală cu nav admin
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/admin");
  }

  if (session.user.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 py-24 sm:px-6">
          <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-red-900/50 bg-red-950/40">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-red-400">Acces interzis</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Această zonă este disponibilă doar administratorilor.
            </p>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteHeader />
      <AdminNav />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
      <SiteFooter />
    </div>
  );
}
