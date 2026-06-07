import type {
  AttributeContribution,
  ScoredProduct,
  ScoringInput,
  WeightMap,
} from "./types";

/**
 * Normalizare min-max a unei valori într-un interval [min, max] -> [0, 1].
 * Dacă toate valorile sunt egale (min === max), atributul nu diferențiază
 * produsele, deci întoarce o valoare neutră de 0.5.
 */
export function normalize(
  value: number,
  min: number,
  max: number,
  higherIsBetter: boolean,
): number {
  if (max === min) return 0.5;
  const ratio = (value - min) / (max - min);
  return higherIsBetter ? ratio : 1 - ratio;
}

type Range = { min: number; max: number };

/**
 * Calculează, pentru fiecare cheie de atribut, intervalul [min, max] al
 * valorilor din mulțimea de produse. Folosit la normalizarea în interiorul
 * categoriei (produsele se compară între ele, nu cu o referință absolută).
 */
function computeRanges(products: ScoringInput[]): Map<string, Range> {
  const ranges = new Map<string, Range>();
  for (const product of products) {
    for (const attr of product.attributes) {
      const current = ranges.get(attr.key);
      if (!current) {
        ranges.set(attr.key, { min: attr.value, max: attr.value });
      } else {
        current.min = Math.min(current.min, attr.value);
        current.max = Math.max(current.max, attr.value);
      }
    }
  }
  return ranges;
}

/**
 * Calculează indicele de performanță ponderat pentru un produs, pe scara 0–1.
 *
 * P(produs) = Σ ( w_k · norm_k ) / Σ w_k
 *
 * Suma ponderilor se face doar peste atributele efectiv prezente pe produs,
 * astfel încât lipsa unui atribut (ex. un HDD nu are viteză de citire SSD) nu
 * penalizează artificial produsul — ponderile se renormalizează la atributele
 * disponibile.
 */
function performanceIndex(
  product: ScoringInput,
  ranges: Map<string, Range>,
  weights: WeightMap,
): { index: number; contributions: AttributeContribution[] } {
  let weightedSum = 0;
  let totalWeight = 0;
  const contributions: AttributeContribution[] = [];

  for (const attr of product.attributes) {
    const weight = weights[attr.key] ?? 0;
    if (weight <= 0) continue;

    const range = ranges.get(attr.key);
    if (!range) continue;

    const normalized = normalize(
      attr.value,
      range.min,
      range.max,
      attr.higherIsBetter,
    );

    weightedSum += weight * normalized;
    totalWeight += weight;

    contributions.push({
      key: attr.key,
      label: attr.label,
      rawValue: attr.value,
      unit: attr.unit,
      normalized,
      weight,
    });
  }

  const index = totalWeight > 0 ? weightedSum / totalWeight : 0;
  return { index, contributions };
}

/**
 * Calculează scorurile pentru o mulțime de produse din aceeași categorie.
 *
 * - `performanceScore` (0–10): indicele de performanță ponderat.
 * - `valueScore` (0–10): raportul preț-performanță, normalizat în categorie.
 *   Se calculează ca performanță / preț, apoi se aduce pe scara 0–10 raportat
 *   la cel mai bun raport din categorie. Astfel, produsul cu cel mai bun raport
 *   preț-performanță primește scorul maxim.
 */
export function scoreProducts(
  products: ScoringInput[],
  weights: WeightMap,
): ScoredProduct[] {
  if (products.length === 0) return [];

  const ranges = computeRanges(products);

  const intermediate = products.map((product) => {
    const { index, contributions } = performanceIndex(
      product,
      ranges,
      weights,
    );
    const ratio = product.price > 0 ? index / product.price : 0;
    return { product, index, contributions, ratio };
  });

  const maxRatio = Math.max(...intermediate.map((entry) => entry.ratio), 0);

  return intermediate.map((entry) => ({
    id: entry.product.id,
    name: entry.product.name,
    brand: entry.product.brand,
    price: entry.product.price,
    categoryType: entry.product.categoryType,
    performanceScore: Math.round(entry.index * 100) / 10,
    valueScore:
      maxRatio > 0 ? Math.round((entry.ratio / maxRatio) * 100) / 10 : 0,
    contributions: entry.contributions,
  }));
}
