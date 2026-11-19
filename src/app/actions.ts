"use server";
import { revalidatePath } from "next/cache";
import { parisDay } from "@/game/calendar";
import { formForLevel, levelFromXp } from "@/game/levels";
import { totalXp } from "@/game/xp";
import { findDuplicate, removalImpact } from "@/lib/playerView";
import { db } from "@/server/db";
import { createApplication, MAX_COMPANY } from "@/server/applications";
import { loadGame } from "@/server/game";
import { requirePlayer } from "@/server/session";

const UNDO_WINDOW_MS = 60_000;

export type DuplicateInfo = { company: string; when: string; sure: boolean };
export type AddResult = { ok: true; id: string } | { ok: false; error: string } | { ok: false; duplicate: DuplicateInfo };

const TIME = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
const DATE = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "Europe/Paris" });

/** « aujourd'hui à 16:00 » ou « le 12/11 ». */
function whenLabel(at: Date, now: Date): string {
  return parisDay(at) === parisDay(now) ? `aujourd'hui à ${TIME.format(at)}` : `le ${DATE.format(at)}`;
}

export async function addApplication(company: string, confirmDuplicate: boolean): Promise<AddResult> {
  const player = await requirePlayer();
  const name = company.trim();
  if (name.length === 0 || name.length > MAX_COMPANY) return { ok: false, error: "Indique le nom de l'entreprise." };
  const game = await loadGame();
  const previous = findDuplicate(name, player.id, game.apps);
  if (previous && !confirmDuplicate) {
    return { ok: false, duplicate: { company: previous.app.company, when: whenLabel(previous.app.createdAt, new Date()), sure: previous.sure } };
  }
  const { id } = await createApplication(player.id, name, game);
  return { ok: true, id };
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

export type RemoveResult = { ok: true; xp: number } | { ok: false; error: string };

/** Retire une candidature saisie par erreur, le jour même seulement (maquette candidatures-du-jour). L'XP suit, les succès restent. */
export async function removeApplication(id: string): Promise<RemoveResult> {
  const player = await requirePlayer();
  const now = new Date();
  const game = await loadGame();
  const app = game.apps.find((a) => a.id === id && a.userId === player.id && a.cancelledAt === null);
  if (!app || parisDay(app.createdAt) !== parisDay(now)) return { ok: false, error: "Seules tes candidatures du jour se retirent." };
  const { xp } = removalImpact(id, player.id, game.apps, game.nudges);
  await db().application.updateMany({ where: { id, playerId: player.id, cancelledAt: null }, data: { cancelledAt: now } });
  revalidatePath("/");
  return { ok: true, xp };
}

/**
 * Scène d'évolution fermée sur / : la forme du niveau, recalculée ici (jamais reçue du client), devient la forme vue.
 * Jamais à la baisse : la mise à jour ne touche la ligne que si la forme vue est plus basse (double onglet, annulation).
 */
export async function seeEvolution(): Promise<void> {
  const player = await requirePlayer();
  const game = await loadGame();
  const form = formForLevel(levelFromXp(totalXp(player.id, game.apps, game.nudges, game.quests)).level);
  await db().player.updateMany({ where: { id: player.id, OR: [{ seenForm: null }, { seenForm: { lt: form } }] }, data: { seenForm: form } });
}
