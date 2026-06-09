"use client";

import { useState } from "react";

type ProfileData = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
};

type Props = {
  initial: ProfileData;
};

export function ProfileClient({ initial }: Props) {
  const [name, setName] = useState(initial.name ?? "");
  const [email, setEmail] = useState(initial.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [infoLoading, setInfoLoading] = useState(false);
  const [infoSuccess, setInfoSuccess] = useState<string | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);

  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);

  async function handleInfoSubmit(e: React.FormEvent) {
    e.preventDefault();
    setInfoLoading(true);
    setInfoSuccess(null);
    setInfoError(null);

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });
    const data = await res.json();
    setInfoLoading(false);

    if (!res.ok) {
      setInfoError(data.error ?? "Eroare la salvare.");
      return;
    }
    setInfoSuccess("Informațiile au fost actualizate.");
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPwSuccess(null);
    setPwError(null);

    if (newPassword !== confirmPassword) {
      setPwError("Parolele noi nu coincid.");
      return;
    }

    setPwLoading(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setPwLoading(false);

    if (!res.ok) {
      setPwError(data.error ?? "Eroare la schimbarea parolei.");
      return;
    }

    setPwSuccess("Parola a fost schimbată.");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  const memberSince = new Date(initial.createdAt).toLocaleDateString("ro-RO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-8">
      {/* Card info cont */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-red-600/10 text-xl font-bold text-red-500">
            {(initial.name ?? initial.email).charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-zinc-100">
              {initial.name ?? "—"}
            </p>
            <p className="text-sm text-zinc-400">{initial.email}</p>
            <p className="mt-0.5 text-xs text-zinc-600">
              Membru din {memberSince}
            </p>
          </div>
          {initial.role === "ADMIN" && (
            <span className="ml-auto rounded bg-red-600/20 px-2 py-1 text-xs font-medium text-red-400">
              admin
            </span>
          )}
        </div>
      </div>

      {/* Formular informații generale */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900">
        <div className="border-b border-zinc-800 px-6 py-4">
          <h2 className="font-semibold text-zinc-100">Informații cont</h2>
          <p className="mt-0.5 text-sm text-zinc-500">Actualizează numele și adresa de email.</p>
        </div>
        <form onSubmit={handleInfoSubmit} className="space-y-5 p-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-zinc-300">
              Nume
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-red-600 focus:outline-none"
              placeholder="Numele tău"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-red-600 focus:outline-none"
              placeholder="exemplu@email.com"
            />
          </div>

          {infoError && (
            <p className="rounded-lg bg-red-950 px-3 py-2 text-sm text-red-400">
              {infoError}
            </p>
          )}
          {infoSuccess && (
            <p className="rounded-lg bg-emerald-950 px-3 py-2 text-sm text-emerald-400">
              {infoSuccess}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={infoLoading}
              className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
            >
              {infoLoading ? "Se salvează..." : "Salvează modificările"}
            </button>
          </div>
        </form>
      </div>

      {/* Formular schimbare parolă */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900">
        <div className="border-b border-zinc-800 px-6 py-4">
          <h2 className="font-semibold text-zinc-100">Schimbare parolă</h2>
          <p className="mt-0.5 text-sm text-zinc-500">Introduce parola curentă și alege una nouă.</p>
        </div>
        <form onSubmit={handlePasswordSubmit} className="space-y-5 p-6">
          <div>
            <label htmlFor="current-password" className="block text-sm font-medium text-zinc-300">
              Parola curentă
            </label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-red-600 focus:outline-none"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-zinc-300">
              Parola nouă
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-red-600 focus:outline-none"
              placeholder="Minim 8 caractere"
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-zinc-300">
              Confirmă parola nouă
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-red-600 focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          {pwError && (
            <p className="rounded-lg bg-red-950 px-3 py-2 text-sm text-red-400">
              {pwError}
            </p>
          )}
          {pwSuccess && (
            <p className="rounded-lg bg-emerald-950 px-3 py-2 text-sm text-emerald-400">
              {pwSuccess}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={pwLoading}
              className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
            >
              {pwLoading ? "Se schimbă..." : "Schimbă parola"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
