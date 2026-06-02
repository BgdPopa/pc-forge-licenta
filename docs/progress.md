# PC Forge — Progres implementare

Ultima actualizare: 3 iunie 2026

---

## Stadiu general: ~22% din lucrare

---

## Ce s-a făcut

### 1. Mediu de dezvoltare (100% complet)

- Node.js LTS `v22.22.0` și npm `11.13.0` instalate și verificate
- Git for Windows configurat global
- Docker Desktop `29.5.2` instalat și pornit
- Container PostgreSQL `pcforge-postgres` creat pe `postgres:16`, port `5432`
- pgAdmin 4 instalat cu conexiunea „PC Forge Local" configurată
- Visual Studio Code cu extensiile: ESLint, Prettier, Prisma, Tailwind CSS IntelliSense, GitLens, Error Lens, Thunder Client, DotENV, PostCSS Language Support
- Repository GitHub creat: `BgdPopa/pc-forge-licenta`, branch `main`
- Proiect Next.js creat în `C:\Users\bogdi\Desktop\LICENTA\pc-forge` cu:
  - Next.js `14.2.35`, React `18.3.1`, TypeScript `5.9.3`, Tailwind CSS `3.4.1`
  - App Router, `src/` directory, import alias `@/*`

---

### 2. Interfață statică — Homepage (100% complet)

Fișiere create:

**`src/types/product.ts`**
Tipurile `ProductCategory` (union type cu 8 valori) și `Product`. Baza TypeScript pentru toate datele de produs din aplicație.

**`src/data/products.ts`**
Array `featuredProducts` cu 4 produse temporare tipizate. Date mock care vor fi înlocuite ulterior cu interogări Prisma.

**`src/components/product-card.tsx`**
Componentă reutilizabilă (export numit `ProductCard`). Afișează categorie, brand, nume, descriere, preț formatat în RON, scor și stoc. Stil dark cu accente roșii, fără imagini deocamdată.

**`src/app/page.tsx`**
Homepage completă cu:
- Header sticky cu navigație (linkuri temporar `href="#"`)
- Secțiune hero cu titlu, descriere și butoane CTA
- Secțiune contribuții tehnice (CSP, scoring, agent AI)
- Grilă de categorii (toate cele 8 din enum)
- Secțiune produse recomandate cu `ProductCard`

**`src/app/layout.tsx`** (modificat)
Metadata actualizată: titlu și descriere PC Forge, `lang="ro"`.

**`src/app/globals.css`** (modificat)
Fundal și text dark fix (`zinc-950`), fără variabile CSS pentru light mode.

Criterii respectate: nicio dependență nouă, Tailwind CSS exclusiv, TypeScript strict, text în română cu diacritice, responsive desktop și mobil.

---

### 3. Schema bazei de date Prisma (100% complet)

**`prisma/schema.prisma`** — schema completă cu:

**Enum-uri:**
- `Role` — `USER`, `ADMIN`
- `ProductCategory` — `CPU`, `GPU`, `MOTHERBOARD`, `RAM`, `STORAGE`, `PSU`, `CASE`, `COOLER`, `PERIPHERAL`, `ACCESSORY`
- `CompatibilityRuleType` — 7 tipuri de reguli CSP + `CUSTOM`
- `OrderStatus` — `PENDING`, `CONFIRMED`, `CANCELLED`

**Modele:**
- `User` — cu `passwordHash` (nu `password`), `role`, relații la `Cart`, `Order`, `Configuration`
- `Category` — cu `slug` unic și `type ProductCategory`
- `Product` — cu `price Decimal @db.Decimal(10,2)`, `categoryType` denormalizat, `specifications Json?`
- `Component` — relație 1:1 cu `Product`, câmpuri tipizate pentru CSP: `socket`, `ramType`, `formFactor`, `interfaceType`, `tdpWatts`, `powerWatts`, `lengthMm`, `heightMm`, `widthMm`
- `CompatibilityRule` — reguli între **tipuri** (`sourceType`/`targetType`), nu produse concrete
- `Configuration` + `ConfigurationItem` — cu `@@unique([configurationId, categoryType])` (o categorie per slot în configurație)
- `Cart` + `CartItem`
- `Order` + `OrderItem` — cu snapshot (`productName`, `unitPrice`, `totalPrice`)

**Decizii tehnice documentate:**
- `Decimal` pentru prețuri în loc de `Float` — evită erori de precizie
- `passwordHash` — hash-ul parolei, nu parola în clar
- `categoryType` denormalizat în `Category`, `Product` și `Component` — pentru filtrare rapidă și CSP fără join-uri; consistența impusă în cod
- `CompatibilityRule` între tipuri — generalizare CSP
- Snapshot pe `OrderItem` — integritate istorică comenzi

---

### 4. Migrare bază de date (100% complet)

```
prisma/migrations/20260602205759_init/migration.sql
```

