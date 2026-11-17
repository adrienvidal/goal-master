"use server";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAllowedEmail, parseAllowedEmails } from "@/lib/allowlist";
import { DEV_USER_COOKIE, devLoginEnabled } from "@/lib/devLogin";
import { db } from "@/server/db";

/** Local et aperçus de test : se connecter directement avec une adresse autorisée, sans code. */
export async function devLogin(email: string): Promise<void> {
  if (!devLoginEnabled(process.env)) throw new Error("Connexion directe désactivée");
  if (!isAllowedEmail(email, parseAllowedEmails(process.env.ALLOWED_EMAILS))) throw new Error("Adresse non autorisée");
  const address = email.trim().toLowerCase();
  await db().user.upsert({
    where: { email: address },
    create: { id: randomUUID(), email: address, name: address.split("@")[0], emailVerified: true },
    update: {},
  });
  (await cookies()).set(DEV_USER_COOKIE, address, { httpOnly: true, sameSite: "lax", path: "/", secure: Boolean(process.env.VERCEL) });
  redirect("/");
}

export async function devLogout(): Promise<void> {
  (await cookies()).delete(DEV_USER_COOKIE);
  redirect("/connexion");
}
