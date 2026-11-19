import { parisDay } from "@/game/calendar";
import type { Application } from "@/game/xp";
import { findDuplicate } from "./playerView";

export type IntakeDecision = { kind: "known"; id: string } | { kind: "attach"; id: string } | { kind: "create" };

/**
 * Que faire d'une candidature envoyée par job-finder (cadrage encart-job-finder) :
 * - known : cette offre est déjà arrivée (réponse perdue, reprise), même annulée depuis ; rien n'est ajouté ;
 * - attach : le joueur l'a déjà saisie à la main aujourd'hui (doublon sûr) ; on la rattache au lieu de la compter deux fois ;
 * - create : nouvelle candidature, sans confirmation de doublon (deux offres chez la même entreprise sont légitimes).
 */
export function intakeDecision(input: { company: string; ref: string; playerId: string; apps: Application[]; now: Date }): IntakeDecision {
  const mine = input.apps.filter((a) => a.userId === input.playerId);
  const known = mine.find((a) => a.externalRef === input.ref);
  if (known) return { kind: "known", id: known.id };
  const day = parisDay(input.now);
  // Une saisie déjà rattachée à une offre ne se rattache pas à une deuxième : ce sont deux candidatures.
  const manualToday = mine.filter((a) => !a.source && !a.externalRef && parisDay(a.createdAt) === day);
  const duplicate = findDuplicate(input.company, input.playerId, manualToday);
  return duplicate?.sure ? { kind: "attach", id: duplicate.app.id } : { kind: "create" };
}
