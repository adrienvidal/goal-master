import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Player } from "@/generated/prisma/client";
import { auth } from "./auth";
import { db } from "./db";

export type CurrentUser = { id: string; email: string };

export async function currentUser(): Promise<CurrentUser | null> {
  const session = await auth().api.getSession({ headers: await headers() });
  return session ? { id: session.user.id, email: session.user.email } : null;
}

/** Utilisateur connecté, sinon redirection vers /connexion. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await currentUser();
  if (!user) redirect("/connexion");
  return user;
}

/** Joueur connecté et déjà passé par le premier lancement, sinon redirection. */
export async function requirePlayer(): Promise<Player> {
  const user = await requireUser();
  const player = await db().player.findUnique({ where: { id: user.id } });
  if (!player) redirect("/bienvenue");
  return player;
}
