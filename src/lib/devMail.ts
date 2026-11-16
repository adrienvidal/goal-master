// En local, aucun e-mail ne part vers les vraies adresses des joueurs : tout est détourné vers DEV_MAIL_TO.
import { devLoginEnabled } from "./devLogin";

type Env = { NODE_ENV?: string; VERCEL?: string; DEV_MAIL_TO?: string };
type Addressed = { to: string; subject: string };

/** Destinataire réel d'un e-mail : inchangé en ligne ; en local, DEV_MAIL_TO, ou null (pas d'envoi) s'il manque. */
export function localRecipient<T extends Addressed>(mail: T, env: Env): T | null {
  if (!devLoginEnabled(env)) return mail;
  const to = env.DEV_MAIL_TO?.trim();
  if (!to) return null;
  return { ...mail, to, subject: `[local → ${mail.to}] ${mail.subject}` };
}
