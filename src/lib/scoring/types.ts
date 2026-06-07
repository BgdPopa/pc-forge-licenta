import type { ProductCategory } from "@prisma/client";

// Profilurile de utilizare. Fiecare profil atribuie ponderi diferite
// atributelor de performanță ale unei componente.
export type UsageProfile = "gaming" | "workstation" | "office";

// Un atribut numeric de performanță extras din specificațiile unui produs.
export type PerformanceAttribute = {
  key: string;
  label: string;
  unit: string | null;
  value: number;
  // Pentru majoritatea atributelor o valoare mai mare înseamnă performanță mai
  // bună. Pentru atribute „cost" (ex. consum), o valoare mai mică e preferată.
  higherIsBetter: boolean;
};

// Datele de scoring pentru un produs, înainte de normalizare.
export type ScoringInput = {
  id: string;
  name: string;
  brand: string;
  price: number;
  categoryType: ProductCategory;
  attributes: PerformanceAttribute[];
};

// Contribuția unui atribut la scorul final, după normalizare și ponderare.
export type AttributeContribution = {
  key: string;
  label: string;
  rawValue: number;
  unit: string | null;
  normalized: number; // [0, 1]
  weight: number; // [0, 1]
};

// Rezultatul scoringului pentru un produs.
export type ScoredProduct = {
  id: string;
  name: string;
  brand: string;
  price: number;
  categoryType: ProductCategory;
  // Indicele de performanță ponderat, pe scara 0–10.
  performanceScore: number;
  // Scorul preț-performanță (valoare), pe scara 0–10.
  valueScore: number;
  contributions: AttributeContribution[];
};

// Ponderile pe atribut pentru o categorie și un profil.
export type WeightMap = Record<string, number>;
