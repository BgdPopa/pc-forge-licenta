import type { ProductCategory } from "@prisma/client";

// Operatorii suportați de constrângeri. Modelul este generic: o constrângere
// compară o valoare de pe componenta-sursă cu una de pe componenta-țintă.
export type CspOperator =
  | "EQUALS"
  | "NOT_EQUALS"
  | "GREATER_OR_EQUAL"
  | "LESS_OR_EQUAL"
  | "CONTAINS";

// Datele tehnice ale unei componente relevante pentru CSP. Câmpurile directe
// corespund coloanelor din tabelul `components`, iar `metadata` conține valori
// suplimentare nestructurate (ex. maxCoolerHeightMm, sockets).
export type ComponentData = {
  socket: string | null;
  ramType: string | null;
  formFactor: string | null;
  interfaceType: string | null;
  tdpWatts: number | null;
  powerWatts: number | null;
  lengthMm: number | null;
  heightMm: number | null;
  widthMm: number | null;
  metadata: Record<string, unknown> | null;
};

// O variabilă a problemei CSP: o categorie de componentă cu produsul ales în
// slotul respectiv. `component` poate fi null pentru produse fără date tehnice
// (ex. periferice), caz în care nu participă la constrângeri.
export type SelectedComponent = {
  productId: string;
  productName: string;
  categoryType: ProductCategory;
  component: ComponentData | null;
};

// O constrângere între două categorii de componente (variabile CSP). Provine
// din tabelul `compatibility_rules` și descrie o relație tehnică verificabilă.
export type CompatibilityConstraint = {
  id: string;
  name: string;
  description: string | null;
  sourceType: ProductCategory;
  targetType: ProductCategory;
  sourceField: string | null;
  targetField: string | null;
  operator: string | null;
};

// O încălcare detectată: constrângerea nu este satisfăcută de selecția curentă.
export type CspViolation = {
  ruleId: string;
  ruleName: string;
  description: string | null;
  sourceType: ProductCategory;
  targetType: ProductCategory;
  sourceProductName: string;
  targetProductName: string;
  sourceValue: unknown;
  targetValue: unknown;
  operator: CspOperator;
};

// O constrângere care nu a putut fi evaluată (lipsește o componentă din selecție
// sau un câmp necesar nu există nici direct, nici în metadata).
export type CspSkippedRule = {
  ruleId: string;
  ruleName: string;
  reason: "MISSING_SELECTION" | "MISSING_FIELD" | "INVALID_OPERATOR";
};

export type CspResult = {
  isValid: boolean;
  evaluatedCount: number;
  violations: CspViolation[];
  skipped: CspSkippedRule[];
};
