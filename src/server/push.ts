// Envoi des notifications Web Push vers les appareils abonnés d'un joueur.
import * as webpush from "web-push";
import { db } from "./db";

/**
 * Priorité haute : sans elle, Android retient le push tant que le téléphone dort (mode Doze), parfois des heures.
 * Durée de vie de 24 h : au-delà, une relance n'a plus de sens (web-push garde 4 semaines par défaut).
 */
export const PUSH_OPTIONS = { urgency: "high", TTL: 24 * 60 * 60 } as const;

let configured = false;
function configure(): boolean {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  if (!configured) webpush.setVapidDetails("mailto:contact@viloris.io", pub, priv);
  configured = true;
  return true;
}

type Payload = { title: string; body: string; url?: string };
type Sub = { endpoint: string; p256dh: string; auth: string };

/** « ok » : le service de push l'a pris en charge ; « gone » : abonnement mort, oublié ; « error » : échec passager. */
export type PushOutcome = "ok" | "gone" | "error" | "unconfigured";

async function sendOne(s: Sub, payload: Payload): Promise<PushOutcome> {
  try {
    await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), PUSH_OPTIONS);
    return "ok";
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    // Abonnement expiré ou révoqué : on l'oublie, l'appareil se réabonnera à sa prochaine ouverture.
    if (status === 404 || status === 410) {
      await db().pushSubscription.delete({ where: { endpoint: s.endpoint } }).catch(() => {});
      return "gone";
    }
    console.error("Échec d'envoi de la notification", status, (error as { body?: string }).body);
    return "error";
  }
}

export async function pushTo(playerId: string, payload: Payload): Promise<void> {
  if (!configure()) return;
  const subs = await db().pushSubscription.findMany({ where: { playerId } });
  await Promise.all(subs.map((s) => sendOne(s, payload)));
}

/** Un seul appareil du joueur (bouton de test des réglages). */
export async function pushToDevice(playerId: string, endpoint: string, payload: Payload): Promise<PushOutcome> {
  if (!configure()) return "unconfigured";
  const sub = await db().pushSubscription.findFirst({ where: { endpoint, playerId } });
  if (!sub) return "gone";
  return sendOne(sub, payload);
}
