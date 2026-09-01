import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Prisma, ProductCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  detectUsageProfile,
  evaluateAgentCompatibility,
  recommendBuild,
  resolveAgentIntent,
  resolveBudget,
  scoreAgentProducts,
  toComponentData,
  validateAgentRequest,
  type AgentBuild,
  type AgentCompatibility,
  type AgentHistoryMessage,
  type AgentIntent,
  type AgentProduct,
  type AgentProductView,
} from "@/lib/agent";
import type { CompatibilityConstraint } from "@/lib/csp/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");
const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";
const GEMINI_TIMEOUT_MS = 25_000;

const SKIP_WORDS = new Set([
  "procesor", "procesoare", "placă", "placa", "placi", "memorie", "memorii",
  "stocare", "sursă", "sursa", "carcasă", "carcasa", "răcire", "racire",
  "ventilator", "periferic", "periferice", "accesoriu", "accesorii", "mai",
  "cel", "cea", "cei", "ale", "bun", "buna", "bune", "buni", "bună",
  "care", "pentru", "sau", "din", "una", "vreau", "vrei", "vrea", "cumpar",
  "cumpăr", "cumpara", "cumpără", "recomanda", "recomandă", "recomandati",
  "recomandați", "costa", "costă", "cat", "cât", "pret", "preț", "poti",
  "poți", "spune", "toate", "toti", "toți", "toata", "toată", "este", "esti",
  "ești", "sunt", "avem", "aveti", "aveți", "orice", "imi", "îmi", "sub",
  "maxim", "maximum", "buget", "ron", "lei",
]);

const CATEGORY_MAP: Record<string, ProductCategory> = {
  procesor: ProductCategory.CPU,
  procesoare: ProductCategory.CPU,
  cpu: ProductCategory.CPU,
  "placă video": ProductCategory.GPU,
  "placi video": ProductCategory.GPU,
  "placa video": ProductCategory.GPU,
  gpu: ProductCategory.GPU,
  "placă de bază": ProductCategory.MOTHERBOARD,
  "placa de baza": ProductCategory.MOTHERBOARD,
  motherboard: ProductCategory.MOTHERBOARD,
  ram: ProductCategory.RAM,
  memorie: ProductCategory.RAM,
  memorii: ProductCategory.RAM,
  stocare: ProductCategory.STORAGE,
  ssd: ProductCategory.STORAGE,
  hdd: ProductCategory.STORAGE,
  nvme: ProductCategory.STORAGE,
  sursă: ProductCategory.PSU,
  sursa: ProductCategory.PSU,
  psu: ProductCategory.PSU,
  carcasă: ProductCategory.CASE,
  carcasa: ProductCategory.CASE,
  case: ProductCategory.CASE,
  cooler: ProductCategory.COOLER,
  răcire: ProductCategory.COOLER,
  racire: ProductCategory.COOLER,
  ventilator: ProductCategory.COOLER,
  periferic: ProductCategory.PERIPHERAL,
  periferice: ProductCategory.PERIPHERAL,
  accesoriu: ProductCategory.ACCESSORY,
  accesorii: ProductCategory.ACCESSORY,
};

type ProductRaw = { id: string };

function detectCategories(message: string): ProductCategory[] {
  const lower = message.toLocaleLowerCase("ro-RO");
  const found = new Set<ProductCategory>();
  for (const [term, category] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(term)) found.add(category);
  }
  return Array.from(found);
}

