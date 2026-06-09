import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-900">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-3">
          {/* Coloana 1 — Brand */}
          <div>
            <Link href="/" className="text-xl font-bold tracking-tight text-zinc-100">
              PC <span className="text-red-600">Forge</span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              Magazin online de componente și periferice pentru calculator. Proiect de licență, Tehnici Web, FMI, Universitatea din București.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-zinc-500">
              Platformă demonstrativă pentru lucrare de licență. Plata este simulată, iar nicio tranzacție reală nu este procesată.
            </p>
          </div>

          {/* Coloana 2 — Navigare rapidă */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
              Navigare rapidă
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="/catalog" className="text-sm text-zinc-400 transition-colors hover:text-red-500">
                  Catalog
                </Link>
              </li>
              <li>
                <Link href="/configurator" className="text-sm text-zinc-400 transition-colors hover:text-red-500">
                  Configurator CSP
                </Link>
              </li>
              <li>
                <Link href="/scoring" className="text-sm text-zinc-400 transition-colors hover:text-red-500">
                  Scoring
                </Link>
              </li>
              <li>
                <Link href="/agent" className="text-sm text-zinc-400 transition-colors hover:text-red-500">
                  Agent AI
                </Link>
              </li>
              <li>
                <Link href="/cart" className="text-sm text-zinc-400 transition-colors hover:text-red-500">
                  Coș
                </Link>
              </li>
            </ul>
          </div>

          {/* Coloana 3 — Contact demonstrativ */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
              Contact
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-zinc-400">
              <li>
                <span className="text-zinc-500">Email:</span>{" "}
                contact@pcforge.local
              </li>
              <li>
                <span className="text-zinc-500">Program:</span>{" "}
                Luni–Vineri, 9:00–18:00
              </li>
              <li className="leading-relaxed">
                <span className="text-zinc-500">Adresă:</span>{" "}
                Facultatea de Matematică și Informatică, Universitatea din București
              </li>
            </ul>
            <p className="mt-3 text-xs text-zinc-500">
              Date demonstrative — nu reprezintă contact real.
            </p>
          </div>
        </div>

        <div className="mt-10 border-t border-zinc-800 pt-6 text-center text-sm text-zinc-500">
          © 2026 PC Forge — Proiect de licență, Tehnici Web, FMI
        </div>
      </div>
    </footer>
  );
}
