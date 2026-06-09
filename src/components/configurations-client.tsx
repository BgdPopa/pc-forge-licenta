"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { SerializedConfiguration } from "@/app/configurations/page";

type Props = {
  configurations: SerializedConfiguration[];
};

// ─── Stare per-configurație pentru butonul de coș ────────────────────────────
type CartAddState =
  | { status: "idle" }
  | { status: "adding" }
  | { status: "added"; message: string; addedCount: number; skippedCount: number }
  | { status: "partial"; message: string; addedCount: number; skippedCount: number }
  | { status: "unavailable"; message: string }
  | { status: "error" };

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function ConfigurationsClient({ configurations: initialConfigs }: Props) {
  const [configs, setConfigs] = useState(initialConfigs);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Starea butonului "Adaugă în coș" per-configurație
  const [cartState, setCartState] = useState<Record<string, CartAddState>>({});

  // ── Ștergere configurație ───────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (deletingId) return;
    setDeletingId(id);

    try {
      const res = await fetch(`/api/configurations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setConfigs((prev) => prev.filter((c) => c.id !== id));
      if (expandedId === id) setExpandedId(null);
      setCartState((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch {
      // Eroarea nu este critică — utilizatorul poate reîncerca
    } finally {
      setDeletingId(null);
    }
  }

  // ── Adaugă configurație în coș ──────────────────────────────────────────────
  async function handleAddToCart(configId: string) {
    const current = cartState[configId];
    if (current?.status === "adding") return;

    setCartState((prev) => ({ ...prev, [configId]: { status: "adding" } }));

    try {
      const res = await fetch("/api/cart/configuration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configurationId: configId }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 400 && data.addedCount === 0) {
          setCartState((prev) => ({
            ...prev,
            [configId]: { status: "unavailable", message: data.message ?? data.error },
          }));
        } else {
          setCartState((prev) => ({ ...prev, [configId]: { status: "error" } }));
        }
        return;
      }

      if (data.skippedCount > 0) {
        setCartState((prev) => ({
          ...prev,
          [configId]: {
            status: "partial",
            message: data.message,
            addedCount: data.addedCount,
            skippedCount: data.skippedCount,
          },
        }));
      } else {
        setCartState((prev) => ({
          ...prev,
          [configId]: {
            status: "added",
            message: data.message,
            addedCount: data.addedCount,
            skippedCount: 0,
          },
        }));
      }
    } catch {
      setCartState((prev) => ({ ...prev, [configId]: { status: "error" } }));
    }
  }

  // ── Ecran gol ───────────────────────────────────────────────────────────────
  if (configs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-7 w-7 text-zinc-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"
            />
          </svg>
        </div>
        <div>
          <p className="text-base font-semibold text-zinc-300">
            Nu ai salvat încă nicio configurație.
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Creează o configurație în configurator și salvează-o din panoul lateral.
          </p>
        </div>
        <Link
          href="/configurator"
          className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500"
        >
          Creează o configurație
        </Link>
      </div>
    );
  }

  // ── Listă configurații ──────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header cu număr total + link spre configurator */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          {configs.length}{" "}
          {configs.length === 1 ? "configurație salvată" : "configurații salvate"}
        </p>
        <Link
          href="/configurator"
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-100"
        >
          + Configurație nouă
        </Link>
      </div>

      {configs.map((config) => {
        const computedTotal = config.items.reduce((sum, i) => sum + i.productPrice, 0);
        const displayPrice = config.totalPrice ?? computedTotal;
        const isExpanded = expandedId === config.id;
        const cs = cartState[config.id] ?? { status: "idle" };

        return (
          <div
            key={config.id}
            className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900"
          >
            {/* ── Header card ──────────────────────────────────── */}
            <div className="flex items-start justify-between gap-4 p-5">
              {/* Stânga: status badge + nume + metadata */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      config.isValid
                        ? "bg-emerald-950/50 text-emerald-400"
                        : "bg-red-950/50 text-red-400"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        config.isValid ? "bg-emerald-400" : "bg-red-400"
                      }`}
                    />
                    {config.isValid ? "Validă" : "Invalidă"}
                  </span>
                  <h2 className="truncate text-base font-semibold text-zinc-100">
                    {config.name}
                  </h2>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                  <span>{formatDate(config.createdAt)}</span>
                  <span className="hidden sm:inline">·</span>
                  <span>
                    {config.items.length}{" "}
                    {config.items.length === 1 ? "componentă" : "componente"}
                  </span>
                  {config.totalPower != null && (
                    <>
                      <span className="hidden sm:inline">·</span>
                      <span>Consum estimat: {config.totalPower} W</span>
                    </>
                  )}
                </div>
              </div>

              {/* Dreapta: preț + acțiuni */}
              <div className="flex shrink-0 flex-col items-end gap-3">
                <p className="text-lg font-bold text-red-400">
                  {formatPrice(displayPrice)}
                </p>

                {/* Buton principal — Adaugă în coș */}
                <CartButton
                  state={cs}
                  onAdd={() => handleAddToCart(config.id)}
                  onRetry={() => handleAddToCart(config.id)}
                />

                {/* Acțiuni secundare */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : config.id)}
                    className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
                  >
                    {isExpanded ? "Ascunde" : "Detalii"}
                  </button>
                  <span className="text-zinc-700">·</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(config.id)}
                    disabled={deletingId === config.id}
                    className="text-xs text-zinc-500 transition-colors hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingId === config.id ? "Se șterge…" : "Șterge"}
                  </button>
                </div>
              </div>
            </div>

            {/* ── Banner feedback coș ───────────────────────────── */}
            {cs.status !== "idle" && cs.status !== "adding" && (
              <CartFeedbackBanner state={cs} />
            )}

            {/* ── Detalii expandabile ───────────────────────────── */}
            {isExpanded && config.items.length > 0 && (
              <div className="border-t border-zinc-800 px-5 pb-5 pt-4">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                  Componente
                </p>
                <div className="space-y-1.5">
                  {config.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-3 py-2 text-sm"
                    >
                      <span className="truncate text-zinc-300">{item.productName}</span>
                      <span className="ml-4 shrink-0 font-medium text-zinc-400">
                        {formatPrice(item.productPrice)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Subcomponente ────────────────────────────────────────────────────────────

function CartButton({
  state,
  onAdd,
  onRetry,
}: {
  state: CartAddState;
  onAdd: () => void;
  onRetry: () => void;
}) {
  if (state.status === "added" || state.status === "partial") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-emerald-400">
          ✓ {state.status === "added" ? "Adăugat în coș" : "Adăugat parțial"}
        </span>
        <Link
          href="/cart"
          className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-100"
        >
          Vezi coșul →
        </Link>
      </div>
    );
  }

  if (state.status === "unavailable") {
    return (
      <span className="text-xs text-amber-400">⚠ Produse indisponibile</span>
    );
  }

  if (state.status === "error") {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="rounded-lg border border-red-800 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:border-red-700 hover:text-red-300"
      >
        Încearcă din nou
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={state.status === "adding"}
      className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {state.status === "adding" ? (
        <>
          <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Se adaugă…
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Adaugă în coș
        </>
      )}
    </button>
  );
}

function CartFeedbackBanner({ state }: { state: CartAddState }) {
  if (state.status === "added") {
    return (
      <div className="border-t border-emerald-900/30 bg-emerald-950/20 px-5 py-3">
        <p className="text-xs text-emerald-400">
          ✓ {state.message}
        </p>
        <Link
          href="/cart"
          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-300 transition-colors hover:text-emerald-200"
        >
          Mergi la coș și finalizează comanda
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    );
  }

  if (state.status === "partial") {
    return (
      <div className="border-t border-amber-900/30 bg-amber-950/20 px-5 py-3">
        <p className="text-xs text-amber-400">⚠ {state.message}</p>
        <Link
          href="/cart"
          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-300 transition-colors hover:text-amber-200"
        >
          Vezi coșul
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    );
  }

  if (state.status === "unavailable") {
    return (
      <div className="border-t border-zinc-800 bg-zinc-950/50 px-5 py-3">
        <p className="text-xs text-amber-400">{state.message}</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="border-t border-red-900/30 bg-red-950/20 px-5 py-3">
        <p className="text-xs text-red-400">
          Configurația nu a putut fi adăugată în coș. Încearcă din nou.
        </p>
      </div>
    );
  }

  return null;
}
