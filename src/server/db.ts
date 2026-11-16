// Client Prisma unique, gardé entre les rechargements en développement. Créé à la première utilisation :
// le build n'a pas besoin de base.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const store = globalThis as unknown as { db?: PrismaClient };

export function db(): PrismaClient {
  if (!store.db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL manquante : base non configurée");
    store.db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  }
  return store.db;
}
