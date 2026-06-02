# PC Forge — Jurnal de configurare a mediului de dezvoltare

Acest document înregistrează mediul de dezvoltare, aplicațiile instalate, comenzile rulate și rolul fiecărei tehnologii utilizate în proiectul **PC Forge**. Este destinat documentației de licență și nu conține date sensibile sau credențiale reale.

---

## 1. Mașina de dezvoltare

| Proprietate       | Valoare                                                                            |
| ----------------- | ---------------------------------------------------------------------------------- |
| Sistem de operare | Windows 10 (build 19045)                                                           |
| Shell principal   | Command Prompt (cmd) — PowerShell blocat din cauza politicii de execuție scripturi |
| Editor            | Visual Studio Code                                                                 |
| Node.js           | v22.22.0 (LTS)                                                                     |
| npm               | 11.13.0                                                                            |
| Git               | for Windows, configurat global                                                     |
| Docker Desktop    | 29.5.2                                                                             |

---

## 2. Aplicații instalate și rolul lor

### Node.js LTS

Runtime JavaScript pe server, necesar pentru rularea Next.js și a comenzilor npm/npx.

### npm

Manager de pachete pentru instalarea dependențelor proiectului și rularea scripturilor definite în `package.json`.

### Git for Windows

Control al versiunilor. Repository-ul proiectului este hostat pe GitHub la adresa `BgdPopa/pc-forge-licenta`. Branch-ul principal este `main`.

### Visual Studio Code

Editor principal, cu extensiile: ESLint, Prettier, Prisma, Tailwind CSS IntelliSense, GitLens, Error Lens, Thunder Client, DotENV, PostCSS Language Support.

### Docker Desktop

Rulează containerul local PostgreSQL pentru baza de date de development. Elimină nevoia de o instalare nativă a PostgreSQL și permite resetarea completă a mediului prin recrearea containerului.

### pgAdmin 4

Interfață grafică pentru inspecția vizuală a bazei de date PostgreSQL locale. Folosit pentru verificarea tabelelor și datelor după migrări și seed.

### Prisma Studio

Interfață web integrată în pachetul Prisma, disponibilă prin `npx prisma studio`. Folosit pentru inspecția rapidă a datelor în timpul dezvoltării, fără a folosi SQL direct.

---

## 3. Stiva tehnologică și rolul fiecărei tehnologii

| Tehnologie     | Versiune    | Rol în proiect                                                                                                                                           |
| -------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js        | 14.2.35     | Framework principal, cu App Router. Gestionează rutele, Server Components, SSR și SSG.                                                                   |
| React          | 18.3.1      | Bibliotecă UI. Componentele aplicației sunt scrise în React.                                                                                             |
| TypeScript     | 5.9.3       | Tipizare statică strictă. Asigură corectitudinea tipurilor în întreg proiectul.                                                                          |
| Tailwind CSS   | 3.4.1       | Framework CSS utility-first. Toate stilurile sunt scrise cu clase Tailwind, fără fișiere CSS separate.                                                   |
| Prisma ORM     | 5.22.0      | Mapare obiect-relațională. Schema bazei de date este definită în `prisma/schema.prisma`, iar accesul la date se face prin Prisma Client generat automat. |
| @prisma/client | 5.22.0      | Client TypeScript generat de Prisma, folosit în Server Components și API routes pentru interogări type-safe.                                             |
| PostgreSQL     | 16 (Docker) | Baza de date relațională principală. Rulează local într-un container Docker. Va fi migrată pe Supabase pentru deployment.                                |
| tsx            | 4.22.4      | Runner TypeScript fără compilare prealabilă, folosit exclusiv pentru rularea seed-ului Prisma (`prisma/seed.ts`).                                        |
| NextAuth.js    | —           | Autentificare planificată: sesiuni JWT, credențiale email/parolă, roluri USER și ADMIN. Nu este implementat încă.                                        |
| Supabase       | —           | Planificat pentru deployment: va găzdui baza de date PostgreSQL în cloud.                                                                                |
| Vercel         | —           | Planificat pentru deployment: va găzdui aplicația Next.js.                                                                                               |

---

## 4. Containerul PostgreSQL local

Containerul a fost creat cu Docker Desktop și rulează la portul `5432` al mașinii locale.

```bash
docker run --name pcforge-postgres \
  -e POSTGRES_USER=pcforge \
  -e POSTGRES_PASSWORD=<parola_dev> \
  -e POSTGRES_DB=pcforge_dev \
  -p 5432:5432 \
  -d postgres:16
```

> Parola nu este inclusă în acest document. Forma conexiunii este documentată în `.env.example`.

Conexiunea din pgAdmin 4 este configurată cu:

- **Server name:** PC Forge Local
- **Host:** localhost
- **Port:** 5432
- **Database:** pcforge_dev
- **Username:** pcforge

