import type { WidgetState } from "./widgetState";

export type Victory = { company: string; xp: number; levelUp: boolean; newForm: boolean; derust: boolean };

/**
 * Victoire à jouer dans l'encart : la candidature la plus récente venue de job-finder, si elle n'était pas là au dernier
 * affichage. Rien au premier affichage (on ne rejoue pas l'historique).
 */
export function victoryFor(prev: WidgetState | null, next: WidgetState): Victory | null {
  const newest = next.recent[0];
  if (!prev || !newest || prev.recent.some((r) => r.id === newest.id)) return null;
  return {
    company: newest.company,
    xp: newest.xp,
    levelUp: next.level > prev.level,
    newForm: next.levelForm > prev.levelForm,
    derust: prev.idleWorkdays > 0 && next.idleWorkdays === 0,
  };
}
