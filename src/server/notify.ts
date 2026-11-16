// Envoi d'une notification : Web Push sur les appareils abonnés et e-mail, toujours (spec notifications).
// Catégorie coupée ou plafond du jour atteint : rien. Le journal garantit qu'un événement ne part qu'une fois.
import { parisDay } from "@/game/calendar";
import { parisTime } from "@/game/duel";
import { keyOf, pushBody, ruleOf, shouldSend, textOf, type NotificationEvent } from "@/game/notifications";
import { db } from "./db";
import { notificationMail, sendMail } from "./mail";
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
  const results = await Promise.allSettled([
    pushTo(playerId, { title: text.title, body: pushBody(text, event), url: text.url }),
    sendMail(notificationMail(player.email, text, ruleOf(event).category)),
  ]);
  for (const r of results) if (r.status === "rejected") console.error("Échec d'envoi de notification", keyOf(event), r.reason);
}

/** Plusieurs notifications d'affilée, sans qu'un échec n'arrête les suivantes. */
export async function notifyAll(items: { playerId: string; event: NotificationEvent }[], now = new Date()): Promise<void> {
  for (const { playerId, event } of items) {
    await notify(playerId, event, now).catch((error) => console.error("Notification abandonnée", keyOf(event), error));
  }
}
