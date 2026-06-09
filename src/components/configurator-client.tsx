"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ProductCategory } from "@prisma/client";
import { validateConfiguration } from "@/lib/csp/engine";
import type {
  CompatibilityConstraint,
  ComponentData,
  CspViolation,
  SelectedComponent,
} from "@/lib/csp/types";
import { categoryLabels } from "@/types/product";
import { formatPrice } from "@/lib/format";

// ─── Tipuri exportate ────────────────────────────────────────────────────────

export type ConfiguratorProduct = {
  id: string;
  name: string;
  brand: string;
  price: number;
  categoryType: ProductCategory;
  component: ComponentData | null;
};

type Props = {
  slots: ProductCategory[];
  products: ConfiguratorProduct[];
  constraints: CompatibilityConstraint[];
  /** ID-ul utilizatorului autentificat, sau null dacă nu e logat */
  userId: string | null;
};

// ─── Constante ───────────────────────────────────────────────────────────────

/** Consum suplimentar estimat (ventilatoare, stocare, plăci de bază) */
const POWER_OVERHEAD_W = 100;

/** Număr minim de componente pentru a permite salvarea */
const MIN_COMPONENTS_TO_SAVE = 3;

// ─── Utilitare ────────────────────────────────────────────────────────────────

/**
 * Generează un mesaj explicativ lizibil pentru o incompatibilitate CSP.
 * Mesajele sunt adaptate operatorului și câmpurilor implicate.
 */
function formatViolationExplanation(v: CspViolation): string {
  switch (v.operator) {
    case "EQUALS":
      return (
        `${v.sourceProductName} (${String(v.sourceValue)}) nu este compatibil cu ` +
        `${v.targetProductName} (${String(v.targetValue)}). Valorile trebuie să fie identice.`
      );
    case "GREATER_OR_EQUAL":
      return (
        `${v.sourceProductName} furnizează ${String(v.sourceValue)} W, ` +
        `dar sunt necesari minim ${String(v.targetValue)} W.`
      );
    case "LESS_OR_EQUAL":
      return (
        `${v.sourceProductName} are ${String(v.sourceValue)} mm — depășește ` +
        `maximul de ${String(v.targetValue)} mm impus de ${v.targetProductName}.`
      );
    case "CONTAINS": {
      const supported = Array.isArray(v.targetValue)
        ? (v.targetValue as string[]).join(", ")
        : String(v.targetValue);
      return (
        `${v.targetProductName} nu suportă socket-ul „${String(v.sourceValue)}" ` +
        `(${v.sourceProductName}). Socket-uri suportate: ${supported}.`
      );
    }
    default:
      return `Incompatibilitate detectată între ${v.sourceProductName} și ${v.targetProductName}.`;
  }
}

/** Formatează data curentă pentru numele implicit al configurației */
function defaultConfigName(): string {
  return `Configurație PC — ${new Date().toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })}`;
}

// ─── Tipuri interne ──────────────────────────────────────────────────────────

type RuleItem = {
  id: string;
  name: string;
  status: "passed" | "failed" | "skipped";
  explanation?: string;
  skipHint?: string;
};

type PowerCheck = {
  cpuTdp: number;
  gpuTdp: number;
  overhead: number;
  estimated: number;
  available: number;
  sufficient: boolean;
};

type ConfigStatus = "empty" | "incomplete" | "valid" | "invalid";

// ─── Componenta principală ────────────────────────────────────────────────────

