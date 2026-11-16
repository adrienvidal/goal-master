/** Connexion sans code, réservée au développement local : jamais en production ni sur Vercel. */
export function devLoginEnabled(env: { NODE_ENV?: string; VERCEL?: string }): boolean {
  return env.NODE_ENV === "development" && !env.VERCEL;
}

export const DEV_USER_COOKIE = "gm-dev-user";
