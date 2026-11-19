import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Player } from "@/generated/prisma/client";
import { DEV_USER_COOKIE, devLoginEnabled } from "@/lib/devLogin";
import { auth } from "./auth";
import { db } from "./db";

export type CurrentUser = { id: string; email: string };

export async function currentUser(): Promise<CurrentUser | null> {
  if (devLoginEnabled(process.env)) {
    const email = (await cookies()).get(DEV_USER_COOKIE)?.value;
    if (!email) return null;
    const user = await db().user.findUnique({ where: { email }, select: { id: true, email: true } });
    return user;
  }
  const session = await auth().api.getSession({ headers: await headers() });
  return session ? { id: session.user.id, email: session.user.email } : null;
}

/** Utilisateur connecté, sinon redirection vers /connexion (puis retour à `returnTo`, chemin interne). */
export async function requireUser(returnTo?: string): Promise<CurrentUser> {
  const user = await currentUser();
  if (!user) redirect(returnTo ? `/connexion?retour=${encodeURIComponent(returnTo)}` : "/connexion");
  return user;
}

/** Joueur connecté et déjà passé par le premier lancement, sinon redirection. */
export async function requirePlayer(returnTo?: string): Promise<Player> {
  const user = await requireUser(returnTo);
  const player = await db().player.findUnique({ where: { id: user.id } });
  if (!player) redirect("/bienvenue");
  return player;
}
