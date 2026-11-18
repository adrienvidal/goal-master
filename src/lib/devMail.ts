// Hors production, aucun e-mail ne part vers les vraies adresses des joueurs : tout est détourné vers DEV_MAIL_TO
// (en local comme sur un aperçu Vercel, où une seule personne reçoit les codes des deux joueurs et teste les deux
// côtés). Sans DEV_MAIL_TO, rien ne part. Seule la production (VERCEL_ENV=production) écrit aux vraies adresses.

type Env = { NODE_ENV?: string; VERCEL?: string; VERCEL_ENV?: string; DEV_MAIL_TO?: string };
type Addressed = { to: string; subject: string };

/** Destinataire réel d'un e-mail : inchangé en production ; ailleurs DEV_MAIL_TO, ou null (pas d'envoi). */
export function localRecipient<T extends Addressed>(mail: T, env: Env): T | null {
  if (env.VERCEL_ENV === "production") return mail;
  const to = env.DEV_MAIL_TO?.trim();
  if (!to) return null;
  const where = env.VERCEL_ENV === "preview" ? "aperçu" : "local";
  return { ...mail, to, subject: `[${where} → ${mail.to}] ${mail.subject}` };
}