- Validat cu `npx prisma format` și `npx prisma validate`
- Aplicat cu `npx prisma migrate dev --name init`
- Rezultat: 12 tabele create în `pcforge_dev` (11 de business + `_prisma_migrations`)
- Verificat vizual în pgAdmin 4

---

### 5. Seed bază de date (100% complet)

**`prisma/seed.ts`** — seed idempotent (upsert), rulat cu `npx prisma db seed`:

- **10 categorii** — toate din enum `ProductCategory`, cu `name` în română, `slug` și `type`
- **19 produse** acoperind toate categoriile:
  - 2× CPU (AMD Ryzen 5 7600, Intel Core i5-13400F)
  - 2× GPU (RTX 4060, RX 7600)
  - 2× MOTHERBOARD (Gigabyte B650, MSI B760M)
  - 2× RAM (Kingston DDR5, Corsair DDR4)
  - 2× STORAGE (Samsung 980 NVMe, Seagate BarraCuda HDD)
  - 2× PSU (Corsair RM750e, Seasonic Focus GX-650)
  - 2× CASE (NZXT H5 Flow ATX, Fractal Design Pop Mini Micro-ATX)
  - 2× COOLER (be quiet! Pure Rock 2, Noctua NH-L9a-AM5 low-profile)
  - 2× PERIPHERAL (Logitech G502, Keychron K8)
  - 1× ACCESSORY (Arctic MX-4 pastă termică)
- **Înregistrări `Component`** pentru toate categoriile hardware (CPU→COOLER), cu câmpurile CSP: `socket`, `ramType`, `formFactor`, `tdpWatts`, `powerWatts`, `lengthMm`, `heightMm`
- **4 reguli de compatibilitate** demonstrative:
  - `CPU_SOCKET_MATCH` — CPU↔MOTHERBOARD pe câmpul `socket`
  - `RAM_TYPE_MATCH` — RAM↔MOTHERBOARD pe câmpul `ramType`
  - `PSU_POWER_SUFFICIENT` — PSU↔GPU pe `powerWatts ≥ tdpWatts`
  - `COOLER_HEIGHT_SUPPORTED` — COOLER↔CASE pe `heightMm ≤ maxCoolerHeightMm`
- Consistența `categoryType` impusă explicit: `Component.type` setat din aceeași sursă ca `Product.categoryType`
- Verificat în Prisma Studio (`npx prisma studio` la `localhost:5555`)

**`tsx`** instalat ca `devDependency` (`npm install -D tsx`) pentru rularea seed-ului TypeScript.

**`package.json`** actualizat cu `"prisma": { "seed": "tsx prisma/seed.ts" }`.

---

### 6. Documentație tehnică (100% complet)

**`docs/setup-log.md`** — jurnal de configurare cu:
- Specificații mașină de dezvoltare
- Rolul fiecărei aplicații și tehnologii
- Tabel stivă tehnologică cu versiuni
- Configurarea containerului PostgreSQL (fără credențiale reale)
- Structura proiectului comentată
- Comenzile rulate în ordine cronologică cu motivarea fiecăreia
- Deciziile tehnice formulate argumentat (pentru comisie)
- Istoricul commiturilor

---

### 7. Istoricul commiturilor

| Hash | Mesaj | Data |
|---|---|---|
| `5eff29a` | Initial commit from Create Next App | — |
| `992aab8` | Add initial PC Forge homepage | 2 iun. 2026 |
| `606a2d6` | Remove environment file from repository | 2 iun. 2026 |
| `a386113` | Ignore local environment files | 2 iun. 2026 |
| `8ba1e86` | Add initial Prisma database schema | 3 iun. 2026 |
| `454637b` | Add Prisma seed and development setup documentation | 3 iun. 2026 |

---

## Ce urmează (în ordine)

1. **`src/lib/prisma.ts`** — instanță singleton Prisma Client pentru Next.js (hot reload safe)
2. **Înlocuirea datelor mock** — `page.tsx` devine Server Component care citește produse reale din PostgreSQL
3. **Pagina `/catalog`** — filtrare server-side după `categoryType`, brand, preț; paginare
4. **Pagina `/catalog/[slug]`** — detalii produs cu `Component` și specificații
5. **Autentificare NextAuth.js** — JWT, credențiale, roluri USER/ADMIN, seed utilizatori cu `bcryptjs`
6. **Coș persistent** — `Cart` și `CartItem` legate de utilizatorul autentificat
7. **Checkout simulat** — flux `Order` + `OrderItem` fără poartă de plată
8. **Configurator CSP** — evaluarea regulilor din `CompatibilityRule` pe câmpurile din `Component`
9. **Scoring preț-performanță** — funcție cu ponderi pe profil gaming/workstation/office
10. **Agent AI cu context din catalog** — RAG cu injectare dinamică din baza de date
