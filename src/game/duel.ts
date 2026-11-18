// Duel de fin de semaine contre un boss, à deux (maquettes docs/maquettes/decor-et-duel.html).
// Rien n'est stocké : tout se déduit des objectifs, des candidatures et des relances.
import { addDays, isWorkday, parisDay, type Day } from "./calendar";
import type { QuestRow } from "./quests";
import { levelFromXp } from "./levels";
import { activeApplications, totalXp, type Application, type Nudge } from "./xp";

export const BOSSES = ["Le Recruteur fantôme", "Le Golem ATS", "La Pile de refus", "Le Silence radio"] as const;
export type BossIndex = 0 | 1 | 2 | 3;

/** Nom du boss au milieu d'une phrase : « contre le Golem ATS ». */
export function bossInSentence(boss: BossIndex): string {
  return BOSSES[boss].replace(/^L/, "l");
}

export const DUEL_HOUR = 18;
/** Un coup de grâce par tranche de 5 niveaux, ajouté au moment du duel. */
export const LEVELS_PER_BONUS = 5;

export type DuelGoal = { playerId: string; target: number; createdAt: Date; deadline: Day };
export type DuelInput = { goals: DuelGoal[]; apps: Application[]; nudges: Nudge[]; quests?: QuestRow[] };

export type Fighter = { playerId: string; need: number; hits: number; bonus: number };
export type Duel = {
  /** Le vendredi du duel, qui sert d'identifiant. */
  id: Day;
  boss: BossIndex;
  start: Date;
  at: Date;
  hp: number;
  hits: number;
  bonus: number;
  fighters: Fighter[];
  won: boolean;
  resolved: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const hourFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hourCycle: "h23" });

/** L'instant `hour`:00 du jour `day`, heure de Paris. */
export function parisTime(day: Day, hour: number): Date {
  const guess = new Date(`${day}T${String(hour).padStart(2, "0")}:00:00Z`);
  const offset = Number(hourFormatter.format(guess)) - hour;
  return new Date(guess.getTime() - ((offset + 24) % 24) * 60 * 60 * 1000);
}

function weekday(day: Day): number {
  return new Date(`${day}T12:00:00Z`).getUTCDay();
}

/** Le vendredi du duel en cours à l'instant `now` : la semaine court du vendredi 18 h au vendredi 18 h suivant. */
export function duelDayOf(now: Date): Day {
  const today = parisDay(now);
  let friday = addDays(today, (5 - weekday(today) + 7) % 7);
  if (friday === today && now >= parisTime(friday, DUEL_HOUR)) friday = addDays(friday, 7);
  return friday;
}

export function bossOf(friday: Day): BossIndex {
  return (Math.floor(new Date(`${friday}T12:00:00Z`).getTime() / (7 * DAY_MS)) % BOSSES.length) as BossIndex;
}

function fridaysUntil(friday: Day, deadline: Day): number {
  let n = 0;
  for (let f = friday; f <= deadline; f = addDays(f, 7)) n++;
  return n;
}

function workdays(from: Day, to: Day): number {
  let n = 0;
  for (let d = from; d <= to; d = addDays(d, 1)) if (isWorkday(d)) n++;
  return n;
}

function levelAt(playerId: string, apps: Application[], nudges: Nudge[], quests: QuestRow[], at: Date): number {
  const before = apps.filter((a) => a.createdAt < at);
  return levelFromXp(totalXp(playerId, before, nudges.filter((n) => n.sentAt < at), quests.filter((q) => q.validatedAt !== null && q.validatedAt < at))).level;
}

/** Le duel du vendredi `friday`, évalué à l'instant `now` ; null si personne n'a de boss à combattre cette semaine. */
export function duelOn(input: DuelInput, friday: Day, now: Date): Duel | null {
  const at = parisTime(friday, DUEL_HOUR);
  const start = parisTime(addDays(friday, -7), DUEL_HOUR);
  const until = now < at ? now : at;
  const active = activeApplications(input.apps);
  const fighters: Fighter[] = [];

  for (const goal of input.goals) {
    if (goal.createdAt >= at || friday > goal.deadline) continue;
    const from = goal.createdAt > start ? goal.createdAt : start;
    const mine = active.filter((a) => a.userId === goal.playerId && a.createdAt >= goal.createdAt);
    const done = mine.filter((a) => a.createdAt < from).length;
    const remaining = goal.target - done;
    if (remaining <= 0) continue;
    let need = Math.ceil(remaining / fridaysUntil(friday, goal.deadline));
    // Objectif fixé en cours de semaine : boss au prorata des jours ouvrés restants.
    if (goal.createdAt > start) need = Math.max(1, Math.ceil((need * workdays(parisDay(goal.createdAt), friday)) / 5));
    const hits = mine.filter((a) => a.createdAt >= from && a.createdAt < until).length;
    const bonus = Math.floor(levelAt(goal.playerId, input.apps, input.nudges, input.quests ?? [], until) / LEVELS_PER_BONUS);
    fighters.push({ playerId: goal.playerId, need, hits, bonus });
  }
  if (fighters.length === 0) return null;

  const hp = fighters.reduce((s, f) => s + f.need, 0);
  const hits = fighters.reduce((s, f) => s + f.hits, 0);
  const bonus = fighters.reduce((s, f) => s + f.bonus, 0);
  return { id: friday, boss: bossOf(friday), start, at, hp, hits, bonus, fighters, won: hits + bonus >= hp, resolved: now >= at };
}

export function currentDuel(input: DuelInput, now: Date): Duel | null {
  return duelOn(input, duelDayOf(now), now);
}

/** Les duels déjà tranchés, du plus récent au plus ancien. */
export function pastDuels(input: DuelInput, now: Date): Duel[] {
  if (input.goals.length === 0) return [];
  const first = input.goals.reduce((min, g) => (g.createdAt < min ? g.createdAt : min), input.goals[0].createdAt);
  const duels: Duel[] = [];
  for (let f = addDays(duelDayOf(now), -7); f >= addDays(parisDay(first), -7); f = addDays(f, -7)) {
    const duel = duelOn(input, f, now);
    if (duel) duels.push(duel);
  }
  return duels;
}

/** Blessés tant que le dernier duel tranché est une défaite (purement visuel). */
export function isWounded(input: DuelInput, now: Date): boolean {
  const last = pastDuels(input, now)[0];
  return last ? !last.won : false;
}

/** Les combattants, le joueur courant en premier. */
export function fightersMeFirst(fighters: Fighter[], meId: string): Fighter[] {
  return [...fighters].sort((a, b) => Number(b.playerId === meId) - Number(a.playerId === meId));
}

/** Moins de 24 h avant le duel et le boss tient encore, coup de grâce compris. */
export function isUrgent(duel: Duel, now: Date): boolean {
  return !duel.resolved && !duel.won && duel.at.getTime() - now.getTime() <= DAY_MS;
}
