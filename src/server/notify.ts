// Envoi d'une notification : Web Push tout de suite sur les appareils abonnés, et mise de côté pour le bilan du
// jour (un seul e-mail à 18 h 01, src/server/digest.ts). Catégorie coupée : rien. Plafond du jour atteint : pas de
// push, mais l'événement reste dans le bilan. Le journal garantit qu'un événement n'est traité qu'une fois.
import { parisDay } from "@/game/calendar";
import { parisTime } from "@/game/duel";
import { isMuted, keyOf, pushAllowed, pushBody, ruleOf, sendsEmail, textOf, type NotificationEvent } from "@/game/notifications";
import { db } from "./db";
import { pushTo } from "./push";

function isDuplicate(error: unknown): boolean {
  return (error as { code?: string }).code === "P2002";
}

export async function notify(playerId: string, event: NotificationEvent, now = new Date()): Promise<void> {
  const player = await db().player.findUnique({ where: { id: playerId }, select: { mutedCategories: true } });
  if (!player || isMuted(event, player.mutedCategories)) return;
  const rule = ruleOf(event);
  const cappedPushedToday = await db().notificationLog.count({ where: { playerId, capped: true, sentAt: { gte: parisTime(parisDay(now), 0) } } });
  const push = pushAllowed(event, cappedPushedToday);
  if (!push && !sendsEmail(event)) return;
  try {
    await db().notificationLog.create({
      // `capped` ne compte que les push plafonnés réellement partis : c'est lui que le plafond additionne.
      data: { playerId, key: keyOf(event), capped: rule.capped && push, sentAt: now, event: sendsEmail(event) ? event : undefined },
    });
  } catch (error) {
    if (isDuplicate(error)) return;
    throw error;
  }
  if (!push) return;
  const text = textOf(event);
  await pushTo(playerId, { title: text.title, body: pushBody(text, event), url: text.url }).catch((error) => console.error("Échec d'envoi de notification", keyOf(event), error));
}

/** Plusieurs notifications d'affilée, sans qu'un échec n'arrête les suivantes. */
export async function notifyAll(items: { playerId: string; event: NotificationEvent }[], now = new Date()): Promise<void> {
  for (const { playerId, event } of items) {
    await notify(playerId, event, now).catch((error) => console.error("Notification abandonnée", keyOf(event), error));
  }
}
