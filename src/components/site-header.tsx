import Link from "next/link";
import { AuthStatus } from "@/components/auth-status";

const navLinks = [
  { label: "Catalog", href: "/catalog" },
  { label: "Configurator", href: "#" },
  { label: "Scoring", href: "#" },
  { label: "Agent AI", href: "#" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="text-xl font-bold tracking-tight">
          PC <span className="text-red-600">Forge</span>
        </Link>
        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          <nav className="flex flex-wrap gap-1 sm:gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="rounded-md px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-red-500"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <AuthStatus />
        </div>
      </div>
    </header>
  );
}
