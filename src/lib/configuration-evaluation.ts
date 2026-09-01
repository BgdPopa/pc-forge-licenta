import type { ProductCategory } from "@prisma/client";
import { validateConfiguration } from "@/lib/csp/validator";
import type {
  CompatibilityConstraint,
  ComponentData,
  CspResult,
  SelectedComponent,
} from "@/lib/csp/types";

export const CONFIGURATOR_SLOTS: readonly ProductCategory[] = [
  "CPU",
  "MOTHERBOARD",
  "RAM",
  "GPU",
  "STORAGE",
  "PSU",
  "CASE",
  "COOLER",
];

export const POWER_OVERHEAD_W = 100;

export type ConfigurationProduct = {
  id: string;
  name: string;
  price: number;
  categoryType: ProductCategory;
  component: ComponentData | null;
};

export type PowerEvaluation = {
  cpuTdp: number;
  gpuTdp: number;
  overhead: number;
  estimated: number;
  available: number | null;
  sufficient: boolean | null;
};

export type ConfigurationEvaluation = {
  selectedComponents: SelectedComponent[];
  totalPrice: number;
  totalPower: number | null;
  isComplete: boolean;
  isValid: boolean;
  csp: CspResult;
  power: PowerEvaluation | null;
};

/**
 * Evaluează aceeași selecție atât pentru UI, cât și pentru salvarea server-side.
 * Produsele trebuie să provină deja din baza de date; categoria și prețul nu
 * sunt niciodată preluate din payload-ul browserului.
 */
export function evaluateConfiguration(
  products: ConfigurationProduct[],
  constraints: CompatibilityConstraint[],
): ConfigurationEvaluation {
  const selectedComponents: SelectedComponent[] = products.map((product) => ({
    productId: product.id,
    productName: product.name,
    categoryType: product.categoryType,
    component: product.component,
  }));

  const byCategory = new Map(
    products.map((product) => [product.categoryType, product] as const),
  );
  const totalPrice = products.reduce((sum, product) => sum + product.price, 0);
  const csp = validateConfiguration(selectedComponents, constraints);

  const cpuTdp = byCategory.get("CPU")?.component?.tdpWatts ?? 0;
  const gpuTdp = byCategory.get("GPU")?.component?.tdpWatts ?? 0;
  const psuPower = byCategory.get("PSU")?.component?.powerWatts ?? null;
  const hasPowerConsumers = cpuTdp > 0 || gpuTdp > 0;
  const power = hasPowerConsumers
    ? {
        cpuTdp,
        gpuTdp,
        overhead: POWER_OVERHEAD_W,
        estimated: cpuTdp + gpuTdp + POWER_OVERHEAD_W,
        available: psuPower,
        sufficient:
          psuPower === null
            ? null
            : psuPower >= cpuTdp + gpuTdp + POWER_OVERHEAD_W,
      }
    : null;

  const isComplete = CONFIGURATOR_SLOTS.every((slot) => byCategory.has(slot));
  const isValid =
    isComplete && csp.violations.length === 0 && power?.sufficient !== false;

  return {
    selectedComponents,
    totalPrice: Math.round(totalPrice * 100) / 100,
    totalPower: power?.estimated ?? null,
    isComplete,
    isValid,
    csp,
    power,
  };
}
