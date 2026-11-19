// Bilan du jour : appelé en fin de cron (18 h 01, heure de Paris). Un e-mail par joueur qui a des notifications en
// attente ; elles ne sont marquées envoyées que si l'e-mail est parti, sinon elles attendent le bilan suivant.
import { parisDay } from "@/game/calendar";
import { applicationsOn, digestOf, xpGainedSince, type DigestRow } from "@/game/digest";
import { BOSSES, currentDuel, parisTime, pastDuels, type Duel } from "@/game/duel";
import { shownForm } from "@/game/evolution";
import { formForLevel, levelFromXp } from "@/game/levels";
import type { NotificationEvent } from "@/game/notifications";
import { totalXp } from "@/game/xp";
import { pngSize, sceneToken, scenePng } from "@/lib/emailArt";
import { sceneFor, type Hero } from "@/lib/emailScene";
import { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { loadDuelInput, type GameData } from "./game";
import { digestMail, sendMail, type DigestTally, type MailScene } from "./mail";

/** Le duel tranché aujourd'hui s'il y en a un, sinon celui de la semaine en cours. */
function duelOfDay(game: GameData, input: Awaited<ReturnType<typeof loadDuelInput>>, now: Date): Duel | null {
  const last = pastDuels(input, now)[0];
  if (last && last.id === parisDay(now)) return last;
  return currentDuel(input, now);
}

/** `me` : le destinataire, jamais au-delà de sa forme vue (la nouvelle forme se découvre dans la scène de /). */
function heroOf(game: GameData, id: string, me = false): Hero | null {
  const p = game.players.find((x) => x.id === id);
  if (!p) return null;
  const form = formForLevel(levelFromXp(totalXp(p.id, game.apps, game.nudges, game.quests)).level);
  return { character: p.character, color: p.color, form: me ? shownForm(form, form, p.seenForm) : form };
}

function sceneOf(game: GameData, playerId: string, event: NotificationEvent): MailScene | null {
  const me = heroOf(game, playerId, true);
  if (!me) return null;
  const partnerId = game.players.find((p) => p.id !== playerId)?.id;
  const actors = sceneFor(event, me, partnerId ? heroOf(game, partnerId) : null);
  if (actors.length === 0) return null;
  return { query: actors.map(sceneToken).join(","), ...pngSize(scenePng(actors)) };
}

export async function sendDigests(game: GameData, now = new Date()): Promise<number> {
  const pending = await db().notificationLog.findMany({ where: { mailedAt: null, event: { not: Prisma.DbNull } }, orderBy: { sentAt: "asc" } });
  if (pending.length === 0) return 0;
  const input = await loadDuelInput(game);
  const duel = duelOfDay(game, input, now);
  const today = parisDay(now);
  let sent = 0;
  for (const player of game.players) {
    const rows: DigestRow[] = pending.filter((r) => r.playerId === player.id).map((r) => ({ id: r.id, event: r.event as NotificationEvent, sentAt: r.sentAt }));
    const ids = rows.map((r) => r.id);
    const digest = digestOf(rows, player.mutedCategories, now);
    try {
      if (digest) {
        const tally: DigestTally = {
          applications: applicationsOn(player.id, game.apps, today),
          xp: xpGainedSince(player.id, game, parisTime(today, 0)),
          boss: duel ? { name: BOSSES[duel.boss], hits: duel.hits + duel.bonus, hp: duel.hp } : null,
        };
        const scene = (() => {
          try {
            return sceneOf(game, player.id, digest.duel ?? digest.top);
          } catch {
            return null;
          }
        })();
        await sendMail(digestMail(player.email, digest, tally, now, scene));
        sent++;
      }
      // Lignes coupées depuis (catégorie désactivée) : marquées aussi, elles n'ont plus rien à dire.
      if (ids.length > 0) await db().notificationLog.updateMany({ where: { id: { in: ids } }, data: { mailedAt: now } });
    } catch (error) {
      console.error("Bilan du jour non envoyé", player.id, error);
    }
  }
  return sent;
}