function buildTsquery(query: string): string {
  return query
    .toLocaleLowerCase("ro-RO")
    .replace(/[^a-zăâîșț0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !SKIP_WORDS.has(word))
    .join(" & ");
}

async function searchProductIds(query: string): Promise<string[]> {
  const categories = detectCategories(query);
  const tsquery = buildTsquery(query);
  let results: ProductRaw[] = [];

  if (tsquery) {
    results = await prisma.$queryRaw<ProductRaw[]>(Prisma.sql`
      SELECT id
      FROM products
      WHERE "isActive" = true
        ${categories.length > 0
          ? Prisma.sql`AND "categoryType" = ANY(${categories}::"ProductCategory"[])`
          : Prisma.empty}
        AND to_tsvector('simple', name || ' ' || brand || ' ' || description || ' ' || COALESCE(specifications::text, ''))
            @@ to_tsquery('simple', ${tsquery})
      ORDER BY ts_rank(
        to_tsvector('simple', name || ' ' || brand || ' ' || description || ' ' || COALESCE(specifications::text, '')),
        to_tsquery('simple', ${tsquery})
      ) DESC
      LIMIT 10
    `);
  }

  if (results.length === 0 && categories.length > 0) {
    results = await prisma.$queryRaw<ProductRaw[]>(Prisma.sql`
      SELECT id FROM products
      WHERE "isActive" = true
        AND "categoryType" = ANY(${categories}::"ProductCategory"[])
      ORDER BY name LIMIT 10
    `);
  }

  if (results.length === 0 && !tsquery) {
    results = await prisma.$queryRaw<ProductRaw[]>(Prisma.sql`
      SELECT id FROM products WHERE "isActive" = true ORDER BY name LIMIT 10
    `);
  }
  return results.map((product) => product.id);
}

function asSpecifications(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

async function loadAgentProducts(ids?: string[]): Promise<AgentProduct[]> {
  const dbProducts = await prisma.product.findMany({
    where: { isActive: true, ...(ids ? { id: { in: ids } } : {}) },
    include: { component: true },
    orderBy: { name: "asc" },
  });
  const products = dbProducts.map((product): AgentProduct => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    price: Number(product.price),
    stock: product.stock,
    imageUrl: product.imageUrl,
    categoryType: product.categoryType,
    specifications: asSpecifications(product.specifications),
    component: toComponentData(product.component),
  }));
  if (!ids) return products;
  const order = new Map(ids.map((id, index) => [id, index]));
  return products.sort(
    (left, right) => (order.get(left.id) ?? 999) - (order.get(right.id) ?? 999),
  );
}

async function loadConstraints(): Promise<CompatibilityConstraint[]> {
  const rules = await prisma.compatibilityRule.findMany({ where: { isActive: true } });
  return rules.map((rule) => ({
    id: rule.id,
    name: rule.name,
    description: rule.description,
    sourceType: rule.sourceType,
    targetType: rule.targetType,
    sourceField: rule.sourceField,
    targetField: rule.targetField,
    operator: rule.operator,
  }));
}

function normalizeText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, " ").trim();
}

async function findMentionedProductIds(message: string): Promise<string[]> {
  const normalizedMessage = ` ${normalizeText(message)} `;
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });
  const matches = products
    .map((product) => {
      const normalizedName = normalizeText(product.name);
      const tokens = normalizedName.split(" ")
        .filter((token) => token.length >= 3 || /^\d{3,}$/.test(token));
      const hits = tokens.filter((token) => normalizedMessage.includes(` ${token} `)).length;
      return { id: product.id, exact: normalizedMessage.includes(` ${normalizedName} `), hits };
    })
    .filter((match) => match.exact || match.hits >= 2)
    .sort((left, right) => Number(right.exact) - Number(left.exact) || right.hits - left.hits);
  const exactMatches = matches.filter((match) => match.exact);
  return (exactMatches.length >= 2 ? exactMatches : matches)
    .slice(0, 8)
    .map((match) => match.id);
}

function productContext(products: AgentProductView[]): string {
  if (products.length === 0) return "Nu există produse relevante găsite în catalog.";
  return products.map((product) =>
    `- ${product.name} (${product.brand}), ${product.categoryType}, ${product.price.toFixed(2)} RON, ` +
    `${product.stock > 0 ? `${product.stock} în stoc` : "stoc epuizat"}`,
  ).join("\n");
}

function buildContext(build: AgentBuild): string {
  return [
    "Configurație calculată și validată determinist de aplicație:",
    ...build.products.map(
      (product) => `- ${product.categoryType}: ${product.name} — ${product.price.toFixed(2)} RON`,
    ),
    `Total: ${build.totalPrice.toFixed(2)} RON`,
    `Consum estimat: ${build.totalPower ?? "necunoscut"} W`,
    `Compatibilitate: ${build.compatibility.isValid ? "validă" : "invalidă"}`,
  ].join("\n");
}

const SYSTEM_PROMPT = `Ești asistentul virtual PC Forge, specializat în componente PC.
Răspunzi în română, concis, prietenos și fără formatare Markdown.
Folosești exclusiv produsele și rezultatele determinate de aplicație din context.
Nu inventezi produse, prețuri, stocuri sau compatibilități.
Nu contrazici rezultatul CSP și nu declari compatibil un build nevalidat.
Când recomanzi produse, menționezi numele, prețul și un motiv scurt.`;

