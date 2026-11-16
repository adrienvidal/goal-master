// Fin d'objectif (cadrage §4.4) : atteint → victoire ; date limite passée sans l'atteindre → « Temps écoulé ».
import { addDays, type Day } from "@/game/calendar";
import { CHARACTERS, type CharacterId } from "./onboarding";

export type GoalOutcome = "active" | "won" | "expired";

export const EXTEND_DAYS = 28;

export function goalOutcome(done: number, target: number, deadline: Day, today: Day): GoalOutcome {
  if (done >= target) return "won";
  if (today > deadline) return "expired";
  return "active";
}

/** Nouvelle date proposée pour prolonger : 4 semaines après aujourd'hui. */
export function extendedDeadline(today: Day): Day {
  return addDays(today, EXTEND_DAYS);
}

export type NewGoal = { deadline: Day; character: CharacterId };

export function validateNewGoal(input: { deadline: string; character: string }, today: Day): { ok: true; value: NewGoal } | { ok: false; error: string } {
  if (!CHARACTERS.includes(input.character as CharacterId)) return { ok: false, error: "Choisis ton personnage." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.deadline) || input.deadline <= today) return { ok: false, error: "Choisis une date limite après aujourd'hui." };
  return { ok: true, value: { deadline: input.deadline, character: input.character as CharacterId } };
}
