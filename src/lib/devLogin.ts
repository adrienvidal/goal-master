/**
 * Connexion sans code, pour tester seul les deux joueurs : en développement local, et sur les aperçus Vercel
 * quand PREVIEW_DIRECT_LOGIN=1 est posé pour l'environnement Preview. Jamais en production : VERCEL_ENV
 * vaut alors « production » et coupe tout, même si la variable s'y trouvait par erreur.
 */
export function devLoginEnabled(env: { NODE_ENV?: string; VERCEL?: string; VERCEL_ENV?: string; PREVIEW_DIRECT_LOGIN?: string }): boolean {
  if (!env.VERCEL) return env.NODE_ENV === "development";
  return env.VERCEL_ENV === "preview" && env.PREVIEW_DIRECT_LOGIN === "1";
}

export const DEV_USER_COOKIE = "gm-dev-user";
