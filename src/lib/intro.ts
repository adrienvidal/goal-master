/** Cookie posé quand l'intro a été vue (ou passée) sur cet appareil : il garde le nombre d'écrans vus. */
export const INTRO_COOKIE = "gm-intro-seen";

/**
 * Nombre d'écrans de l'intro. Ajouter un écran pour une nouvelle fonctionnalité suffit à le montrer
 * d'office à la prochaine ouverture, à partir du premier écran pas encore vu.
 */
export const INTRO_STEP_COUNT = 6;

/** L'ancienne valeur « 1 » date de l'intro à 4 écrans. */
export function introStepsSeen(cookie: string | undefined): number {
  if (!cookie) return 0;
  if (cookie === "1") return 4;
  const n = Number(cookie);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

/** Écran d'où repartir : le premier nouvel écran, ou le début pour une intro revue en entier. */
export function introStart(seen: number): number {
  return seen > 0 && seen < INTRO_STEP_COUNT ? seen : 0;
}
