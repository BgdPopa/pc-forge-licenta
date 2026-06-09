"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Eroare la înregistrare.");
      setLoading(false);
      return;
    }

    router.push("/auth/login");
  }

  return (
    <div className="flex min-h-screen bg-zinc-950">
      {/* Panel branding stânga — ascuns pe mobil */}
      <div className="hidden w-[45%] flex-col justify-between border-r border-zinc-800 bg-zinc-900 p-10 lg:flex">
        <Link href="/" className="text-xl font-bold tracking-tight text-zinc-100">
          PC <span className="text-red-600">Forge</span>
        </Link>

        <div>
          <p className="text-3xl font-bold leading-tight text-zinc-100">
            Construiește configurația perfectă
          </p>
          <ul className="mt-10 space-y-6">
            <li className="flex items-start gap-4">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-red-600/10 text-red-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-zinc-100">Compatibilitate verificată CSP</p>
                <p className="mt-1 text-sm text-zinc-400">
                  Socket, RAM, sursă și factor de formă validate în timp real.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-red-600/10 text-red-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-zinc-100">Scoring transparent preț-performanță</p>
                <p className="mt-1 text-sm text-zinc-400">
                  Scoruri calculate din specificații și preț pentru fiecare categorie.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-red-600/10 text-red-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-zinc-100">Asistent AI specializat în hardware</p>
                <p className="mt-1 text-sm text-zinc-400">
                  Răspunsuri ancorate în catalogul și stocul actual al platformei.
                </p>
              </div>
            </li>
          </ul>
        </div>

        <p className="text-xs text-zinc-600">
          © 2026 PC Forge — Proiect de licență, FMI, Universitatea din București
        </p>
      </div>

      {/* Formular dreapta */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Logo mic pe mobil */}
          <Link href="/" className="mb-8 block text-xl font-bold tracking-tight text-zinc-100 lg:hidden">
            PC <span className="text-red-600">Forge</span>
          </Link>

          <h1 className="text-2xl font-bold text-zinc-100">Cont nou</h1>
          <p className="mt-2 text-sm text-zinc-400">Creează-ți contul PC Forge.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-zinc-300"
              >
                Nume
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-red-600 focus:outline-none"
                placeholder="Numele tău"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-zinc-300"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-red-600 focus:outline-none"
                placeholder="exemplu@email.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-300"
              >
                Parolă
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-red-600 focus:outline-none"
                placeholder="Minim 8 caractere"
              />
            </div>

            {error && (
              <p className="rounded-md bg-red-950 px-3 py-2 text-sm text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
            >
              {loading ? "Se creează contul..." : "Creează cont"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            Ai deja cont?{" "}
            <Link href="/auth/login" className="text-red-500 hover:text-red-400">
              Autentifică-te
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
