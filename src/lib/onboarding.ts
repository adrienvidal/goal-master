import { addDays, type Day } from "@/game/calendar";

export const CHARACTERS = ["KNIGHT", "PANDA"] as const;
export const COLORS = ["BLUE", "RED", "GREEN", "PURPLE", "ORANGE", "BLACK"] as const;
export type CharacterId = (typeof CHARACTERS)[number];
export type ColorId = (typeof COLORS)[number];

export const DEFAULT_TARGET = 100;
export const DEFAULT_GOAL_DAYS = 90;
const MAX_PSEUDO = 20;
const MAX_TARGET = 1000;

export type Onboarding = { pseudo: string; character: CharacterId; color: ColorId; target: number; deadline: Day };
export type OnboardingResult = { ok: true; value: Onboarding } | { ok: false; error: string };

export function defaultDeadline(today: Day): Day {
  return addDays(today, DEFAULT_GOAL_DAYS);
}

export function validateOnboarding(
  input: { pseudo: string; character: string; color: string; target: string; deadline: string },
  today: Day,
  takenColors: string[],
): OnboardingResult {
  const pseudo = input.pseudo.trim();
  if (pseudo.length === 0 || pseudo.length > MAX_PSEUDO) return { ok: false, error: `Choisis un pseudo de 1 à ${MAX_PSEUDO} caractères.` };
  if (!CHARACTERS.includes(input.character as CharacterId)) return { ok: false, error: "Choisis ton personnage." };
  if (!COLORS.includes(input.color as ColorId)) return { ok: false, error: "Choisis ta couleur." };
  if (takenColors.includes(input.color)) return { ok: false, error: "Cette couleur est déjà prise par ton binôme." };
  const target = Number(input.target);
  if (!Number.isInteger(target) || target < 1 || target > MAX_TARGET) return { ok: false, error: `Vise entre 1 et ${MAX_TARGET} candidatures.` };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.deadline) || input.deadline <= today) return { ok: false, error: "Choisis une date limite après aujourd'hui." };
  return { ok: true, value: { pseudo, character: input.character as CharacterId, color: input.color as ColorId, target, deadline: input.deadline } };
}
