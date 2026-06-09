"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const adminLinks = [
  { label: "Dashboard", href: "/admin" },
  { label: "Produse", href: "/admin/products" },
  { label: "Comenzi", href: "/admin/orders" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-zinc-800 bg-zinc-900/60">
      <div className="mx-auto flex max-w-6xl items-center gap-1 px-4 py-2 sm:px-6">
        <span className="mr-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-red-600">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          Admin
        </span>

        {adminLinks.map((link) => {
          // Potrivire exactă pentru dashboard, prefix pentru subpagini
          const isActive =
            link.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-red-600/15 text-red-400"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
