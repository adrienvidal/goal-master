"use server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { currentDuel } from "@/game/duel";
import { formReached, koCrossed, nudgesJustSucceeded, type NotificationEvent } from "@/game/notifications";
import { formName } from "@/lib/forms";
import { findDuplicate } from "@/lib/playerView";
import { db } from "@/server/db";
import { loadDuelInput, loadGame, syncAchievements, type GameData } from "@/server/game";
import { notifyAll } from "@/server/notify";
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
  const now = new Date();
  const updated = await loadGame();
  await syncAchievements(updated, now);
  after(async () => notifyAll(await applicationEvents(player.id, game, updated, now), now));
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

/** Ce que la candidature qu'on vient d'ajouter change pour le binôme : relance réussie, nouvelle forme, boss K.O. */
async function applicationEvents(playerId: string, before: GameData, updated: GameData, now: Date): Promise<{ playerId: string; event: NotificationEvent }[]> {
  const me = updated.players.find((p) => p.id === playerId);
  const partner = updated.players.find((p) => p.id !== playerId);
  if (!me || !partner) return [];
  const items: { playerId: string; event: NotificationEvent }[] = [];
  for (const n of nudgesJustSucceeded(playerId, updated.nudges, before.apps, updated.apps)) {
    items.push({ playerId: n.senderId, event: { kind: "nudge-ok", nudgeId: n.id, partner: me.pseudo } });
  }
  // Une relance réussie fait aussi gagner de l'XP à l'expéditeur : chacun peut changer de forme.
  for (const [who, to] of [[me, partner], [partner, me]] as const) {
    const form = formReached(who.id, before.apps, updated.apps, updated.nudges);
    if (form) items.push({ playerId: to.id, event: { kind: "evo", partnerId: who.id, partner: who.pseudo, form, formName: formName(who.character, form) } });
  }
  const [duelBefore, duelAfter] = await Promise.all([before, updated].map(async (g) => currentDuel(await loadDuelInput(g), now)));
  if (duelAfter && koCrossed(duelBefore, duelAfter)) {
    items.push({ playerId: partner.id, event: { kind: "ko", friday: duelAfter.id, partner: me.pseudo, boss: duelAfter.boss } });
  }
  return items;
}
