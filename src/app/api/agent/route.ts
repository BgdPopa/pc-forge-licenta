import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import { ProductCategory } from "@prisma/client";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");
const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

interface Message {
  role: "user" | "assistant";
  content: string;
}

// Mapare termeni româno-englezi → valori enum ProductCategory
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

function detectCategories(message: string): ProductCategory[] {
  const lower = message.toLowerCase();
  const found = new Set<ProductCategory>();
  for (const [term, cat] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(term)) found.add(cat);
  }
  return Array.from(found);
}

type ProductRaw = {
  id: string;
  name: string;
  brand: string;
  description: string;
  price: unknown;
  stock: number;
  categoryType: string;
  specifications: unknown;
};

async function searchProducts(query: string): Promise<ProductRaw[]> {
  const categories = detectCategories(query);

  // Construiește un tsquery sigur din cuvintele din mesaj
  const words = query
    .toLowerCase()
    .replace(/[^a-zăâîșțA-ZĂÂÎȘȚ0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  // Dacă nu există cuvinte utilizabile, fallback la categorii sau top produse
  if (words.length === 0) {
    if (categories.length > 0) {
      return prisma.$queryRaw<ProductRaw[]>`
        SELECT id, name, brand, description, price::text as price,
               stock, "categoryType"::text, specifications
        FROM products
        WHERE "isActive" = true
          AND "categoryType" = ANY(${categories}::"ProductCategory"[])
        ORDER BY name
        LIMIT 10
      `;
    }
    return prisma.$queryRaw<ProductRaw[]>`
      SELECT id, name, brand, description, price::text as price,
             stock, "categoryType"::text, specifications
      FROM products
      WHERE "isActive" = true
      ORDER BY name
      LIMIT 10
    `;
  }

  const tsquery = words.join(" & ");

  if (categories.length > 0) {
    return prisma.$queryRaw<ProductRaw[]>`
      SELECT id, name, brand, description, price::text as price,
             stock, "categoryType"::text, specifications,
             ts_rank(
               to_tsvector('simple', name || ' ' || brand || ' ' || description),
               to_tsquery('simple', ${tsquery})
             ) AS rank
      FROM products
      WHERE "isActive" = true
        AND "categoryType" = ANY(${categories}::"ProductCategory"[])
        AND to_tsvector('simple', name || ' ' || brand || ' ' || description)
            @@ to_tsquery('simple', ${tsquery})
      ORDER BY rank DESC
      LIMIT 10
    `;
  }

  return prisma.$queryRaw<ProductRaw[]>`
    SELECT id, name, brand, description, price::text as price,
           stock, "categoryType"::text, specifications,
           ts_rank(
             to_tsvector('simple', name || ' ' || brand || ' ' || description),
             to_tsquery('simple', ${tsquery})
           ) AS rank
    FROM products
    WHERE "isActive" = true
      AND to_tsvector('simple', name || ' ' || brand || ' ' || description)
          @@ to_tsquery('simple', ${tsquery})
    ORDER BY rank DESC
    LIMIT 10
  `;
}

function buildContext(products: ProductRaw[]): string {
  if (products.length === 0) return "Nu am găsit produse relevante în catalog.";

  return products
    .map((p) => {
      const specs =
        p.specifications && typeof p.specifications === "object"
          ? Object.entries(p.specifications as Record<string, unknown>)
              .slice(0, 5)
              .map(([k, v]) => `${k}: ${v}`)
              .join(", ")
          : "";
      const stoc = p.stock > 0 ? `${p.stock} în stoc` : "stoc epuizat";
      return `- ${p.name} (${p.brand}) | ${p.categoryType} | ${Number(p.price).toFixed(2)} RON | ${stoc}${specs ? ` | ${specs}` : ""}`;
    })
    .join("\n");
}

const SYSTEM_PROMPT = `Ești asistentul virtual al magazinului PC Forge, specializat în componente și periferice pentru calculator.
Răspunzi în română, concis și prietenos, folosind diacritice corecte (ș, ț, ă, â, î).
Folosești exclusiv produsele din contextul furnizat pentru recomandări.
Dacă produsul solicitat nu există în context, spui că nu este disponibil momentan în catalog.
Nu inventezi prețuri, specificații sau produse care nu apar în context.
Când recomanzi produse, menționează numele, prețul și un motiv scurt.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message: string = body.message ?? "";
    const history: Message[] = Array.isArray(body.history) ? body.history : [];

    if (!message.trim()) {
      return NextResponse.json(
        { error: "Mesajul nu poate fi gol." },
        { status: 400 }
      );
    }

    // RAG: caută produse relevante
    let products: ProductRaw[] = [];
    try {
      products = await searchProducts(message);
    } catch {
      // Fallback silent — agentul răspunde fără context de produse
    }

    const contextBlock = buildContext(products);
    const userMessageWithContext = `Catalog relevant:\n${contextBlock}\n\nÎntrebarea utilizatorului: ${message}`;

    const model = genAI.getGenerativeModel({
      model: MODEL,
      systemInstruction: SYSTEM_PROMPT,
    });

    const chatHistory = history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({ history: chatHistory });
    const result = await chat.sendMessage(userMessageWithContext);
    const assistantText = result.response.text();

    return NextResponse.json({ reply: assistantText });
  } catch (error: unknown) {
    console.error("[agent] error:", error);
    if (
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      (error as { status: number }).status === 429
    ) {
      return NextResponse.json(
        { error: "Limita de cereri a fost atinsă. Încearcă din nou în câteva secunde." },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: "Eroare internă. Încearcă din nou." },
      { status: 500 }
    );
  }
}
