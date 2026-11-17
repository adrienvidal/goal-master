// En local, aucun e-mail ne part vers les vraies adresses des joueurs : tout est détourné vers DEV_MAIL_TO.
// Sur un aperçu Vercel, DEV_MAIL_TO (s'il est posé pour l'environnement Preview) détourne aussi tout : une seule
// personne reçoit les codes des deux joueurs et peut tester les deux côtés. Jamais en production.
import { devLoginEnabled } from "./devLogin";

type Env = { NODE_ENV?: string; VERCEL?: string; VERCEL_ENV?: string; DEV_MAIL_TO?: string };
type Addressed = { to: string; subject: string };

/** Destinataire réel d'un e-mail : DEV_MAIL_TO en local (sinon pas d'envoi) et sur un aperçu qui le définit ; inchangé ailleurs. */
export function localRecipient<T extends Addressed>(mail: T, env: Env): T | null {
  const to = env.DEV_MAIL_TO?.trim();
  if (devLoginEnabled(env)) return to ? { ...mail, to, subject: `[local → ${mail.to}] ${mail.subject}` } : null;
  if (env.VERCEL_ENV === "preview" && to) return { ...mail, to, subject: `[aperçu → ${mail.to}] ${mail.subject}` };
  return mail;
}
