import type { ProductCategory } from "@prisma/client";
import type { UsageProfile, WeightMap } from "./types";

// Etichete pentru afișare în interfață.
export const profileLabels: Record<UsageProfile, string> = {
  gaming: "Gaming",
  workstation: "Workstation",
  office: "Office / general",
};

export const profileDescriptions: Record<UsageProfile, string> = {
  gaming:
    "Prioritizează frecvențele ridicate și memoria video, relevante pentru jocuri.",
  workstation:
    "Prioritizează numărul de nuclee, firele de execuție și capacitatea, pentru sarcini de productivitate.",
  office:
    "Echilibrează atributele, potrivit pentru utilizare generală și birou.",
};

// Tabelele de ponderi pe atribut, pentru fiecare categorie și profil.
// Ponderile nu trebuie să însumeze 1: motorul renormalizează la atributele
// efectiv prezente pe fiecare produs.
const WEIGHTS: Partial<
  Record<ProductCategory, Record<UsageProfile, WeightMap>>
> = {
  CPU: {
    gaming: { boostClock: 0.45, cores: 0.3, threads: 0.15, baseClock: 0.1 },
    workstation: { cores: 0.35, threads: 0.35, boostClock: 0.2, baseClock: 0.1 },
    office: { cores: 0.25, threads: 0.25, boostClock: 0.25, baseClock: 0.25 },
  },
  GPU: {
    gaming: { vram: 1 },
    workstation: { vram: 1 },
    office: { vram: 1 },
  },
  RAM: {
    gaming: { speed: 0.5, capacity: 0.35, modules: 0.15 },
    workstation: { capacity: 0.55, speed: 0.3, modules: 0.15 },
    office: { capacity: 0.5, speed: 0.5 },
  },
  STORAGE: {
    gaming: { readSpeed: 0.6, capacity: 0.4 },
    workstation: { capacity: 0.55, readSpeed: 0.45 },
    office: { capacity: 0.6, readSpeed: 0.4 },
  },
  PSU: {
    gaming: { wattage: 1 },
    workstation: { wattage: 1 },
    office: { wattage: 1 },
  },
  MOTHERBOARD: {
    gaming: { maxMemory: 0.5, memorySlots: 0.5 },
    workstation: { maxMemory: 0.5, memorySlots: 0.5 },
    office: { maxMemory: 0.5, memorySlots: 0.5 },
  },
  COOLER: {
    gaming: { fanSize: 1 },
    workstation: { fanSize: 1 },
    office: { fanSize: 1 },
  },
};

/**
 * Întoarce harta de ponderi pentru o categorie și un profil. Dacă nu există o
 * configurație explicită, întoarce o hartă goală (produsele vor primi scor 0).
 */
export function getWeights(
  categoryType: ProductCategory,
  profile: UsageProfile,
): WeightMap {
  return WEIGHTS[categoryType]?.[profile] ?? {};
}

export const USAGE_PROFILES: UsageProfile[] = ["gaming", "workstation", "office"];
