import Image from "next/image";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { prisma } from "@/lib/prisma";
import { categoryLabels, type ProductCardData } from "@/types/product";


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
    slug: product.slug,
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
        <section className="relative min-h-[720px] overflow-hidden border-b border-zinc-800 bg-zinc-950">
          {/* Imaginea full-width, ancorată sus-dreapta — personajul și PC-ul vizibile în dreapta */}
          <Image
            src="/images/hero-bg.jpg"
            alt="PC Forge — atelier futurist de forjare hardware"
            fill
            priority
            sizes="100vw"
            className="object-cover object-right-top"
          />

          {/* Overlay cu stop precis: prima 45% din lățime complet întunecată,
              apoi fade rapid spre transparent — creează zona de text curată în stânga */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to right, #09090b 0%, #09090b 42%, rgba(9,9,11,0.65) 58%, rgba(9,9,11,0.05) 78%)",
            }}
          />
          {/* Gradient de jos: ancorare cu restul paginii */}
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-zinc-950 to-transparent" />

          {/* Grid 2 coloane: text ancorat la marginea stângă, conținut pornește de sus */}
          <div className="relative z-10 grid w-full grid-cols-1 items-start pl-4 pr-4 sm:pl-8 sm:pr-6 lg:grid-cols-[minmax(0,540px)_1fr] lg:pl-12 xl:pl-20 2xl:pl-28">
            {/* Coloana stângă — padding-top explicit, nu centrare verticală */}
            <div className="pb-16 pt-28 sm:pb-20 sm:pt-32">
              <p className="mb-4 text-sm font-medium uppercase tracking-widest text-red-500">
                Magazin online de componente IT
              </p>
              <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-[3.5rem]">
                Construiește un PC perfect, componentă cu componentă
              </h1>
              <p className="mt-6 max-w-sm text-base leading-relaxed text-zinc-300 sm:text-lg">
                Catalog complet, verificare automată a compatibilității, scoring
                preț-performanță și un asistent AI specializat în hardware.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/catalog"
                  className="rounded-md bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-900/30 transition-colors hover:bg-red-500"
                >
                  Explorează catalogul
                </Link>
                <Link
                  href="/configurator"
                  className="rounded-md border border-zinc-600 px-6 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:border-red-500 hover:text-red-400"
                >
                  Configurator CSP
                </Link>
              </div>

              {/* Stats rapide */}
              <div className="mt-12 flex flex-wrap gap-8 border-t border-zinc-800/60 pt-8">
                <div>
                  <p className="text-2xl font-bold text-white">CSP</p>
                  <p className="mt-0.5 text-xs text-zinc-500">Compatibilitate verificată</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">AI</p>
                  <p className="mt-0.5 text-xs text-zinc-500">Asistent specializat hardware</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">10</p>
                  <p className="mt-0.5 text-xs text-zinc-500">Categorii de produse</p>
                </div>
              </div>
            </div>

            {/* Coloana dreaptă — goală intenționat, imaginea se vede prin overlay */}
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

        {/* De ce PC Forge? */}
        <section className="border-b border-zinc-800">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-2xl font-bold sm:text-3xl">De ce PC Forge?</h2>
            <p className="mt-3 max-w-2xl text-zinc-400">
              Trei funcționalități tehnice care diferențiază platforma de un magazin online obișnuit.
            </p>
            <ul className="mt-10 grid gap-6 sm:grid-cols-3">
              <li className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-red-600/10 text-red-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-zinc-100">Compatibilitate verificată</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  CSP verifică relațiile tehnice dintre componente: socket, RAM, sursă, carcasă și răcire. Incompatibilitățile sunt semnalate în timp real.
                </p>
              </li>
              <li className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-red-600/10 text-red-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-zinc-100">Scoring transparent</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  Fiecare componentă primește scoruri de performanță și valoare calculate din specificații și preț, astfel încât să poți compara produse din aceeași categorie.
                </p>
              </li>
              <li className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-red-600/10 text-red-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-zinc-100">Asistent specializat</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  Agentul AI răspunde folosind catalogul actual al aplicației, nu doar informații generale. Recomandările sunt ancorate în produsele și stocul curent.
                </p>
              </li>
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-b border-zinc-800">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-2xl font-bold sm:text-3xl">Întrebări frecvente</h2>
            <p className="mt-3 text-zinc-400">
              Răspunsuri la cele mai comune întrebări despre platformă.
            </p>
            <ul className="mt-10 space-y-4">
              <li className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
                <h3 className="font-semibold text-zinc-100">Cum funcționează verificarea compatibilității?</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  Aplicația tratează componentele selectate ca variabile și verifică regulile de compatibilitate definite în baza de date — de exemplu socket-ul procesorului, tipul memoriei RAM și puterea sursei de alimentare.
                </p>
              </li>
              <li className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
                <h3 className="font-semibold text-zinc-100">Ce înseamnă scorul de valoare?</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  Scorul de valoare compară raportul dintre performanță și preț în interiorul aceleiași categorii, astfel încât produsele să fie evaluate relativ la alternative similare disponibile în catalog.
                </p>
              </li>
              <li className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
                <h3 className="font-semibold text-zinc-100">Plata este reală?</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  Nu. Fluxul de checkout este simulativ și este folosit pentru demonstrarea arhitecturii unui magazin online. Nicio tranzacție reală nu este procesată.
                </p>
              </li>
              <li className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
                <h3 className="font-semibold text-zinc-100">Pot salva o configurație?</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  În versiunea curentă, configurația poate fi selectată și validată în pagină. Salvarea configurațiilor în cont este prevăzută ca extensie viitoare, deoarece schema bazei de date include deja tabelele necesare.
                </p>
              </li>
            </ul>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Produse recomandate
            </h2>
            <p className="mt-3 text-zinc-400">
              Cele mai noi adăugiri din catalog, disponibile imediat.
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
