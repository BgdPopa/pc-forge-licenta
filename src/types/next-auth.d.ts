import type { DefaultSession } from "next-auth";
import type { Role } from "@prisma/client";

// Extinde tipurile NextAuth astfel încât `id` și `role` să fie disponibile și
// tipizate atât pe sesiune, cât și pe token și pe obiectul User returnat de
// authorize(). Evită cast-urile manuale `as string` din callbacks.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}
