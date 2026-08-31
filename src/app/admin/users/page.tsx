import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  AdminUsersTable,
  type AdminUserRow,
} from "@/components/admin-users-table";

export const metadata: Metadata = { title: "Utilizatori — Admin PC Forge" };

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  const rows = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { orders: true, configurations: true } },
    },
  });

  const users: AdminUserRow[] = rows.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    orderCount: user._count.orders,
    configurationCount: user._count.configurations,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Utilizatori
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          {users.length} conturi înregistrate · {users.filter((u) => u.role === "ADMIN").length} administratori
        </p>
      </div>
      <AdminUsersTable users={users} currentUserId={session?.user?.id ?? ""} />
    </div>
  );
}
