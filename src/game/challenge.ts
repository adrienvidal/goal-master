// Défi entre les deux joueurs (spec docs/specs/2026-11-16-defi-design.md). Tout est pur : seuls la demande,
// la réponse et le gagnant sont stockés, le reste (phase, score, couronne) se déduit de l'heure et des candidatures.
import { addDays, parisDay } from "./calendar";
import { DUEL_HOUR, duelDayOf, parisTime } from "./duel";
import type { Application } from "./xp";

export const CHALLENGE_TARGETS = [3, 5, 10] as const;
/** À partir de cette heure (Paris), « ce soir minuit » n'est plus proposé. */
export const TONIGHT_UNTIL_HOUR = 21;

export type ChallengeWhen = "tonight" | "friday";
export type ChallengeStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED";
export type ChallengeRow = {
  id: string;
  challengerId: string;
  opponentId: string;
  target: number;
  deadline: Date;
  status: ChallengeStatus;
  createdAt: Date;
  acceptedAt: Date | null;
  closedAt: Date | null;
  winnerId: string | null;
  wonAt: Date | null;
};
export type ChallengePhase = "pending" | "expired" | "declined" | "cancelled" | "running" | "won" | "draw";

const hourFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hourCycle: "h23" });

/** Échéance du défi lancé à `now`, ou null si ce choix n'est plus proposé. */
export function deadlineFor(when: ChallengeWhen, now: Date): Date | null {
  if (when === "friday") return parisTime(duelDayOf(now), DUEL_HOUR);
  if (Number(hourFormatter.format(now)) >= TONIGHT_UNTIL_HOUR) return null;
  return parisTime(addDays(parisDay(now), 1), 0);
}

export function phaseOf(c: ChallengeRow, now: Date): ChallengePhase {
  if (c.status === "DECLINED") return "declined";
  if (c.status === "CANCELLED") return "cancelled";
  if (c.winnerId) return "won";
  const over = now >= c.deadline;
  if (c.status === "PENDING") return over ? "expired" : "pending";
  return over ? "draw" : "running";
}

/** Le défi en attente ou en cours, s'il y en a un (un seul à la fois pour les deux joueurs). */
export function openChallenge(challenges: ChallengeRow[], now: Date): ChallengeRow | null {
  return challenges.find((c) => ["pending", "running"].includes(phaseOf(c, now))) ?? null;
}

export type LaunchCheck = { ok: true } | { ok: false; reason: "open" | "today" };

/** Un défi ouvert à la fois ; un lancement par jour et par personne (refusé ou expiré ne comptent pas). */
export function canLaunch(playerId: string, challenges: ChallengeRow[], now: Date): LaunchCheck {
  if (openChallenge(challenges, now)) return { ok: false, reason: "open" };
  const today = parisDay(now);
  const counted = challenges.some(
    (c) => c.challengerId === playerId && parisDay(c.createdAt) === today && !["declined", "expired"].includes(phaseOf(c, now)),
  );
  return counted ? { ok: false, reason: "today" } : { ok: true };
}

/** Fin de la course : la victoire, sinon l'échéance. */
function endOf(c: ChallengeRow): Date {
  return c.wonAt ?? c.deadline;
}

/** Candidatures envoyées entre l'acceptation et la fin ; une candidature retirée après la fin compte encore. */
export function challengeScore(playerId: string, c: ChallengeRow, apps: Application[]): number {
  if (!c.acceptedAt) return 0;
  const start = c.acceptedAt;
  const end = endOf(c);
  return apps.filter((a) => a.userId === playerId && a.createdAt >= start && a.createdAt <= end && (a.cancelledAt === null || a.cancelledAt > end)).length;
}

/** Le joueur vient-il d'atteindre la cible d'un défi encore en cours ? */
export function reachedTarget(c: ChallengeRow, playerId: string, apps: Application[], now: Date): boolean {
  if (phaseOf(c, now) !== "running") return false;
  if (playerId !== c.challengerId && playerId !== c.opponentId) return false;
  return challengeScore(playerId, c, apps.filter((a) => a.createdAt <= now)) >= c.target;
}

/** Porteur de la couronne : gagnant d'un défi, jusqu'à la fin du lendemain de sa victoire (Paris). */
export function crownHolder(challenges: ChallengeRow[], now: Date): string | null {
  const today = parisDay(now);
  const recent = challenges
    .filter((c) => c.winnerId && c.wonAt && c.wonAt <= now && today <= addDays(parisDay(c.wonAt), 1))
    .sort((x, y) => y.wonAt!.getTime() - x.wonAt!.getTime());
  return recent[0]?.winnerId ?? null;
}

/** Défis terminés (gagnés ou nuls), du plus récent au plus ancien. */
export function finishedChallenges(challenges: ChallengeRow[], now: Date): ChallengeRow[] {
  return challenges
    .filter((c) => ["won", "draw"].includes(phaseOf(c, now)))
    .sort((x, y) => endOf(y).getTime() - endOf(x).getTime());
}

export function lastFinished(challenges: ChallengeRow[], now: Date): ChallengeRow | null {
  return finishedChallenges(challenges, now)[0] ?? null;
}

/** Plus longue suite de victoires du joueur ; un nul ou une défaite la coupe. */
export function bestWinStreak(playerId: string, challenges: ChallengeRow[], now: Date): number {
  let best = 0;
  let run = 0;
  for (const c of finishedChallenges(challenges, now).reverse()) {
    run = c.winnerId === playerId ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}
