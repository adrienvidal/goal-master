"use server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { arenaState } from "@/game/arena";
import { parisDay } from "@/game/calendar";
import { currentDuel } from "@/game/duel";
import { formReached, koCrossed, nudgesJustSucceeded, type NotificationEvent } from "@/game/notifications";
import { formName } from "@/lib/forms";
import { findDuplicate, removalImpact } from "@/lib/playerView";
import { db } from "@/server/db";
import { arenaInputs, loadDuelInput, loadGame, syncAchievements, type GameData } from "@/server/game";
import { arenaEvents } from "@/server/arena";
import { settleChallenge } from "@/server/challenge";
import { notifyAll } from "@/server/notify";
import { requirePlayer } from "@/server/session";

const MAX_COMPANY = 80;
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
  const row = await db().application.create({ data: { playerId: player.id, company: name } });
  const now = new Date();
  const updated = await loadGame();
  const challengeEvents = await settleChallenge(player.id, updated, now);
  await syncAchievements(updated, now);
  after(async () => notifyAll([...challengeEvents, ...(await applicationEvents(player.id, game, updated, now))], now));
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
  // Une candidature peut faire passer un tour injouable de l'Arène : « À toi de jouer » part tout de suite.
  for (const input of arenaInputs(updated)) {
    const prior = arenaInputs(before).find((i) => i.arena.id === input.arena.id);
    const turn = arenaState(input, now).turn;
    if (prior && turn && turn.number !== arenaState(prior, now).turn?.number) items.push(...arenaEvents(input, updated, now));
  }
  return items;
}
