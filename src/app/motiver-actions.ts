"use server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { parisDay } from "@/game/calendar";
import { NUDGE_MESSAGES, sentToday } from "@/game/nudges";
import { db } from "@/server/db";
import { loadGame } from "@/server/game";
import { notify } from "@/server/notify";
import { requirePlayer } from "@/server/session";

export type NudgeResult = { ok: true } | { ok: false; error: string };

/** Relance du binôme : une par jour (cadrage §7), notification sur ses appareils. */
export async function sendNudge(message: number): Promise<NudgeResult> {
  const player = await requirePlayer();
  if (!Number.isInteger(message) || message < 0 || message >= NUDGE_MESSAGES.length) return { ok: false, error: "Choisis un message." };
  const game = await loadGame();
  const partner = game.players.find((p) => p.id !== player.id);
  if (!partner) return { ok: false, error: "Ton binôme ne s'est pas encore connecté." };
  if (sentToday(player.id, game.nudges, parisDay(new Date()))) return { ok: false, error: "Tu as déjà motivé ton binôme aujourd'hui." };
  const nudge = await db().nudge.create({ data: { senderId: player.id, recipientId: partner.id, message } });
  after(() => notify(partner.id, { kind: "nudge", nudgeId: nudge.id, from: player.pseudo, message }));
  revalidatePath("/");
  return { ok: true };
}

type SubscriptionJson = { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

export async function savePushSubscription(sub: SubscriptionJson): Promise<void> {
  const player = await requirePlayer();
  const { endpoint, keys } = sub;
  if (!endpoint?.startsWith("https://") || !keys?.p256dh || !keys.auth) return;
  await db().pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, playerId: player.id, p256dh: keys.p256dh, auth: keys.auth },
    update: { playerId: player.id, p256dh: keys.p256dh, auth: keys.auth },
  });
}

/** Désactive le push sur cet appareil : l'abonnement est oublié côté serveur. */
export async function deletePushSubscription(endpoint: string): Promise<void> {
  const player = await requirePlayer();
  await db().pushSubscription.deleteMany({ where: { endpoint, playerId: player.id } });
}
