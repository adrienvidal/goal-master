// Envoi d'une notification : Web Push sur les appareils abonnés et e-mail, toujours (spec notifications).
// Catégorie coupée ou plafond du jour atteint : rien. Le journal garantit qu'un événement ne part qu'une fois.
import { parisDay } from "@/game/calendar";
import { parisTime } from "@/game/duel";
import { keyOf, pushBody, ruleOf, shouldSend, textOf, type NotificationEvent } from "@/game/notifications";
import { formForLevel, levelFromXp } from "@/game/levels";
import { totalXp } from "@/game/xp";
import { pngDisplaySize, sceneToken, scenePng } from "@/lib/emailArt";
import { sceneFor, type Hero } from "@/lib/emailScene";
import { db } from "./db";
import { loadGame } from "./game";
import { notificationMail, sendMail, type MailScene } from "./mail";
import { pushTo } from "./push";

function isDuplicate(error: unknown): boolean {
  return (error as { code?: string }).code === "P2002";
}

export async function notify(playerId: string, event: NotificationEvent, now = new Date()): Promise<void> {
  const player = await db().player.findUnique({ where: { id: playerId }, select: { email: true, mutedCategories: true } });
  if (!player) return;
  const { capped } = ruleOf(event);
  const cappedSentToday = await db().notificationLog.count({ where: { playerId, capped: true, sentAt: { gte: parisTime(parisDay(now), 0) } } });
  if (!shouldSend(event, player.mutedCategories, cappedSentToday)) return;
  try {
    await db().notificationLog.create({ data: { playerId, key: keyOf(event), capped, sentAt: now } });
  } catch (error) {
    if (isDuplicate(error)) return;
    throw error;
  }
  const text = textOf(event);
  const scene = await mailScene(playerId, event).catch(() => null);
  const results = await Promise.allSettled([
    pushTo(playerId, { title: text.title, body: pushBody(text, event), url: text.url }),
    sendMail(notificationMail(player.email, text, ruleOf(event).category, scene)),
  ]);
  for (const r of results) if (r.status === "rejected") console.error("Échec d'envoi de notification", keyOf(event), r.reason);
}

/** Image de l'e-mail : les héros à leur forme actuelle (calculée, jamais stockée), selon l'événement. */
async function mailScene(playerId: string, event: NotificationEvent): Promise<MailScene | null> {
  const game = await loadGame();
  const heroOf = (id: string): Hero | null => {
    const p = game.players.find((x) => x.id === id);
    return p ? { character: p.character, color: p.color, form: formForLevel(levelFromXp(totalXp(p.id, game.apps, game.nudges)).level) } : null;
  };
  const me = heroOf(playerId);
  if (!me) return null;
  const partnerId = game.players.find((p) => p.id !== playerId)?.id;
  const actors = sceneFor(event, me, partnerId ? heroOf(partnerId) : null);
  if (actors.length === 0) return null;
  return { query: actors.map(sceneToken).join(","), ...pngDisplaySize(scenePng(actors)) };
}

/** Plusieurs notifications d'affilée, sans qu'un échec n'arrête les suivantes. */
export async function notifyAll(items: { playerId: string; event: NotificationEvent }[], now = new Date()): Promise<void> {
  for (const { playerId, event } of items) {
    await notify(playerId, event, now).catch((error) => console.error("Notification abandonnée", keyOf(event), error));
  }
}
