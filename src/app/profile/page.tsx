import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProfileClient } from "@/components/profile-client";
import Link from "next/link";

export const metadata = {
  title: "Profilul meu — PC Forge",
};

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteHeader />

      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <div className="mb-8">
          <nav className="mb-4 flex items-center gap-2 text-sm text-zinc-500">
            <Link href="/" className="hover:text-red-500">
              Acasă
            </Link>
            <span>/</span>
            <span className="text-zinc-300">Profilul meu</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight">Profilul meu</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Gestionează informațiile contului tău PC Forge.
          </p>
        </div>

        <ProfileClient
          initial={{
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt.toISOString(),
          }}
        />
      </main>

      <SiteFooter />
    </div>
  );
}
