// Règles du bouton « Motiver » (cadrage §7) : une relance par jour et par personne, bandeau tant que la relance est
// fraîche et que le destinataire n'a pas encore candidaté.
import { parisDay, type Day } from "./calendar";
import { activeApplications, nudgeSucceeded, type Application } from "./xp";

export const NUDGE_MESSAGES = [
  "Juste une candidature aujourd'hui ?",
  "Allez, on lâche rien ! 💪",
  "Alors, on fait la sieste ? 😴",
  "Ton avatar prend la poussière…",
] as const;

export type NudgeRow = { id: string; senderId: string; recipientId: string; message: number; sentAt: Date };

const DAY_MS = 24 * 60 * 60 * 1000;

export function sentToday(senderId: string, nudges: NudgeRow[], today: Day): boolean {
  return nudges.some((n) => n.senderId === senderId && parisDay(n.sentAt) === today);
}

/** Relance reçue dans les 24 dernières heures, à laquelle on n'a pas encore répondu par une candidature. */
export function pendingNudge(recipientId: string, nudges: NudgeRow[], apps: Application[], now: Date): NudgeRow | null {
  const fresh = nudges
    .filter((n) => n.recipientId === recipientId && now.getTime() - n.sentAt.getTime() <= DAY_MS)
    .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
  const mine = activeApplications(apps).filter((a) => a.userId === recipientId);
  return fresh.find((n) => !nudgeSucceeded(n, mine)) ?? null;
}

/** Relance que le destinataire vient de valider (candidature des 2 dernières minutes) : bandeau « Relance réussie ». */
export function justWonNudge(recipientId: string, nudges: NudgeRow[], apps: Application[], now: Date, windowMs = 2 * 60 * 1000): NudgeRow | null {
  const mine = activeApplications(apps).filter((a) => a.userId === recipientId);
  return (
    nudges
      .filter((n) => n.recipientId === recipientId && nudgeSucceeded(n, mine))
      .find((n) => {
        const first = mine.filter((a) => a.createdAt > n.sentAt).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
        return first !== undefined && now.getTime() - first.createdAt.getTime() <= windowMs;
      }) ?? null
  );
}
