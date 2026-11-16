// Prisma 7 : l'adresse de la base vient de .env.local en local (vercel env pull), des variables Vercel en ligne.
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: ".env.local", quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Migrations par l'adresse directe de Neon : le pooler gère mal les verrous de migration
  datasource: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "" },
});
