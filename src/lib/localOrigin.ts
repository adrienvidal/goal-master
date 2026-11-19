// Sans dépendance serveur : utilisé aussi dans l'encart (navigateur).

/** job-finder tourne sur la machine du joueur : seules ces origines peuvent afficher l'encart ou recevoir une clé. */
export function isLocalOrigin(origin: string | null): origin is string {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    return url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1") && url.origin === origin;
  } catch {
    return false;
  }
}
