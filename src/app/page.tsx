import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { prisma } from "@/lib/prisma";
import { categoryLabels, type ProductCardData } from "@/types/product";

const technicalContributions = [
  {
    title: "Configurator CSP",
    description:
      "Compatibilitatea între componente este modelată ca o problemă de satisfacere a constrângerilor. Socket, RAM, sursă și factor de formă sunt validate în timp real.",
  },
  {
    title: "Scoring preț-performanță",
    description:
      "Fiecare produs primește un scor calculat din specificații, preț și profil de utilizare (gaming, workstation, office), cu ponderi ajustabile.",
  },
  {
    title: "Agent AI cu context din catalog",
    description:
      "Agentul specializat în hardware primește context dinamic din catalogul PC Forge, astfel încât răspunsurile despre produse și stoc rămân ancorate în datele actuale.",
  },
];

export default async function Home() {
  // Citire server-side din PostgreSQL prin Prisma Client.
  const [categories, dbProducts] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { price: "desc" },
      take: 8,
    }),
  ]);

  // Mapare model Prisma -> view-model UI (Decimal -> number, enum -> etichetă,
  // stock numeric -> boolean).
  const featuredProducts: ProductCardData[] = dbProducts.map((product) => ({
    id: product.id,
    name: product.name,
    brand: product.brand,
    categoryLabel: categoryLabels[product.categoryType],
    price: Number(product.price),
    shortDescription: product.shortDescription ?? product.description,
    inStock: product.stock > 0,
  }));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteHeader />

      <main>
        <section className="border-b border-zinc-800 bg-zinc-900/40">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-red-600">
              Magazin online de componente IT
            </p>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Construiește un PC compatibil, eficient și documentat pentru
              licență
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
              PC Forge combină catalogul de produse cu validare CSP, scoring
              preț-performanță și un agent AI ancorat în stocul curent — trei
              contribuții tehnice integrate într-o singură platformă.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/catalog"
                className="rounded-md bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500"
              >
                Explorează catalogul
              </Link>
              <a
                href="#contributii"
                className="rounded-md border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-zinc-200 transition-colors hover:border-red-600 hover:text-red-500"
              >
                Vezi contribuțiile tehnice
              </a>
            </div>
          </div>
        </section>

        <section id="contributii" className="border-b border-zinc-800">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Contribuții tehnice originale
            </h2>
            <p className="mt-3 max-w-2xl text-zinc-400">
              Elementele care diferențiază lucrarea față de un magazin online
              standard.
            </p>
            <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {technicalContributions.map((item) => (
                <li
                  key={item.title}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 p-6"
                >
                  <h3 className="text-lg font-semibold text-red-500">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                    {item.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-b border-zinc-800">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-2xl font-bold sm:text-3xl">Categorii</h2>
            <p className="mt-3 text-zinc-400">
              Navigare rapidă spre principalele familii de produse hardware.
            </p>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {categories.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/catalog?category=${category.type}`}
                    className="block h-full rounded-lg border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-red-600/50 hover:bg-zinc-900/80"
                  >
                    <h3 className="font-semibold text-zinc-100">
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="mt-2 text-sm text-zinc-500">
                        {category.description}
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Produse recomandate
            </h2>
            <p className="mt-3 text-zinc-400">
              Produse încărcate direct din baza de date PostgreSQL prin Prisma.
            </p>
            <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featuredProducts.map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