async function askGemini(
  message: string,
  history: AgentHistoryMessage[],
  context: string,
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: { maxOutputTokens: 500, temperature: 0.35 },
  });
  const chat = model.startChat({
    history: history.map((entry) => ({
      role: entry.role === "assistant" ? "model" : "user",
      parts: [{ text: entry.content }],
    })),
  });
  const request = chat.sendMessage(`${context}\n\nÎntrebarea utilizatorului: ${message}`);
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error("GEMINI_TIMEOUT")),
      GEMINI_TIMEOUT_MS,
    );
  });
  try {
    const result = await Promise.race([request, timeout]);
    return result.response.text().trim();
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function impossibleBuildReply(budget: number | null): string {
  return budget
    ? `Nu am găsit în catalog o configurație completă și compatibilă în limita de ${budget.toFixed(0)} RON.`
    : "Nu am găsit în catalog o configurație completă care să treacă toate verificările de compatibilitate.";
}

export async function POST(req: NextRequest) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Payload JSON invalid." }, { status: 400 });
  }

  const validation = validateAgentRequest(payload);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { message, history } = validation.data;
  const intent: AgentIntent = resolveAgentIntent(message, history);
  const budget = resolveBudget(message, history);
  const profile = detectUsageProfile(message);

  try {
    if (intent === "BUILD_RECOMMENDATION") {
      const [products, constraints] = await Promise.all([
        loadAgentProducts(), loadConstraints(),
      ]);
      const build = recommendBuild(products, constraints, budget, profile);
      if (!build) {
        return NextResponse.json({
          reply: impossibleBuildReply(budget), intent, products: [], build: null,
          totalPrice: null, compatibility: null,
        });
      }
      const reply = await askGemini(message, history, buildContext(build));
      return NextResponse.json({
        reply, intent, products: build.products, build,
        totalPrice: build.totalPrice, compatibility: build.compatibility,
      });
    }

    const [retrievedIds, mentionedIds] = await Promise.all([
      searchProductIds(message).catch(() => []),
      findMentionedProductIds(message),
    ]);
    const orderedIds = Array.from(new Set([...mentionedIds, ...retrievedIds]));
    let products = await loadAgentProducts(orderedIds);
    if (budget !== null) products = products.filter((product) => product.price <= budget);
    let productViews = scoreAgentProducts(products, profile);
    if (intent === "PRODUCT_RECOMMENDATION") {
      productViews = productViews.sort((left, right) =>
        (right.valueScore ?? 0) - (left.valueScore ?? 0) ||
        (right.performanceScore ?? 0) - (left.performanceScore ?? 0),
      ).slice(0, 6);
    } else {
      productViews = productViews.slice(0, 6);
    }

    let compatibility: AgentCompatibility | null = null;
    let compatibilityText = "";
    if (intent === "COMPATIBILITY" && products.length >= 2) {
      const mentionedSet = new Set(mentionedIds);
      const compatibilityCandidates = mentionedIds.length >= 2
        ? products.filter((product) => mentionedSet.has(product.id))
        : products;
      const byCategory = new Map<ProductCategory, AgentProduct>();
      for (const product of compatibilityCandidates) {
        if (!byCategory.has(product.categoryType)) {
          byCategory.set(product.categoryType, product);
        }
      }
      const distinctProducts = Array.from(byCategory.values());
      compatibility = evaluateAgentCompatibility(distinctProducts, await loadConstraints());
      compatibilityText = `\nCompatibilitate calculată de CSP: ${compatibility.isValid ? "validă" : "invalidă"}.`;
      if (compatibility.violations.length > 0) {
        compatibilityText += ` Reguli încălcate: ${compatibility.violations.join(", ")}.`;
      }
    }

    const reply = await askGemini(
      message,
      history,
      `Intent detectat: ${intent}.\n${productContext(productViews)}${compatibilityText}`,
    );
    return NextResponse.json({
      reply, intent, products: productViews, build: null,
      totalPrice: null, compatibility,
    });
  } catch (error: unknown) {
    console.error("[agent] error:", error);
    if (error instanceof Error && error.message === "GEMINI_TIMEOUT") {
      return NextResponse.json(
        { error: "Agentul a depășit timpul de răspuns. Încearcă din nou." },
        { status: 504 },
      );
    }
    if (typeof error === "object" && error !== null && "status" in error &&
        (error as { status: number }).status === 429) {
      return NextResponse.json(
        { error: "Limita Gemini a fost atinsă. Încearcă din nou în câteva secunde." },
        { status: 429 },
      );
    }
    return NextResponse.json(
      { error: "Eroare internă. Încearcă din nou." },
      { status: 500 },
    );
  }
}
