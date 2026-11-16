"use server";
import { revalidatePath } from "next/cache";
import { findDuplicate } from "@/lib/playerView";
import { db } from "@/server/db";
import { loadGame, syncAchievements } from "@/server/game";
import { requirePlayer } from "@/server/session";

const MAX_COMPANY = 80;
const UNDO_WINDOW_MS = 60_000;

export type AddResult = { ok: true; id: string } | { ok: false; error: string } | { ok: false; duplicateOf: string };

export async function addApplication(company: string, confirmDuplicate: boolean): Promise<AddResult> {
  const player = await requirePlayer();
  const name = company.trim();
  if (name.length === 0 || name.length > MAX_COMPANY) return { ok: false, error: "Indique le nom de l'entreprise." };
  const game = await loadGame();
  const previous = findDuplicate(name, player.id, game.apps);
  if (previous && !confirmDuplicate) {
    return { ok: false, duplicateOf: previous.createdAt.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "Europe/Paris" }) };
  }
  const row = await db().application.create({ data: { playerId: player.id, company: name } });
  await syncAchievements(await loadGame(), new Date());
  revalidatePath("/");
  return { ok: true, id: row.id };
}

/** Annule une candidature qu'on vient d'ajouter (le lien « Annuler » reste quelques secondes). */
export async function cancelApplication(id: string): Promise<void> {
  const player = await requirePlayer();
  await db().application.updateMany({
    where: { id, playerId: player.id, cancelledAt: null, createdAt: { gte: new Date(Date.now() - UNDO_WINDOW_MS) } },
    data: { cancelledAt: new Date() },
  });
  revalidatePath("/");
}
