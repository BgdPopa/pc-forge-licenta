"use client";

import { useMemo, useState } from "react";

export type AdminUserRow = {
  id: string;
  name: string | null;
  email: string;
  role: "USER" | "ADMIN";
  createdAt: string;
  orderCount: number;
  configurationCount: number;
};

export function AdminUsersTable({
  users: initialUsers,
  currentUserId,
}: {
  users: AdminUserRow[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visibleUsers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesQuery =
        !needle ||
        user.email.toLowerCase().includes(needle) ||
        (user.name ?? "").toLowerCase().includes(needle);
      return matchesQuery && (roleFilter === "ALL" || user.role === roleFilter);
    });
  }, [query, roleFilter, users]);

  async function changeRole(user: AdminUserRow, role: "USER" | "ADMIN") {
    if (role === user.role) return;
    setSavingId(user.id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Actualizarea a eșuat.");
      setUsers((current) =>
        current.map((entry) =>
          entry.id === user.id ? { ...entry, role: data.role } : entry,
        ),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Actualizarea a eșuat.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 sm:flex-row">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Caută după nume sau email"
          className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-red-600 focus:outline-none"
        />
        <select
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
          className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-red-600 focus:outline-none"
        >
          <option value="ALL">Toate rolurile</option>
          <option value="USER">Utilizatori</option>
          <option value="ADMIN">Administratori</option>
        </select>
      </div>

      {error && <p className="rounded-md border border-red-900/40 bg-red-950/20 px-3 py-2 text-sm text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-800 bg-zinc-900/80 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 text-left">Cont</th>
              <th className="px-4 py-3 text-center">Comenzi</th>
              <th className="px-4 py-3 text-center">Configurații</th>
              <th className="px-4 py-3 text-left">Înregistrat</th>
              <th className="px-4 py-3 text-right">Rol</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-900">
            {visibleUsers.map((user) => (
              <tr key={user.id} className="hover:bg-zinc-800/30">
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-100">{user.name || "Fără nume"}</p>
                  <p className="text-xs text-zinc-500">{user.email}</p>
                </td>
                <td className="px-4 py-3 text-center text-zinc-300">{user.orderCount}</td>
                <td className="px-4 py-3 text-center text-zinc-300">{user.configurationCount}</td>
                <td className="px-4 py-3 text-zinc-400">{new Date(user.createdAt).toLocaleDateString("ro-RO")}</td>
                <td className="px-4 py-3 text-right">
                  <select
                    value={user.role}
                    disabled={savingId === user.id || user.id === currentUserId}
                    onChange={(event) => changeRole(user, event.target.value as "USER" | "ADMIN")}
                    aria-label={`Rol pentru ${user.email}`}
                    className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="USER">Utilizator</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                  {user.id === currentUserId && <p className="mt-1 text-[10px] text-zinc-600">Contul curent</p>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visibleUsers.length === 0 && <p className="bg-zinc-900 py-10 text-center text-sm text-zinc-500">Niciun utilizator nu corespunde filtrelor.</p>}
      </div>
    </div>
  );
}
