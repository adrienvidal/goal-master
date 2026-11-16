export const XP_PER_APPLICATION = 10;
export const XP_NUDGE_BONUS = 15;
export const DAILY_XP_CAP = 15;

export const FORM_LEVELS = [1, 4, 8, 12, 16, 20] as const;
export type Form = 1 | 2 | 3 | 4 | 5 | 6;

export function xpToNextLevel(level: number): number {
  return 20 + 2 * level;
}

export function levelFromXp(xp: number): { level: number; xpInLevel: number; xpForNext: number } {
  let level = 1;
  let rest = xp;
  while (rest >= xpToNextLevel(level)) {
    rest -= xpToNextLevel(level);
    level++;
  }
  return { level, xpInLevel: rest, xpForNext: xpToNextLevel(level) };
}

export function formForLevel(level: number): Form {
  let form = 1;
  FORM_LEVELS.forEach((threshold, i) => {
    if (level >= threshold) form = i + 1;
  });
  return form as Form;
}
