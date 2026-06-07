import type { ProductCategory } from "@prisma/client";
import type {
  CompatibilityConstraint,
  ComponentData,
  CspOperator,
  CspResult,
  CspViolation,
  CspSkippedRule,
  SelectedComponent,
} from "./types";

const DIRECT_FIELDS: ReadonlySet<string> = new Set([
  "socket",
  "ramType",
  "formFactor",
  "interfaceType",
  "tdpWatts",
  "powerWatts",
  "lengthMm",
  "heightMm",
  "widthMm",
]);

const VALID_OPERATORS: ReadonlySet<string> = new Set<CspOperator>([
  "EQUALS",
  "NOT_EQUALS",
  "GREATER_OR_EQUAL",
  "LESS_OR_EQUAL",
  "CONTAINS",
]);

/**
 * Rezolvă valoarea unui câmp pe o componentă, cu fallback în `metadata`.
 * Întâi caută printre coloanele directe ale componentei; dacă nu există acolo
 * (sau este null), caută cheia în obiectul JSON `metadata`. Întoarce `undefined`
 * dacă valoarea nu poate fi găsită în niciuna dintre surse.
 */
export function resolveField(
  component: ComponentData,
  field: string,
): unknown {
  if (DIRECT_FIELDS.has(field)) {
    const value = (component as unknown as Record<string, unknown>)[field];
    if (value !== null && value !== undefined) {
      return value;
    }
  }

  if (
    component.metadata &&
    Object.prototype.hasOwnProperty.call(component.metadata, field)
  ) {
    const value = component.metadata[field];
    if (value !== null && value !== undefined) {
      return value;
    }
  }

  return undefined;
}

/**
 * Aplică un operator de comparație între valoarea sursă și cea țintă.
 * Comparațiile numerice forțează conversia la număr; `CONTAINS` verifică
 * apartenența valorii sursă într-un array țintă (ex. socket în lista de
 * socket-uri suportate de un cooler).
 */
export function applyOperator(
  operator: CspOperator,
  sourceValue: unknown,
  targetValue: unknown,
): boolean {
  switch (operator) {
    case "EQUALS":
      return sourceValue === targetValue;
    case "NOT_EQUALS":
      return sourceValue !== targetValue;
    case "GREATER_OR_EQUAL":
      return Number(sourceValue) >= Number(targetValue);
    case "LESS_OR_EQUAL":
      return Number(sourceValue) <= Number(targetValue);
    case "CONTAINS":
      return Array.isArray(targetValue) && targetValue.includes(sourceValue);
    default:
      return false;
  }
}

/**
 * Validează o selecție de componente (variabilele CSP) față de un set de
 * constrângeri de compatibilitate. Pentru fiecare constrângere caută produsele
 * alese pentru categoriile sursă și țintă; dacă ambele există și câmpurile pot
 * fi rezolvate, aplică operatorul. Constrângerile care nu pot fi evaluate sunt
 * raportate separat, fără a fi tratate drept încălcări.
 */
export function validateConfiguration(
  selection: SelectedComponent[],
  constraints: CompatibilityConstraint[],
): CspResult {
  // Indexare după categorie: o singură componentă per categorie (slot).
  const byCategory = new Map<ProductCategory, SelectedComponent>();
  for (const item of selection) {
    byCategory.set(item.categoryType, item);
  }

  const violations: CspViolation[] = [];
  const skipped: CspSkippedRule[] = [];
  let evaluatedCount = 0;

  for (const constraint of constraints) {
    const operator = constraint.operator ?? "";
    if (!VALID_OPERATORS.has(operator)) {
      skipped.push({
        ruleId: constraint.id,
        ruleName: constraint.name,
        reason: "INVALID_OPERATOR",
      });
      continue;
    }

    const source = byCategory.get(constraint.sourceType);
    const target = byCategory.get(constraint.targetType);

    // Dacă vreuna dintre componentele implicate nu este selectată sau nu are
    // date tehnice, constrângerea nu se aplică încă.
    if (!source?.component || !target?.component) {
      skipped.push({
        ruleId: constraint.id,
        ruleName: constraint.name,
        reason: "MISSING_SELECTION",
      });
      continue;
    }

    if (!constraint.sourceField || !constraint.targetField) {
      skipped.push({
        ruleId: constraint.id,
        ruleName: constraint.name,
        reason: "MISSING_FIELD",
      });
      continue;
    }

    const sourceValue = resolveField(source.component, constraint.sourceField);
    const targetValue = resolveField(target.component, constraint.targetField);

    if (sourceValue === undefined || targetValue === undefined) {
      skipped.push({
        ruleId: constraint.id,
        ruleName: constraint.name,
        reason: "MISSING_FIELD",
      });
      continue;
    }

    evaluatedCount += 1;

    const satisfied = applyOperator(
      operator as CspOperator,
      sourceValue,
      targetValue,
    );

    if (!satisfied) {
      violations.push({
        ruleId: constraint.id,
        ruleName: constraint.name,
        description: constraint.description,
        sourceType: constraint.sourceType,
        targetType: constraint.targetType,
        sourceProductName: source.productName,
        targetProductName: target.productName,
        sourceValue,
        targetValue,
        operator: operator as CspOperator,
      });
    }
  }

  return {
    isValid: violations.length === 0,
    evaluatedCount,
    violations,
    skipped,
  };
}
