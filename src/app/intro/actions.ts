"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { INTRO_COOKIE } from "@/lib/intro";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";


/** Fin (ou saut) de l'intro : on ne la remontre plus sur cet appareil, puis premier lancement ou accueil. */
export async function finishIntro(): Promise<void> {
  const user = await requireUser();
  (await cookies()).set(INTRO_COOKIE, "1", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  const player = await db().player.findUnique({ where: { id: user.id }, select: { id: true } });
  redirect(player ? "/" : "/bienvenue");
}
