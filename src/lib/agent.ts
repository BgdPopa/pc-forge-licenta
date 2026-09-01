import type { ProductCategory } from "@prisma/client";
import { extractAttributes } from "@/lib/scoring/attributes";
import { scoreProducts } from "@/lib/scoring/engine";
import { getWeights } from "@/lib/scoring/profiles";
import type { UsageProfile } from "@/lib/scoring/types";
import {
  CONFIGURATOR_SLOTS,
  evaluateConfiguration,
  type ConfigurationProduct,
} from "@/lib/configuration-evaluation";
import type {
  CompatibilityConstraint,
  ComponentData,
} from "@/lib/csp/types";

export const AGENT_LIMITS = {
  messageLength: 800,
  historyMessages: 12,
  historyMessageLength: 1_000,
  historyTotalLength: 12_000,
} as const;

export type AgentIntent =
  | "PRODUCT_SEARCH"
  | "PRODUCT_RECOMMENDATION"
  | "BUILD_RECOMMENDATION"
  | "COMPATIBILITY"
  | "GENERAL_HARDWARE";

export type AgentHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AgentRequest = {
  message: string;
  history: AgentHistoryMessage[];
};

export type AgentProduct = ConfigurationProduct & {
  slug: string;
  brand: string;
  stock: number;
  imageUrl: string | null;
  specifications: Record<string, unknown> | null;
};

export type AgentProductView = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  price: number;
  stock: number;
  imageUrl: string | null;
  categoryType: ProductCategory;
  performanceScore?: number;
  valueScore?: number;
};

export type AgentCompatibility = {
  isValid: boolean;
  evaluatedRules: number;
  violations: string[];
  powerSufficient: boolean | null;
};

export type AgentBuild = {
  products: AgentProductView[];
  totalPrice: number;
  totalPower: number | null;
  compatibility: AgentCompatibility;
  usesOnlyInStockProducts: boolean;
};

type ValidationResult =
  | { ok: true; data: AgentRequest }
  | { ok: false; error: string };

export function validateAgentRequest(payload: unknown): ValidationResult {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, error: "Payload invalid." };
  }

  const candidate = payload as Record<string, unknown>;
  if (typeof candidate.message !== "string") {
    return { ok: false, error: "Câmpul message este obligatoriu." };
  }

  const message = candidate.message.trim();
  if (!message) return { ok: false, error: "Mesajul nu poate fi gol." };
  if (message.length > AGENT_LIMITS.messageLength) {
    return {
      ok: false,
      error: `Mesajul poate avea cel mult ${AGENT_LIMITS.messageLength} de caractere.`,
    };
  }

  const historyValue = candidate.history ?? [];
  if (!Array.isArray(historyValue)) {
    return { ok: false, error: "Istoricul conversației este invalid." };
  }
  if (historyValue.length > AGENT_LIMITS.historyMessages) {
    return {
      ok: false,
      error: `Istoricul poate conține cel mult ${AGENT_LIMITS.historyMessages} mesaje.`,
    };
  }

  let totalLength = 0;
  const history: AgentHistoryMessage[] = [];
  for (const item of historyValue) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { ok: false, error: "Istoricul conversației este invalid." };
    }
    const entry = item as Record<string, unknown>;
    if (
      (entry.role !== "user" && entry.role !== "assistant") ||
      typeof entry.content !== "string" ||
      !entry.content.trim() ||
      entry.content.length > AGENT_LIMITS.historyMessageLength
    ) {
      return { ok: false, error: "Un mesaj din istoric este invalid." };
    }
    totalLength += entry.content.length;
    history.push({ role: entry.role, content: entry.content.trim() });
  }

  if (totalLength > AGENT_LIMITS.historyTotalLength) {
    return { ok: false, error: "Istoricul conversației este prea lung." };
  }

  return { ok: true, data: { message, history } };
}

