import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { categoryLabels } from "@/types/product";

type PageProps = {
  params: { slug: string };
};

type SpecRow = { label: string; value: string };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
    select: { name: true, shortDescription: true, description: true },
  });

  if (!product) {
    return { title: "Produs negăsit — PC Forge" };
  }

  return {
    title: `${product.name} — PC Forge`,
    description: product.shortDescription ?? product.description,
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
    include: { component: true, category: true },
  });

  if (!product) {
    notFound();
  }

  // Specificații tehnice structurate din tabelul Component (alimentează CSP-ul).
  const componentSpecs: SpecRow[] = [];
  if (product.component) {
    const c = product.component;
    const push = (label: string, value: string | null | undefined) => {
      if (value !== null && value !== undefined && value !== "") {
        componentSpecs.push({ label, value });
      }
    };
    push("Socket", c.socket);
    push("Tip memorie", c.ramType);
    push("Factor de formă", c.formFactor);
    push("Interfață", c.interfaceType);
    push("TDP", c.tdpWatts != null ? `${c.tdpWatts} W` : null);
    push("Putere", c.powerWatts != null ? `${c.powerWatts} W` : null);
    push("Lungime", c.lengthMm != null ? `${c.lengthMm} mm` : null);
    push("Înălțime", c.heightMm != null ? `${c.heightMm} mm` : null);
    push("Lățime", c.widthMm != null ? `${c.widthMm} mm` : null);
  }

  // Specificații libere din câmpul Json `specifications`.
  const extraSpecs: SpecRow[] = [];
  const rawSpecs = product.specifications;
  if (rawSpecs && typeof rawSpecs === "object" && !Array.isArray(rawSpecs)) {
    for (const [key, value] of Object.entries(rawSpecs as Record<string, unknown>)) {
      if (value === null || value === undefined) continue;
      const display = typeof value === "boolean" ? (value ? "Da" : "Nu") : String(value);
      extraSpecs.push({ label: key, value: display });
    }
  }

  const inStock = product.stock > 0;
  const categoryLabel = categoryLabels[product.categoryType];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {/* Breadcrumb */}
        <nav className="mb-8 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
          <Link href="/catalog" className="hover:text-red-500">
            Catalog
          </Link>
          <span>/</span>
          <Link
            href={`/catalog?category=${product.categoryType}`}
            className="hover:text-red-500"
          >
            {product.category.name}
          </Link>
          <span>/</span>
          <span className="text-zinc-300">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          {/* Informații principale */}
          <div>
            <span className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-medium text-red-500">
              {categoryLabel}
            </span>
            <p className="mt-4 text-sm uppercase tracking-wide text-zinc-500">
              {product.brand}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              {product.name}
            </h1>
            <p className="mt-4 leading-relaxed text-zinc-300">
              {product.description}
            </p>

            {componentSpecs.length > 0 && (
              <section className="mt-10">
                <h2 className="text-lg font-semibold text-zinc-100">
                  Specificații tehnice
                </h2>
                <dl className="mt-4 divide-y divide-zinc-800 rounded-lg border border-zinc-800">
                  {componentSpecs.map((spec) => (
                    <div
                      key={spec.label}
                      className="flex justify-between gap-4 px-4 py-3"
                    >
                      <dt className="text-sm text-zinc-400">{spec.label}</dt>
                      <dd className="text-sm font-medium text-zinc-100">
                        {spec.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {extraSpecs.length > 0 && (
              <section className="mt-8">
                <h2 className="text-lg font-semibold text-zinc-100">
                  Detalii suplimentare
                </h2>
                <dl className="mt-4 divide-y divide-zinc-800 rounded-lg border border-zinc-800">
                  {extraSpecs.map((spec) => (
                    <div
                      key={spec.label}
                      className="flex justify-between gap-4 px-4 py-3"
                    >
                      <dt className="text-sm capitalize text-zinc-400">
                        {spec.label}
                      </dt>
                      <dd className="text-sm font-medium text-zinc-100">
                        {spec.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </div>

          {/* Panou preț și stoc */}
          <aside className="h-fit rounded-lg border border-zinc-800 bg-zinc-900 p-6 lg:sticky lg:top-24">
            <p className="text-sm text-zinc-500">Preț</p>
            <p className="mt-1 text-3xl font-bold text-red-500">
              {formatPrice(Number(product.price))}
            </p>

            <p
              className={`mt-4 text-sm font-medium ${
                inStock ? "text-emerald-400" : "text-zinc-500"
              }`}
            >
              {inStock ? `În stoc (${product.stock} buc.)` : "Stoc epuizat"}
            </p>

            <button
              type="button"
              disabled
              aria-disabled="true"
              className="mt-6 w-full cursor-not-allowed rounded-md bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-500"
            >
              Adaugă în coș
            </button>
            <p className="mt-2 text-center text-xs text-zinc-600">
              Coșul de cumpărături va fi disponibil într-o etapă viitoare.
            </p>
          </aside>
        </div>

        <div className="mt-12">
          <Link
            href="/catalog"
            className="text-sm font-medium text-red-500 hover:text-red-400"
          >
            ← Înapoi la catalog
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
