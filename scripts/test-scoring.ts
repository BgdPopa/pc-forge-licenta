import type { ProductCategory } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { extractAttributes } from "../src/lib/scoring/attributes";
import { scoreProducts } from "../src/lib/scoring/engine";
import { getWeights } from "../src/lib/scoring/profiles";
import type { ScoringInput, UsageProfile } from "../src/lib/scoring/types";

async function scoreCategory(category: ProductCategory, profile: UsageProfile) {
  const products = await prisma.product.findMany({
    where: { categoryType: category, isActive: true },
  });

  const inputs: ScoringInput[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    price: Number(p.price),
    categoryType: p.categoryType,
    attributes: extractAttributes(
      category,
      p.specifications as Record<string, unknown> | null,
    ),
  }));

  const results = scoreProducts(inputs, getWeights(category, profile));

  console.log(`\n=== ${category} / profil: ${profile} ===`);
  for (const r of results) {
    console.log(
      `${r.name} (${r.brand}) — preț ${r.price} | performanță ${r.performanceScore} | valoare ${r.valueScore}`,
    );
    for (const c of r.contributions) {
      console.log(
        `    ${c.label}: ${c.rawValue}${c.unit ?? ""} -> norm ${c.normalized.toFixed(2)} (pondere ${c.weight})`,
      );
    }
  }
}

async function main() {
  await scoreCategory("CPU", "gaming");
  await scoreCategory("CPU", "workstation");
  await scoreCategory("RAM", "gaming");
  await scoreCategory("STORAGE", "office");
}

main().finally(() => prisma.$disconnect());