export function detectAgentIntent(message: string): AgentIntent {
  const text = message.toLocaleLowerCase("ro-RO");
  if (/compatibil|compatibilitate|merge (?:cu|pe)|potrivit(?:ă|a)? (?:cu|pentru)/i.test(text)) {
    return "COMPATIBILITY";
  }
  if (/configura(?:ție|tie)|\bbuild\b|\bpc\b|calculator|sistem/i.test(text)) {
    return "BUILD_RECOMMENDATION";
  }
  if (/recomand|cel mai bun|cea mai bună|cele mai bune|ce să aleg|ce sa aleg|îmi trebuie|imi trebuie/i.test(text)) {
    return "PRODUCT_RECOMMENDATION";
  }
  if (/aveți|aveti|în stoc|in stoc|caut|arată|arata|listă|lista/i.test(text)) {
    return "PRODUCT_SEARCH";
  }
  return "GENERAL_HARDWARE";
}

/** Păstrează intentul unei întrebări anterioare pentru replici scurte de follow-up. */
export function resolveAgentIntent(
  message: string,
  history: AgentHistoryMessage[],
): AgentIntent {
  const directIntent = detectAgentIntent(message);
  if (directIntent !== "GENERAL_HARDWARE") return directIntent;

  const isFollowUp = /^(dar|și|si|atunci|iar|ok|bine|sub|maxim|p[aâ]n[aă])\b/i.test(
    message.trim(),
  );
  if (!isFollowUp) return directIntent;

  const previousUserMessage = [...history]
    .reverse()
    .find((entry) => entry.role === "user");
  return previousUserMessage
    ? detectAgentIntent(previousUserMessage.content)
    : directIntent;
}

function parseAmount(raw: string): number | null {
  const compact = raw.replace(/[.\s]/g, "").replace(",", ".");
  const value = Number(compact);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function parseBudget(message: string): number | null {
  const patterns = [
    /(?:sub|maxim(?:um)?|p[aâ]n[aă](?:\s+(?:în|in))?|buget(?:ul)?(?:\s+de)?)\s*:?[\s-]*(\d[\d.\s]*(?:,\d+)?)\s*(?:lei|ron)?/i,
    /(?:pc|calculator|configura(?:ție|tie)|build)[^\d\n]{0,30}(?:de|la)\s+(\d[\d.\s]*(?:,\d+)?)\s*(?:lei|ron)/i,
  ];
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) return parseAmount(match[1]);
  }
  return null;
}

export function resolveBudget(
  message: string,
  history: AgentHistoryMessage[],
): number | null {
  const currentBudget = parseBudget(message);
  if (currentBudget !== null) return currentBudget;
  const previousUserMessage = [...history]
    .reverse()
    .find((entry) => entry.role === "user");
  return previousUserMessage ? parseBudget(previousUserMessage.content) : null;
}

export function detectUsageProfile(message: string): UsageProfile {
  const text = message.toLocaleLowerCase("ro-RO");
  if (/workstation|productivitate|randare|render|editare|programare/i.test(text)) {
    return "workstation";
  }
  if (/office|birou|navigare|școală|scoala/i.test(text)) return "office";
  return "gaming";
}

function scoringSpecs(product: AgentProduct): Record<string, unknown> | null {
  const specs = { ...(product.specifications ?? {}) };
  if (product.component?.tdpWatts != null) {
    specs.tdpWatts = product.component.tdpWatts;
  }
  return Object.keys(specs).length > 0 ? specs : null;
}

export function scoreAgentProducts(
  products: AgentProduct[],
  profile: UsageProfile,
): AgentProductView[] {
  const scoreById = new Map<string, { performanceScore: number; valueScore: number }>();
  for (const category of Array.from(new Set(products.map((product) => product.categoryType)))) {
    const categoryProducts = products.filter(
      (product) => product.categoryType === category,
    );
    const scored = scoreProducts(
      categoryProducts.map((product) => ({
        id: product.id,
        name: product.name,
        brand: product.brand,
        price: product.price,
        categoryType: product.categoryType,
        attributes: extractAttributes(
          product.categoryType,
          scoringSpecs(product),
        ),
      })),
      getWeights(category, profile),
    );
    for (const result of scored) {
      scoreById.set(result.id, {
        performanceScore: result.performanceScore,
        valueScore: result.valueScore,
      });
    }
  }

  return products.map((product) => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    price: product.price,
    stock: product.stock,
    imageUrl: product.imageUrl,
    categoryType: product.categoryType,
    ...scoreById.get(product.id),
  }));
}

