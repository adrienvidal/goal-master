// Reconnaître l'appareil depuis le navigateur : iPhone (push seulement depuis l'app installée) et libellé lisible.

export function isIos(userAgent: string, maxTouchPoints = 0): boolean {
  // Un iPad récent se présente comme un Mac, mais tactile.
  return /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
}

/** « Chrome sur Android », « Safari sur iPhone »… ; libellé générique si l'agent est inconnu. */
export function deviceLabel(userAgent: string, maxTouchPoints = 0): string {
  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /SamsungBrowser/.test(userAgent)
      ? "Samsung Internet"
      : /Firefox|FxiOS/.test(userAgent)
        ? "Firefox"
        : /Chrome|CriOS/.test(userAgent)
          ? "Chrome"
          : /Safari/.test(userAgent)
            ? "Safari"
            : null;
  const os = isIos(userAgent, maxTouchPoints)
    ? "iPhone"
    : /Android/.test(userAgent)
      ? "Android"
      : /Windows/.test(userAgent)
        ? "Windows"
        : /Macintosh/.test(userAgent)
          ? "Mac"
          : /Linux/.test(userAgent)
            ? "Linux"
            : null;
  if (browser && os) return `${browser} sur ${os}`;
  return browser ?? os ?? "Ce navigateur";
}