Forma generică a stringului de conexiune (din `.env.example`):

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
```

Fișierele `.env` și `.env.*` sunt excluse din repository prin `.gitignore`. Fișierul `.env.example` este comis ca referință de structură, fără valori reale.

---

## 5. Structura proiectului (stadiul curent)

```
pc-forge/
  docs/
    setup-log.md          ← acest fișier
  prisma/
    migrations/
      20260602205759_init/
        migration.sql     ← SQL generat la prima migrare
    schema.prisma         ← schema completă a bazei de date
    seed.ts               ← seed idempotent pentru categorii, produse, componente, reguli CSP
  src/
    app/
      page.tsx            ← homepage statică (Server Component)
      layout.tsx          ← layout global, metadata, font
      globals.css         ← stiluri globale Tailwind
    components/
      product-card.tsx    ← componentă reutilizabilă pentru afișarea unui produs
    data/
      products.ts         ← date temporare tipizate (vor fi înlocuite cu interogări Prisma)
    types/
      product.ts          ← tipurile Product și ProductCategory
  .env.example            ← structura variabilelor de mediu, fără valori reale
  .gitignore              ← exclude node_modules, .next, .env, .env.*
  package.json
  tsconfig.json
  tailwind.config.ts
  next.config.mjs
```

---

## 6. Comenzi rulate în ordine cronologică

### Crearea proiectului

```bash
npx create-next-app@latest pc-forge \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"
```

### Instalarea Prisma

Prisma a fost instalat ca parte din configurarea inițială a proiectului (prezent în `package.json` de la început ca `prisma` în devDependencies și `@prisma/client` în dependencies).

### Instalarea tsx

```bash
npm install -D tsx
```

**Motivare:** `tsx` este necesar pentru rularea seed-ului scris în TypeScript (`prisma/seed.ts`) fără compilare prealabilă. A fost instalat explicit ca devDependency pentru reproductibilitate, în locul apelării implicite prin `npx tsx`.

### Inițializarea Prisma

Prisma a fost inițializat la crearea proiectului. Fișierul `prisma/schema.prisma` a fost completat ulterior cu schema completă a bazei de date PC Forge.

### Validarea și formatarea schemei

```bash
npx prisma format
npx prisma validate
```

- `prisma format` — formatează `schema.prisma` conform convențiilor Prisma.
- `prisma validate` — verifică sintaxa și corectitudinea schemei fără a atinge baza de date.

### Prima migrare

```bash
npx prisma migrate dev --name init
```

Generează și aplică fișierul SQL `prisma/migrations/20260602205759_init/migration.sql` pe containerul local PostgreSQL. Creează toate tabelele și tipurile enum definite în schemă. Regenerează automat Prisma Client.

### Seed-ul bazei de date

```bash
npx prisma db seed
```

Rulează `prisma/seed.ts` prin `tsx`. Inserează:

- 10 categorii (toate din enum `ProductCategory`)
- 19 produse cu specificații și înregistrări `Component` aferente
- 4 reguli de compatibilitate pentru configuratorul CSP

Seed-ul este idempotent — poate fi rulat repetat fără erori, prin operații `upsert`.

### Inspecție vizuală a datelor

```bash
npx prisma studio
```

Deschide interfața web la `http://localhost:5555` pentru inspecția tabelelor și datelor.

---

## 7. Decizii tehnice notate

**Denormalizarea `categoryType`**
Câmpul `categoryType` apare redundant în trei modele: `Category.type`, `Product.categoryType` și `Component.type`. Această denormalizare este deliberată — permite filtrarea produselor și evaluarea regulilor CSP fără join-uri suplimentare. Consistența este impusă în logica de seed și va fi impusă în stratul de aplicație la creare/editare.

**`Decimal @db.Decimal(10,2)` pentru prețuri**
Câmpurile de preț (`price`, `totalAmount`, `unitPrice`, `totalPrice`) folosesc tipul `Decimal` cu precizie fixă de 10 cifre și 2 zecimale, în loc de `Float`. `Float` poate produce erori de precizie pentru valori monetare, inacceptabile într-un sistem de comenzi.

**`passwordHash` în loc de `password`**
Modelul `User` stochează `passwordHash`, nu parola în clar. Hash-ul va fi generat cu `bcryptjs` la implementarea autentificării prin NextAuth.js.

**`CompatibilityRule` între tipuri, nu produse concrete**
Regulile de compatibilitate sunt definite între tipuri de componente (`sourceType`, `targetType`), nu între produse individuale. Aceasta permite evaluarea CSP generalizată: o regulă `CPU_SOCKET_MATCH` se aplică oricărei perechi CPU-MOTHERBOARD, nu doar unor produse specifice.

**`OrderItem` cu snapshot de produs**
Câmpurile `productName`, `unitPrice` și `totalPrice` din `OrderItem` reprezintă un snapshot al produsului la momentul comenzii. Dacă produsul este redenumit sau prețul se modifică ulterior, istoricul comenzilor rămâne corect.

---

## 8. Istoricul commiturilor (stadiul curent)

| Hash      | Mesaj                                   | Data        |
| --------- | --------------------------------------- | ----------- |
| `5eff29a` | Initial commit from Create Next App     | —           |
| `992aab8` | Add initial PC Forge homepage           | 2 iun. 2026 |
| `606a2d6` | Remove environment file from repository | 2 iun. 2026 |
| `a386113` | Ignore local environment files          | 2 iun. 2026 |
| `8ba1e86` | Add initial Prisma database schema      | 3 iun. 2026 |

---

_Document actualizat la: 3 iunie 2026_
