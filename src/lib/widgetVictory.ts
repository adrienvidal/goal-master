import type { WidgetMode } from "./widgetMode";
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

/** Ligne qui remplace « n auj. / série » pendant la victoire, en mode normal (maquette encart-modes, écran 1). */
export function victoryLine(victory: Victory, state: WidgetState): { strong: string; rest: string; gold: boolean } {
  // Une nouvelle forme s'annonce sans se nommer : la surprise se garde pour la scène de Goal Master.
  if (victory.newForm) return { strong: "NOUVELLE FORME !", rest: " Va la voir", gold: true };
  if (victory.xp === 0) return { strong: victory.company, rest: " · plafond, sans XP", gold: false };
  if (victory.levelUp) return { strong: victory.company, rest: ` compte · niveau ${state.level}`, gold: false };
  if (victory.derust) return { strong: victory.company, rest: " · la rouille part", gold: false };
  return { strong: victory.company, rest: " compte", gold: false };
}

/** Bulle de la victoire : au-dessus du héros (normal, free) ou à la place du compte (small). */
export function victoryPop(victory: Victory, state: WidgetState, mode: WidgetMode): string {
  if (victory.newForm && mode === "small") return "ÉVOLUE !";
  if (victory.newForm && mode === "free") return "NOUVELLE FORME !";
  if (victory.levelUp) return `NIV. ${state.level} !`;
  return `+${victory.xp} XP`;
}
