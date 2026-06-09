"use client";

import { useMemo, useState } from "react";
import type { ProductCategory } from "@prisma/client";
import { validateConfiguration } from "@/lib/csp/engine";
import type {
  CompatibilityConstraint,
  ComponentData,
  SelectedComponent,
} from "@/lib/csp/types";
import { categoryLabels } from "@/types/product";
import { formatPrice } from "@/lib/format";

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
};

export function ConfiguratorClient({ slots, products, constraints }: Props) {
  // Selecția curentă: pentru fiecare categorie (slot), id-ul produsului ales.
  const [selection, setSelection] = useState<Record<string, string>>({});

  const productsByCategory = useMemo(() => {
    const map = new Map<ProductCategory, ConfiguratorProduct[]>();
    for (const product of products) {
      const list = map.get(product.categoryType) ?? [];
      list.push(product);
      map.set(product.categoryType, list);
    }
    return map;
  }, [products]);

  const productById = useMemo(() => {
    const map = new Map<string, ConfiguratorProduct>();
    for (const product of products) map.set(product.id, product);
    return map;
  }, [products]);

  // Componentele selectate, transformate în variabilele CSP.
  const selectedComponents: SelectedComponent[] = useMemo(() => {
    const result: SelectedComponent[] = [];
    for (const productId of Object.values(selection)) {
      const product = productById.get(productId);
      if (!product) continue;
      result.push({
        productId: product.id,
        productName: product.name,
        categoryType: product.categoryType,
        component: product.component,
      });
    }
    return result;
  }, [selection, productById]);

  const result = useMemo(
    () => validateConfiguration(selectedComponents, constraints),
    [selectedComponents, constraints],
  );

  const totalPrice = useMemo(
    () => selectedComponents.reduce((sum, item) => {
      const product = productById.get(item.productId);
      return sum + (product ? product.price : 0);
    }, 0),
    [selectedComponents, productById],
  );

  const selectedCount = selectedComponents.length;
  const hasSelection = selectedCount > 0;

  function handleSelect(category: ProductCategory, productId: string) {
    setSelection((prev) => {
      const next = { ...prev };
      if (productId === "") {
        delete next[category];
      } else {
        next[category] = productId;
      }
      return next;
    });
  }

  function handleReset() {
    setSelection({});
  }

  const totalSlots = slots.length;
  const progressPercent = totalSlots > 0 ? Math.round((selectedCount / totalSlots) * 100) : 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      {/* Sloturi de selecție */}
      <div className="space-y-4">
        {/* Progress indicator */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-zinc-300">Configurație</span>
            <span className="text-zinc-400">
              <span className="font-semibold text-zinc-100">{selectedCount}</span>
              {" / "}
              <span>{totalSlots}</span>
              {" componente selectate"}
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-red-600 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {selectedCount === totalSlots && (
            <p className="mt-2 text-xs font-medium text-emerald-400">
              Toate componentele au fost selectate.
            </p>
          )}
        </div>

        {slots.map((category) => {
          const options = productsByCategory.get(category) ?? [];
          const selectedId = selection[category] ?? "";
          return (
            <div
              key={category}
              className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
            >
              <label
                htmlFor={`slot-${category}`}
                className="mb-2 block text-sm font-medium text-zinc-300"
              >
                {categoryLabels[category]}
              </label>
              <select
                id={`slot-${category}`}
                value={selectedId}
                onChange={(e) => handleSelect(category, e.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-red-600 focus:outline-none"
              >
                <option value="">— Niciun produs selectat —</option>
                {options.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({formatPrice(product.price)})
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      {/* Panou rezultat validare CSP */}
      <aside className="h-fit space-y-4 lg:sticky lg:top-24">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Sumar configurație</h2>
            {hasSelection && (
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-zinc-500 transition-colors hover:text-red-500"
              >
                Resetează
              </button>
            )}
          </div>

          <div className="mt-4 flex justify-between text-sm">
            <span className="text-zinc-400">Componente alese</span>
            <span className="font-medium text-zinc-100">{selectedCount}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-zinc-800 pt-3 font-bold text-zinc-100">
            <span>Total</span>
            <span>{formatPrice(totalPrice)}</span>
          </div>
        </div>

        {/* Stare compatibilitate */}
        {hasSelection && (
          <div
            className={`rounded-lg border p-5 ${
              result.isValid
                ? "border-emerald-900/50 bg-emerald-950/20"
                : "border-red-900/50 bg-red-950/20"
            }`}
          >
            <h3
              className={`text-sm font-semibold ${
                result.isValid ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {result.isValid
                ? "Configurație compatibilă"
                : "Incompatibilități detectate"}
            </h3>

            {result.evaluatedCount > 0 ? (
              <p className="mt-1 text-xs text-zinc-500">
                {result.evaluatedCount}{" "}
                {result.evaluatedCount === 1
                  ? "constrângere evaluată"
                  : "constrângeri evaluate"}
              </p>
            ) : (
              <p className="mt-1 text-xs text-zinc-500">
                Nicio constrângere nu poate fi evaluată încă. Adaugă mai multe
                componente.
              </p>
            )}

            {result.violations.length > 0 && (
              <ul className="mt-4 space-y-3">
                {result.violations.map((v) => (
                  <li
                    key={v.ruleId}
                    className="rounded-md border border-red-900/40 bg-zinc-900/60 p-3"
                  >
                    <p className="text-sm font-medium text-red-400">
                      {v.ruleName}
                    </p>
                    {v.description && (
                      <p className="mt-1 text-xs text-zinc-400">
                        {v.description}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-zinc-500">
                      {v.sourceProductName}:{" "}
                      <span className="font-mono text-zinc-300">
                        {String(v.sourceValue)}
                      </span>{" "}
                      vs {v.targetProductName}:{" "}
                      <span className="font-mono text-zinc-300">
                        {String(v.targetValue)}
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
