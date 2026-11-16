// Prisma 7 : en local, la base Docker de .env.development.local prime sur .env.local (vercel env pull) ; en ligne, les variables Vercel.
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: [".env.development.local", ".env.local"], quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Migrations par l'adresse directe de Neon : le pooler gère mal les verrous de migration
  datasource: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "" },
});
