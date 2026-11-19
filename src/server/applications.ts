import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { currentDuel } from "@/game/duel";
import { formReached, koCrossed, nudgesJustSucceeded, type NotificationEvent } from "@/game/notifications";
import { formName } from "@/lib/forms";
import { settleChallenge } from "./challenge";
import { db } from "./db";
import { loadDuelInput, loadGame, syncAchievements, type GameData } from "./game";
import { notifyAll } from "./notify";

// Ajout d'une candidature, partagé par la saisie (action) et l'encart job-finder (API) : même XP, mêmes succès, mêmes notifications.

export const MAX_COMPANY = 80;

/** `before` : le jeu chargé avant l'ajout (pour savoir ce que la candidature change). */
export async function createApplication(
  playerId: string,
  company: string,
  before: GameData,
  extra: { externalRef?: string; source?: string } = {},
): Promise<{ id: string }> {
  const row = await db().application.create({ data: { playerId, company, ...extra } });
  const now = new Date();
  const updated = await loadGame();
  const challengeEvents = await settleChallenge(playerId, updated, now);
  await syncAchievements(updated, now);
  after(async () => notifyAll([...challengeEvents, ...(await applicationEvents(playerId, before, updated, now))], now));
  revalidatePath("/");
  return { id: row.id };
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
    const form = formReached(who.id, before.apps, updated.apps, updated.nudges, updated.quests);
    if (form) items.push({ playerId: to.id, event: { kind: "evo", partnerId: who.id, partner: who.pseudo, form, formName: formName(who.character, form) } });
  }
  const [duelBefore, duelAfter] = await Promise.all([before, updated].map(async (g) => currentDuel(await loadDuelInput(g), now)));
  if (duelAfter && koCrossed(duelBefore, duelAfter)) {
    items.push({ playerId: partner.id, event: { kind: "ko", friday: duelAfter.id, partner: me.pseudo, boss: duelAfter.boss } });
  }
  return items;
}
