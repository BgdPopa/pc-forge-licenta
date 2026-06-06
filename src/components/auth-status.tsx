"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export function AuthStatus() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <span className="px-3 py-2 text-sm text-zinc-600">…</span>;
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden text-sm text-zinc-400 sm:inline">
          {session.user.email}
          {session.user.role === "ADMIN" && (
            <span className="ml-1 rounded bg-red-600/20 px-1.5 py-0.5 text-xs font-medium text-red-400">
              admin
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="rounded-md border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-red-600 hover:text-red-500"
        >
          Ieși din cont
        </button>
      </div>
    );
  }

  return (
    <Link
      href="/auth/login"
      className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500"
    >
      Autentificare
    </Link>
  );
}