export function ConfiguratorClient({ slots, products, constraints, userId }: Props) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [saveName, setSaveName] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // ── Produse indexate ───────────────────────────────────────────────────────
  const productsByCategory = useMemo(() => {
    const map = new Map<ProductCategory, ConfiguratorProduct[]>();
    for (const p of products) {
      const list = map.get(p.categoryType) ?? [];
      list.push(p);
      map.set(p.categoryType, list);
    }
    return map;
  }, [products]);

  const productById = useMemo(() => {
    const map = new Map<string, ConfiguratorProduct>();
    for (const p of products) map.set(p.id, p);
    return map;
  }, [products]);

  // ── Selecție curentă ca variabile CSP ──────────────────────────────────────
  const selectedComponents: SelectedComponent[] = useMemo(() => {
    return Object.values(selection).flatMap((productId) => {
      const product = productById.get(productId);
      if (!product) return [];
      return [
        {
          productId: product.id,
          productName: product.name,
          categoryType: product.categoryType,
          component: product.component,
        },
      ];
    });
  }, [selection, productById]);

  const byCategory = useMemo(() => {
    const map = new Map<ProductCategory, SelectedComponent>();
    for (const item of selectedComponents) map.set(item.categoryType, item);
    return map;
  }, [selectedComponents]);

  // ── Rezultat CSP ───────────────────────────────────────────────────────────
  const result = useMemo(
    () => validateConfiguration(selectedComponents, constraints),
    [selectedComponents, constraints],
  );

  // ── Preț total ─────────────────────────────────────────────────────────────
  const totalPrice = useMemo(
    () =>
      selectedComponents.reduce((sum, item) => {
        const p = productById.get(item.productId);
        return sum + (p ? p.price : 0);
      }, 0),
    [selectedComponents, productById],
  );

  // ── Verificare consum estimat (calcul independent de motorul CSP) ──────────
  const powerCheck: PowerCheck | null = useMemo(() => {
    const cpuComp = byCategory.get("CPU")?.component;
    const gpuComp = byCategory.get("GPU")?.component;
    const psuComp = byCategory.get("PSU")?.component;

    // Afișăm verificarea doar dacă sunt selectate PSU + cel puțin CPU sau GPU
    if (!psuComp?.powerWatts) return null;
    if (!cpuComp?.tdpWatts && !gpuComp?.tdpWatts) return null;

    const cpuTdp = cpuComp?.tdpWatts ?? 0;
    const gpuTdp = gpuComp?.tdpWatts ?? 0;
    const estimated = cpuTdp + gpuTdp + POWER_OVERHEAD_W;
    const available = psuComp.powerWatts;

    return {
      cpuTdp,
      gpuTdp,
      overhead: POWER_OVERHEAD_W,
      estimated,
      available,
      sufficient: available >= estimated,
    };
  }, [byCategory]);

  // ── Lista de reguli cu status pentru UI ───────────────────────────────────
  const ruleItems: RuleItem[] = useMemo(() => {
    const violationMap = new Map(result.violations.map((v) => [v.ruleId, v]));
    const skippedMap = new Map(result.skipped.map((s) => [s.ruleId, s]));

    return constraints.map((c): RuleItem => {
      const violation = violationMap.get(c.id);
      if (violation) {
        return {
          id: c.id,
          name: c.name,
          status: "failed",
          explanation: formatViolationExplanation(violation),
        };
      }

      const skipped = skippedMap.get(c.id);
      if (skipped) {
        let skipHint = "Date tehnice insuficiente pentru verificare.";
        if (skipped.reason === "MISSING_SELECTION") {
          const missing: string[] = [];
          if (!byCategory.has(c.sourceType)) missing.push(categoryLabels[c.sourceType]);
          if (!byCategory.has(c.targetType)) missing.push(categoryLabels[c.targetType]);
          if (missing.length > 0) skipHint = `Selectează: ${missing.join(", ")}.`;
        }
        return { id: c.id, name: c.name, status: "skipped", skipHint };
      }

      return { id: c.id, name: c.name, status: "passed" };
    });
  }, [constraints, result, byCategory]);

  // ── Status global al configurației ────────────────────────────────────────
  const configStatus: ConfigStatus = useMemo(() => {
    const hasViolations =
      result.violations.length > 0 || powerCheck?.sufficient === false;
    if (selectedComponents.length === 0) return "empty";
    if (hasViolations) return "invalid";
    if (selectedComponents.length < slots.length) return "incomplete";
    return "valid";
  }, [result.violations, powerCheck, selectedComponents.length, slots.length]);

  // ── Contoare ────────────────────────────────────────────────────────────────
  const selectedCount = selectedComponents.length;
  const totalSlots = slots.length;
  const progressPercent = totalSlots > 0 ? Math.round((selectedCount / totalSlots) * 100) : 0;
  const canSave = selectedCount >= MIN_COMPONENTS_TO_SAVE && userId !== null;
  const isSaveBlocked = configStatus === "invalid";

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleSelect(category: ProductCategory, productId: string) {
    setSelection((prev) => {
      const next = { ...prev };
      if (productId === "") delete next[category];
      else next[category] = productId;
      return next;
    });
    // Resetăm starea de salvare când selecția se schimbă
    setSaveState("idle");
  }

  function handleReset() {
    setSelection({});
    setSaveName("");
    setSaveState("idle");
  }

  async function handleSave() {
    if (!canSave || saveState === "saving") return;
    setSaveState("saving");

    const name = saveName.trim() || defaultConfigName();
    const items = selectedComponents.map((c) => ({
      productId: c.productId,
      categoryType: c.categoryType,
    }));

    try {
      const res = await fetch("/api/configurations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          items,
          totalPrice,
          totalPower: powerCheck?.estimated ?? null,
          isValid: configStatus === "valid",
        }),
      });

      if (!res.ok) throw new Error("Server error");
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      {/* ═══════════════════════════════════════════════════
          COLOANA STÂNGĂ — sloturi de selecție
      ═══════════════════════════════════════════════════ */}
      <div className="space-y-4">
        {/* Card progres */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-zinc-300">Componente selectate</span>
            <span className="text-zinc-400">
              <span className="font-semibold text-zinc-100">{selectedCount}</span>
              {" / "}
              <span>{totalSlots}</span>
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-red-600 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {selectedCount === totalSlots && (
            <p className="mt-2 text-xs font-medium text-emerald-400">
              ✓ Toate componentele au fost selectate.
            </p>
          )}
          {selectedCount === 0 && (
            <p className="mt-2 text-xs text-zinc-600">
              Alege componentele din listele de mai jos pentru a verifica compatibilitatea.
            </p>
          )}
        </div>

        {/* Sloturi */}
        {slots.map((category) => {
          const options = productsByCategory.get(category) ?? [];
          const selectedId = selection[category] ?? "";
          const isSelected = selectedId !== "";
          return (
            <div
              key={category}
              className={`rounded-xl border p-4 transition-colors ${
                isSelected
                  ? "border-zinc-700 bg-zinc-900"
                  : "border-zinc-800 bg-zinc-900/70"
              }`}
            >
              <label
                htmlFor={`slot-${category}`}
                className="mb-2 flex items-center justify-between"
              >
                <span className="text-sm font-medium text-zinc-300">
                  {categoryLabels[category]}
                </span>
                {isSelected && (
                  <span className="rounded-full bg-red-600/20 px-2 py-0.5 text-[10px] font-medium text-red-400">
                    selectat
                  </span>
                )}
              </label>
              <select
                id={`slot-${category}`}
                value={selectedId}
                onChange={(e) => handleSelect(category, e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-red-600 focus:outline-none"
              >
                <option value="">— Niciun produs selectat —</option>
                {options.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} — {formatPrice(product.price)}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════
          COLOANA DREAPTĂ — sumar și validare
      ═══════════════════════════════════════════════════ */}
      <aside className="h-fit space-y-4 lg:sticky lg:top-24">
        {/* ── Card sumar ─────────────────────────────────── */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-100">Sumar configurație</h2>
            {selectedCount > 0 && (
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-zinc-500 transition-colors hover:text-red-500"
              >
                Resetează
              </button>
            )}
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Componente alese</span>
              <span className="font-semibold text-zinc-100">
                {selectedCount} / {totalSlots}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-zinc-800 pt-2 text-sm">
              <span className="text-zinc-400">Total estimat</span>
              <span className="font-bold text-red-400">
                {selectedCount > 0 ? formatPrice(totalPrice) : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* ── Card compatibilitate ────────────────────────── */}
        {selectedCount > 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            {/* Status global */}
            <StatusBadge
              status={configStatus}
              violationCount={result.violations.length + (powerCheck?.sufficient === false ? 1 : 0)}
              evaluatedCount={result.evaluatedCount}
            />

            {/* Verificare consum estimat */}
            {powerCheck && (
              <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                  ⚡ Consum estimat total
                </p>
                <div className="space-y-0.5 text-xs text-zinc-500">
                  {powerCheck.cpuTdp > 0 && (
                    <div className="flex justify-between">
                      <span>Procesor (TDP)</span>
                      <span className="font-mono text-zinc-400">{powerCheck.cpuTdp} W</span>
                    </div>
                  )}
                  {powerCheck.gpuTdp > 0 && (
                    <div className="flex justify-between">
                      <span>Placă video (TDP)</span>
                      <span className="font-mono text-zinc-400">{powerCheck.gpuTdp} W</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Overhead estimat</span>
                    <span className="font-mono text-zinc-400">+ {powerCheck.overhead} W</span>
                  </div>
                  <div
                    className={`flex justify-between border-t border-zinc-800 pt-1 font-semibold ${
                      powerCheck.sufficient ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    <span>Estimat necesar</span>
                    <span className="font-mono">{powerCheck.estimated} W</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Sursă selectată</span>
                    <span className="font-mono">{powerCheck.available} W</span>
                  </div>
                </div>

                {powerCheck.sufficient ? (
                  <p className="mt-2 text-xs font-medium text-emerald-400">
                    ✓ Sursa selectată acoperă consumul estimat al configurației.
                  </p>
                ) : (
                  <p className="mt-2 text-xs font-medium text-red-400">
                    ✗ Sursa selectată are {powerCheck.available} W, dar configurația
                    necesită aproximativ {powerCheck.estimated} W. Alege o sursă cu putere mai
                    mare.
                  </p>
                )}
              </div>
            )}

            {/* Lista de reguli CSP */}
            {ruleItems.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                  Reguli de compatibilitate
                </p>
                <div className="space-y-1.5">
                  {ruleItems.map((rule) => (
                    <RuleRow key={rule.id} rule={rule} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Card salvare configurație ───────────────────── */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h3 className="text-sm font-semibold text-zinc-100">Salvează configurația</h3>

          {!userId ? (
            /* Utilizator neautentificat */
            <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
              <p className="text-xs text-zinc-400">
                Autentifică-te pentru a salva configurațiile tale și a le accesa ulterior.
              </p>
              <Link
                href="/auth/login"
                className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-500"
              >
                Autentificare
              </Link>
            </div>
          ) : selectedCount < MIN_COMPONENTS_TO_SAVE ? (
            /* Prea puține componente */
            <p className="mt-3 text-xs text-zinc-500">
              Selectează cel puțin {MIN_COMPONENTS_TO_SAVE} componente pentru a putea salva
              configurația.
            </p>
          ) : saveState === "saved" ? (
            /* Salvare reușită */
            <div className="mt-3 rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-3">
              <p className="text-xs font-medium text-emerald-400">
                ✓ Configurația a fost salvată în contul tău.
              </p>
              <Link
                href="/configurations"
                className="mt-2 inline-flex items-center gap-1 text-xs text-zinc-400 transition-colors hover:text-zinc-100"
              >
                Mergi la configurațiile mele
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          ) : (
            /* Formular de salvare */
            <div className="mt-3 space-y-3">
              {isSaveBlocked && (
                <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-2.5">
                  <p className="text-xs text-amber-400">
                    ⚠ Configurația conține incompatibilități și va fi marcată ca invalidă.
                  </p>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs text-zinc-500">
                  Nume configurație (opțional)
                </label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => {
                    setSaveName(e.target.value);
                    setSaveState("idle");
                  }}
                  placeholder={defaultConfigName()}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-red-600 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={saveState === "saving"}
                className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saveState === "saving" ? "Se salvează…" : "Salvează configurația"}
              </button>

              {saveState === "error" && (
                <p className="text-xs text-red-400">
                  Configurația nu a putut fi salvată. Încearcă din nou.
                </p>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

// ─── Subcomponente ────────────────────────────────────────────────────────────

function StatusBadge({
  status,
  violationCount,
  evaluatedCount,
}: {
  status: ConfigStatus;
  violationCount: number;
  evaluatedCount: number;
}) {
  const configs: Record<
    ConfigStatus,
    { label: string; desc: string; border: string; text: string; icon: string }
  > = {
    empty: {
      label: "Configurație nouă",
      desc: "Adaugă componente pentru a verifica compatibilitatea.",
      border: "border-zinc-700",
      text: "text-zinc-400",
      icon: "○",
    },
    incomplete: {
      label: "Configurație incompletă",
      desc:
        evaluatedCount > 0
          ? `${evaluatedCount} ${evaluatedCount === 1 ? "regulă verificată" : "reguli verificate"} — selectează restul componentelor pentru validare completă.`
          : "Selectează mai multe componente pentru validarea compatibilității.",
      border: "border-zinc-700",
      text: "text-zinc-300",
      icon: "◔",
    },
    valid: {
      label: "Configurație validă",
      desc: "Toate regulile aplicabile sunt respectate.",
      border: "border-emerald-900/50",
      text: "text-emerald-400",
      icon: "✓",
    },
    invalid: {
      label: "Configurație invalidă",
      desc:
        violationCount === 1
          ? "A fost identificată o incompatibilitate."
          : `Au fost identificate ${violationCount} incompatibilități.`,
      border: "border-red-900/50",
      text: "text-red-400",
      icon: "✗",
    },
  };

  const c = configs[status];
  return (
    <div className={`flex gap-3 rounded-lg border ${c.border} bg-zinc-950/50 p-3`}>
      <span className={`mt-0.5 shrink-0 text-base font-bold ${c.text}`}>{c.icon}</span>
      <div>
        <p className={`text-sm font-semibold ${c.text}`}>{c.label}</p>
        <p className="mt-0.5 text-xs text-zinc-500">{c.desc}</p>
      </div>
    </div>
  );
}

function RuleRow({ rule }: { rule: RuleItem }) {
  const statusStyle =
    rule.status === "passed"
      ? { dot: "bg-emerald-500", text: "text-emerald-400", label: "text-zinc-300" }
      : rule.status === "failed"
        ? { dot: "bg-red-500", text: "text-red-400", label: "text-zinc-200" }
        : { dot: "bg-zinc-600", text: "text-zinc-600", label: "text-zinc-500" };

  return (
    <div
      className={`rounded-lg border px-3 py-2 text-xs ${
        rule.status === "failed"
          ? "border-red-900/40 bg-red-950/20"
          : rule.status === "passed"
            ? "border-emerald-900/30 bg-emerald-950/10"
            : "border-zinc-800 bg-zinc-950/30"
      }`}
    >
      <div className="flex items-start gap-2">
        <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${statusStyle.dot}`} />
        <div className="min-w-0 flex-1">
          <p className={`font-medium leading-snug ${statusStyle.label}`}>{rule.name}</p>
          {rule.explanation && (
            <p className={`mt-1 leading-relaxed ${statusStyle.text}`}>{rule.explanation}</p>
          )}
          {rule.skipHint && (
            <p className="mt-0.5 italic text-zinc-600">{rule.skipHint}</p>
          )}
        </div>
      </div>
    </div>
  );
}
