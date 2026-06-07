import type { ProductCategory } from "@prisma/client";
import { getSpecSourceField } from "./attributes";

/**
 * Formatează valoarea unui atribut pentru afișare în UI. Preferă textul original
 * din specificații (ex. „1 TB", „5600 MHz") în locul valorii numerice extrase
 * pentru calcul (ex. 1, 5600).
 */
export function formatAttributeDisplay(
  categoryType: ProductCategory,
  attributeKey: string,
  rawValue: number,
  unit: string | null,
  specifications: Record<string, unknown> | null,
): string {
  const source = getSpecSourceField(categoryType, attributeKey);
  if (source && specifications) {
    const original = specifications[source];
    if (typeof original === "string") return original;
    if (typeof original === "number") {
      return unit ? `${original} ${unit}` : String(original);
    }
  }

  if (unit) return `${rawValue} ${unit}`;
  return String(rawValue);
}
