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

/** job-finder en ligne : liste fermée, adresses exactes. */
const ONLINE_ORIGINS = ["https://job.viloris.io"];

/**
 * job-finder tourne chez le joueur (son ordinateur, localhost, ou une de ses machines jointe
 * par Tailscale) ou en ligne. Seules ces origines peuvent afficher l'encart ou recevoir une clé.
 */
export function isJobFinderOrigin(origin: string | null): origin is string {
  if (!origin) return false;
  if (ONLINE_ORIGINS.includes(origin)) return true;
  try {
    const url = new URL(origin);
    return url.protocol === "http:" && (isLoopback(url.hostname) || isTailscaleIp(url.hostname)) && url.origin === origin;
  } catch {
    return false;
  }
}

/**
 * En-tête CSP de /widget. Une plage d'adresses IP ne s'écrit pas dans frame-ancestors :
 * on ajoute la page qui charge l'encart (son Referer) quand elle est sur Tailscale.
 */
export function widgetFrameAncestors(referer: string | null): string {
  const base = ["frame-ancestors http://localhost:* http://127.0.0.1:*", ...ONLINE_ORIGINS].join(" ");
  const origin = referer && URL.canParse(referer) ? new URL(referer).origin : null;
  if (!isJobFinderOrigin(origin) || !isTailscaleIp(new URL(origin).hostname)) return base;
  return `${base} ${origin}`;
}
