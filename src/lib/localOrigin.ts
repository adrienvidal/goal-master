// Sans dépendance serveur : utilisé aussi dans l'encart (navigateur).

/** Adresse du réseau Tailscale (100.64.0.0/10) : joignable seulement depuis les machines du joueur. */
function isTailscaleIp(hostname: string): boolean {
  const parts = hostname.split(".");
  if (parts.length !== 4 || !parts.every((p) => /^\d{1,3}$/.test(p))) return false;
  const [a, b] = parts.map(Number);
  return a === 100 && b >= 64 && b <= 127;
}

function isLoopback(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/**
 * job-finder tourne chez le joueur : sur son ordinateur (localhost) ou sur une de ses machines
 * jointe par Tailscale. Seules ces origines peuvent afficher l'encart ou recevoir une clé.
 */
export function isLocalOrigin(origin: string | null): origin is string {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    return url.protocol === "http:" && (isLoopback(url.hostname) || isTailscaleIp(url.hostname)) && url.origin === origin;
  } catch {
    return false;
  }
}

/**
 * En-tête CSP de /widget. Une plage d'adresses IP ne s'écrit pas dans frame-ancestors :
 * on ajoute la page qui charge l'encart (son Referer) quand elle est locale.
 */
export function widgetFrameAncestors(referer: string | null): string {
  const base = "frame-ancestors http://localhost:* http://127.0.0.1:*";
  const origin = referer && URL.canParse(referer) ? new URL(referer).origin : null;
  if (!isLocalOrigin(origin) || isLoopback(new URL(origin).hostname)) return base;
  return `${base} ${origin}`;
}
