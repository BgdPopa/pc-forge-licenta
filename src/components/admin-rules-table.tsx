"use client";

import { useMemo, useState } from "react";
import { categoryLabels } from "@/types/product";
import type { ProductCategory } from "@prisma/client";

export type AdminRuleRow = {
  id: string;
  name: string;
  description: string | null;
  ruleType: string;
  sourceType: ProductCategory;
  targetType: ProductCategory;
  sourceField: string | null;
  targetField: string | null;
  operator: string | null;
  isActive: boolean;
};

export function AdminRulesTable({ rules: initialRules }: { rules: AdminRuleRow[] }) {
  const [rules, setRules] = useState(initialRules);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visibleRules = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rules.filter((rule) => {
      const matchesQuery =
        !needle ||
        rule.name.toLowerCase().includes(needle) ||
        rule.ruleType.toLowerCase().includes(needle) ||
        rule.sourceType.toLowerCase().includes(needle) ||
        rule.targetType.toLowerCase().includes(needle);
      const matchesStatus =
        status === "ALL" || (status === "ACTIVE" ? rule.isActive : !rule.isActive);
      return matchesQuery && matchesStatus;
    });
  }, [query, rules, status]);

  async function toggleRule(rule: AdminRuleRow) {
    setSavingId(rule.id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !rule.isActive }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Actualizarea a eșuat.");
      setRules((current) =>
        current.map((entry) =>
          entry.id === rule.id ? { ...entry, isActive: data.isActive } : entry,
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
          placeholder="Caută regulă, tip sau categorie"
          className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-red-600 focus:outline-none"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-red-600 focus:outline-none"
        >
          <option value="ALL">Toate regulile</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        <span className="rounded-full bg-emerald-950/40 px-3 py-1 text-emerald-400">{rules.filter((rule) => rule.isActive).length} active</span>
        <span className="rounded-full bg-zinc-800 px-3 py-1 text-zinc-400">{rules.filter((rule) => !rule.isActive).length} inactive</span>
      </div>
      {error && <p className="rounded-md border border-red-900/40 bg-red-950/20 px-3 py-2 text-sm text-red-400">{error}</p>}

      <div className="space-y-3">
        {visibleRules.map((rule) => (
          <article key={rule.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-zinc-100">{rule.name}</h2>
                  <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-500">{rule.ruleType}</span>
                </div>
                {rule.description && <p className="mt-1 text-sm text-zinc-400">{rule.description}</p>}
                <p className="mt-3 font-mono text-xs text-zinc-500">
                  {categoryLabels[rule.sourceType]}.{rule.sourceField ?? "?"} {rule.operator ?? "?"} {categoryLabels[rule.targetType]}.{rule.targetField ?? "?"}
                </p>
              </div>
              <button
                type="button"
                disabled={savingId === rule.id}
                onClick={() => toggleRule(rule)}
                className={`shrink-0 rounded-md border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${rule.isActive ? "border-emerald-900/50 bg-emerald-950/30 text-emerald-400 hover:border-red-900 hover:text-red-400" : "border-zinc-700 bg-zinc-950 text-zinc-400 hover:border-emerald-800 hover:text-emerald-400"}`}
              >
                {savingId === rule.id ? "Se salvează…" : rule.isActive ? "Activă · Dezactivează" : "Inactivă · Activează"}
              </button>
            </div>
          </article>
        ))}
        {visibleRules.length === 0 && <p className="rounded-xl border border-dashed border-zinc-800 py-12 text-center text-sm text-zinc-500">Nicio regulă nu corespunde filtrelor.</p>}
      </div>
    </div>
  );
}
