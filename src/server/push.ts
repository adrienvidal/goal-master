// Envoi des notifications Web Push (relances) vers tous les appareils abonnés d'un joueur.
import * as webpush from "web-push";
import { db } from "./db";

let configured = false;
function configure(): boolean {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  if (!configured) webpush.setVapidDetails("mailto:contact@viloris.io", pub, priv);
  configured = true;
  return true;
}

export async function pushTo(playerId: string, payload: { title: string; body: string; url?: string }): Promise<void> {
  if (!configure()) return;
  const subs = await db().pushSubscription.findMany({ where: { playerId } });
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload));
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        // Abonnement expiré ou révoqué : on l'oublie.
        if (status === 404 || status === 410) await db().pushSubscription.delete({ where: { endpoint: s.endpoint } }).catch(() => {});
        else console.error("Échec d'envoi de la notification", status);
      }
    }),
  );
}
