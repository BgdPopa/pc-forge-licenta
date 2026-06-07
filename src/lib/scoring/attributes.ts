import type { ProductCategory } from "@prisma/client";
import type { PerformanceAttribute } from "./types";

/**
 * Extrage primul număr dintr-o valoare. Acceptă numere directe sau string-uri
 * de tipul „5600 MHz", „32 GB", „3.8 GHz". Întoarce null dacă nu există număr.
 */
export function parseNumeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const match = value.replace(",", ".").match(/\d+(\.\d+)?/);
    if (match) return Number.parseFloat(match[0]);
  }
  return null;
}

type Specs = Record<string, unknown> | null | undefined;

type AttributeDef = {
  key: string;
  label: string;
  unit: string | null;
  source: string;
  higherIsBetter: boolean;
};

// Atributele numerice relevante pentru scoring, per categorie. Cheia `source`
// indică din ce câmp al specificațiilor se extrage valoarea.
const CATEGORY_ATTRIBUTES: Partial<Record<ProductCategory, AttributeDef[]>> = {
  CPU: [
    { key: "cores", label: "Nuclee", unit: null, source: "cores", higherIsBetter: true },
    { key: "threads", label: "Fire de execuție", unit: null, source: "threads", higherIsBetter: true },
    { key: "boostClock", label: "Frecvență boost", unit: "GHz", source: "boostClock", higherIsBetter: true },
    { key: "baseClock", label: "Frecvență de bază", unit: "GHz", source: "baseClock", higherIsBetter: true },
  ],
  GPU: [
    { key: "vram", label: "Memorie video", unit: "GB", source: "vram", higherIsBetter: true },
  ],
  RAM: [
    { key: "capacity", label: "Capacitate", unit: "GB", source: "capacity", higherIsBetter: true },
    { key: "speed", label: "Frecvență", unit: "MHz", source: "speed", higherIsBetter: true },
    { key: "modules", label: "Module", unit: null, source: "modules", higherIsBetter: true },
  ],
  STORAGE: [
    { key: "capacity", label: "Capacitate", unit: null, source: "capacity", higherIsBetter: true },
    { key: "readSpeed", label: "Viteză citire", unit: "MB/s", source: "readSpeed", higherIsBetter: true },
  ],
  PSU: [
    { key: "wattage", label: "Putere", unit: "W", source: "wattage", higherIsBetter: true },
  ],
  MOTHERBOARD: [
    { key: "memorySlots", label: "Sloturi memorie", unit: null, source: "memorySlots", higherIsBetter: true },
    { key: "maxMemory", label: "Memorie maximă", unit: "GB", source: "maxMemory", higherIsBetter: true },
  ],
  COOLER: [
    { key: "fanSize", label: "Dimensiune ventilator", unit: "mm", source: "fanSize", higherIsBetter: true },
  ],
};

/**
 * Extrage atributele de performanță numerice ale unui produs, pe baza
 * categoriei și a specificațiilor. Atributele fără valoare numerică validă sunt
 * omise.
 */
export function extractAttributes(
  categoryType: ProductCategory,
  specifications: Specs,
): PerformanceAttribute[] {
  const defs = CATEGORY_ATTRIBUTES[categoryType];
  if (!defs || !specifications) return [];

  const attributes: PerformanceAttribute[] = [];
  for (const def of defs) {
    const value = parseNumeric(specifications[def.source]);
    if (value === null) continue;
    attributes.push({
      key: def.key,
      label: def.label,
      unit: def.unit,
      value,
      higherIsBetter: def.higherIsBetter,
    });
  }
  return attributes;
}

// Categoriile pentru care scoringul preț-performanță este relevant.
export const SCORABLE_CATEGORIES = Object.keys(
  CATEGORY_ATTRIBUTES,
) as ProductCategory[];

/** Câmpul din `specifications` de unde provine un atribut de scoring. */
export function getSpecSourceField(
  categoryType: ProductCategory,
  attributeKey: string,
): string | null {
  const defs = CATEGORY_ATTRIBUTES[categoryType];
  if (!defs) return null;
  return defs.find((def) => def.key === attributeKey)?.source ?? null;
}
