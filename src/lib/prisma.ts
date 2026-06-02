import { PrismaClient } from "@prisma/client";

// Singleton Prisma Client: în development, hot reload-ul Next.js re-evaluează
// modulele la fiecare salvare. Fără reutilizarea instanței din globalThis,
// fiecare reîncărcare ar deschide noi conexiuni până la epuizarea pool-ului
// PostgreSQL. În producție se creează o singură instanță.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
