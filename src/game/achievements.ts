import { avatarState, bestStreak, countsByDay } from "./avatar";
import type { Day } from "./calendar";
import type { Form } from "./levels";
import { activeApplications, nudgeSucceeded, type Application, type Nudge } from "./xp";

export type AchievementId =
  | "first_step"
  | "on_the_way"
  | "quarter"
  | "halfway"
  | "centurion"
  | "warm_up"
  | "week_on_fire"
  | "machine"
  | "mission"
  | "duo"
  | "coach"
  | "phoenix"
  | "revenant"
  | "first_boss"
  | "duelist"
  | "unbeaten";

export const ACHIEVEMENTS: Record<AchievementId, { title: string; condition: string }> = {
  first_step: { title: "Premier pas", condition: "1ʳᵉ candidature" },
  on_the_way: { title: "En route", condition: "10 candidatures" },
  quarter: { title: "Quart de quête", condition: "25 candidatures" },
  halfway: { title: "Mi-parcours", condition: "50 candidatures" },
  centurion: { title: "Centurion", condition: "100 candidatures" },
  warm_up: { title: "Échauffement", condition: "Série de 3 jours" },
  week_on_fire: { title: "Semaine de feu", condition: "Série de 7 jours" },
  machine: { title: "Machine", condition: "Série de 30 jours" },
  mission: { title: "Mission accomplie", condition: "Objectif atteint" },
  duo: { title: "Duo", condition: "Les deux ont candidaté le même jour" },
  coach: { title: "Coach", condition: "5 relances suivies d'effet" },
  phoenix: { title: "Phénix", condition: "Candidater après avoir reçu une relance" },
  revenant: { title: "Revenant", condition: "Sortir de l'état Déchu par une reconquête" },
  first_boss: { title: "Premier boss", condition: "Vaincre un boss en duel" },
  duelist: { title: "Duelliste", condition: "Gagner un défi" },
  unbeaten: { title: "Invaincu", condition: "Gagner 3 défis d'affilée" },
};

const APPLICATION_MILESTONES: [number, AchievementId][] = [
  [1, "first_step"],
  [10, "on_the_way"],
  [25, "quarter"],
  [50, "halfway"],
  [100, "centurion"],
];
const STREAK_MILESTONES: [number, AchievementId][] = [
  [3, "warm_up"],
  [7, "week_on_fire"],
  [30, "machine"],
];
const COACH_NUDGES = 5;
const UNBEATEN_WINS = 3;

export function earnedAchievements(input: {
  userId: string;
  partnerId: string;
  apps: Application[];
  nudges: Nudge[];
  goalsReached: number;
  today: Day;
  levelForm: Form;
  bossesBeaten?: number;
  /** Plus longue suite de défis gagnés (src/game/challenge.ts). */
  challengeWinStreak?: number;
}): Set<AchievementId> {
  const { userId, partnerId, apps, nudges, goalsReached, today, levelForm, bossesBeaten = 0, challengeWinStreak = 0 } = input;
  const active = activeApplications(apps);
  const mine = active.filter((a) => a.userId === userId);
  const myCounts = countsByDay(mine);
  const earned = new Set<AchievementId>();

  for (const [n, id] of APPLICATION_MILESTONES) if (mine.length >= n) earned.add(id);
  const streak = bestStreak(myCounts);
  for (const [n, id] of STREAK_MILESTONES) if (streak >= n) earned.add(id);
  if (goalsReached >= 1) earned.add("mission");
  if (bossesBeaten >= 1) earned.add("first_boss");
  if (challengeWinStreak >= 1) earned.add("duelist");
  if (challengeWinStreak >= UNBEATEN_WINS) earned.add("unbeaten");

  const partnerDays = countsByDay(active.filter((a) => a.userId === partnerId));
  if ([...myCounts.keys()].some((d) => partnerDays.has(d))) earned.add("duo");

  const sentSucceeded = nudges.filter((n) => n.senderId === userId && nudgeSucceeded(n, apps)).length;
  if (sentSucceeded >= COACH_NUDGES) earned.add("coach");
  if (nudges.some((n) => n.recipientId === userId && nudgeSucceeded(n, apps))) earned.add("phoenix");

  if (avatarState(myCounts, levelForm, today).reconquests >= 1) earned.add("revenant");
  return earned;
}
