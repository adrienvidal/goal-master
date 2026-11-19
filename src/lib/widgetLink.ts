import { createHash, randomBytes } from "node:crypto";
export { isLocalOrigin } from "./localOrigin";

// Liaison de job-finder (cadrage encart-job-finder) : une clé par joueur, montrée une fois, gardée hachée en base.

const KEY_FORMAT = /^gm_[A-Za-z0-9_-]{43}$/;

export function newWidgetKey(): { key: string; hash: string } {
  const key = `gm_${randomBytes(32).toString("base64url")}`;
  return { key, hash: digest(key) };
}

/** Hash à chercher en base, ou null si la clé n'a pas la forme attendue. */
export function hashWidgetKey(key: string): string | null {
  return KEY_FORMAT.test(key) ? digest(key) : null;
}

export function bearerKey(header: string | null): string | null {
  const match = header?.match(/^Bearer (\S+)$/);
  return match ? match[1] : null;
}

/** Adresse de retour après connexion : un chemin interne, sinon l'accueil. */
export function safeReturnPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return "/";
  return raw;
}

function digest(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}