function compatibilityFromEvaluation(
  evaluation: ReturnType<typeof evaluateConfiguration>,
): AgentCompatibility {
  return {
    isValid:
      evaluation.csp.violations.length === 0 &&
      evaluation.power?.sufficient !== false,
    evaluatedRules: evaluation.csp.evaluatedCount,
    violations: evaluation.csp.violations.map((violation) => violation.ruleName),
    powerSufficient: evaluation.power?.sufficient ?? null,
  };
}

export function evaluateAgentCompatibility(
  products: AgentProduct[],
  constraints: CompatibilityConstraint[],
): AgentCompatibility {
  return compatibilityFromEvaluation(evaluateConfiguration(products, constraints));
}

function buildScore(product: AgentProductView): number {
  return (product.valueScore ?? 0) * 0.55 +
    (product.performanceScore ?? 0) * 0.45;
}

function findBuild(
  products: AgentProduct[],
  constraints: CompatibilityConstraint[],
  budget: number | null,
  profile: UsageProfile,
  onlyInStock: boolean,
): AgentBuild | null {
  const eligible = onlyInStock
    ? products.filter((product) => product.stock > 0)
    : products;
  const scored = scoreAgentProducts(eligible, profile);
  const scoredById = new Map(scored.map((product) => [product.id, product]));
  const candidates = new Map<ProductCategory, AgentProduct[]>();

  for (const slot of CONFIGURATOR_SLOTS) {
    const slotProducts = eligible
      .filter((product) => product.categoryType === slot)
      .sort((left, right) => {
        const scoreDifference =
          buildScore(scoredById.get(right.id)!) -
          buildScore(scoredById.get(left.id)!);
        return scoreDifference || left.price - right.price || left.name.localeCompare(right.name);
      })
      .slice(0, 5);
    if (slotProducts.length === 0) return null;
    candidates.set(slot, slotProducts);
  }

  let best: { products: AgentProduct[]; score: number; total: number } | null = null;

  function visit(index: number, selected: AgentProduct[], total: number, score: number) {
    if (budget !== null && total > budget) return;
    const evaluation = evaluateConfiguration(selected, constraints);
    if (evaluation.csp.violations.length > 0 || evaluation.power?.sufficient === false) {
      return;
    }

    if (index === CONFIGURATOR_SLOTS.length) {
      if (!evaluation.isValid) return;
      if (
        !best ||
        score > best.score ||
        (score === best.score && total > best.total)
      ) {
        best = { products: [...selected], score, total };
      }
      return;
    }

    const slot = CONFIGURATOR_SLOTS[index];
    for (const product of candidates.get(slot) ?? []) {
      const view = scoredById.get(product.id);
      visit(
        index + 1,
        [...selected, product],
        total + product.price,
        score + (view ? buildScore(view) : 0),
      );
    }
  }

  visit(0, [], 0, 0);
  if (!best) return null;

  const result = best as { products: AgentProduct[]; score: number; total: number };
  const evaluation = evaluateConfiguration(result.products, constraints);
  return {
    products: result.products.map((product) => scoredById.get(product.id)!),
    totalPrice: Math.round(result.total * 100) / 100,
    totalPower: evaluation.totalPower,
    compatibility: compatibilityFromEvaluation(evaluation),
    usesOnlyInStockProducts: result.products.every((product) => product.stock > 0),
  };
}

export function recommendBuild(
  products: AgentProduct[],
  constraints: CompatibilityConstraint[],
  budget: number | null,
  profile: UsageProfile,
): AgentBuild | null {
  return (
    findBuild(products, constraints, budget, profile, true) ??
    findBuild(products, constraints, budget, profile, false)
  );
}

export function toComponentData(component: {
  socket: string | null;
  ramType: string | null;
  formFactor: string | null;
  interfaceType: string | null;
  tdpWatts: number | null;
  powerWatts: number | null;
  lengthMm: number | null;
  heightMm: number | null;
  widthMm: number | null;
  metadata: unknown;
} | null): ComponentData | null {
  if (!component) return null;
  return {
    ...component,
    metadata:
      component.metadata &&
      typeof component.metadata === "object" &&
      !Array.isArray(component.metadata)
        ? (component.metadata as Record<string, unknown>)
        : null,
  };
}
