import type { Metadata } from "next";
import { ProductCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import {
  ConfiguratorClient,
  type ConfiguratorProduct,
} from "@/components/configurator-client";
import type {
  CompatibilityConstraint,
  ComponentData,
} from "@/lib/csp/types";

export const metadata: Metadata = {
  title: "Configurator PC — PC Forge",
  description:
    "Configurează un sistem compatibil cu validare automată a constrângerilor între componente.",
};

// Sloturile configuratorului: categoriile de componente care participă la CSP.
// Perifericele și accesoriile sunt excluse (nu au constrângeri tehnice).
const BUILD_SLOTS: ProductCategory[] = [
  "CPU",
  "MOTHERBOARD",
  "RAM",
  "GPU",
  "STORAGE",
  "PSU",
  "CASE",
  "COOLER",
];

function toComponentData(
  component: {
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
  } | null,
): ComponentData | null {
  if (!component) return null;

  const metadata =
    component.metadata &&
    typeof component.metadata === "object" &&
    !Array.isArray(component.metadata)
      ? (component.metadata as Record<string, unknown>)
      : null;

  return {
    socket: component.socket,
    ramType: component.ramType,
    formFactor: component.formFactor,
    interfaceType: component.interfaceType,
    tdpWatts: component.tdpWatts,
    powerWatts: component.powerWatts,
    lengthMm: component.lengthMm,
    heightMm: component.heightMm,
    widthMm: component.widthMm,
    metadata,
  };
}

export default async function ConfiguratorPage() {
  const [dbProducts, dbRules] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true, categoryType: { in: BUILD_SLOTS } },
      include: { component: true },
      orderBy: { name: "asc" },
    }),
    prisma.compatibilityRule.findMany({ where: { isActive: true } }),
  ]);

  const products: ConfiguratorProduct[] = dbProducts.map((product) => ({
    id: product.id,
    name: product.name,
    brand: product.brand,
    price: Number(product.price),
    categoryType: product.categoryType,
    component: toComponentData(product.component),
  }));

  const constraints: CompatibilityConstraint[] = dbRules.map((rule) => ({
    id: rule.id,
    name: rule.name,
    description: rule.description,
    sourceType: rule.sourceType,
    targetType: rule.targetType,
    sourceField: rule.sourceField,
    targetField: rule.targetField,
    operator: rule.operator,
  }));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Configurator PC</h1>
          <p className="mt-2 max-w-2xl text-zinc-400">
            Alege componentele dorite, iar compatibilitatea este verificată
            automat ca o problemă de satisfacere a constrângerilor (CSP):
            socket procesor, tip memorie, putere sursă și dimensiuni de răcire.
          </p>
        </div>

        <ConfiguratorClient
          slots={BUILD_SLOTS}
          products={products}
          constraints={constraints}
        />
      </main>

      <SiteFooter />
    </div>
  );
}
