import { avatarState, countsByDay, currentStreak, type Mood } from "@/game/avatar";
import { addDays, parisDay, type Day } from "@/game/calendar";
import { formForLevel, levelFromXp, type Form } from "@/game/levels";
import { activeApplications, totalXp, type Application, type Nudge } from "@/game/xp";
import { formName } from "./forms";
import type { CharacterId, ColorId } from "./onboarding";

export type PlayerView = {
  id: string;
  pseudo: string;
  character: CharacterId;
  color: ColorId;
  level: number;
  xpInLevel: number;
  xpForNext: number;
  levelForm: Form;
  displayedForm: Form;
  title: string;
  mood: Mood;
  fallen: boolean;
  idleWorkdays: number;
  streak: number;
  goal: { target: number; done: number; deadline: Day; daysLeft: number } | null;
  today: { count: number; companies: string[] };
  feed: FeedItem[];
};

export type FeedItem =
  | { kind: "application"; company: string; day: Day }
  | { kind: "evolution"; formName: string; day: Day };

const FEED_SIZE = 5;

/** Moments où le joueur a atteint une nouvelle forme, en rejouant l'XP à chaque candidature (la sienne ou celle qui valide une relance). */
function evolutions(playerId: string, apps: Application[], nudges: Nudge[]): { form: Form; at: Date }[] {
  const checkpoints = activeApplications(apps)
    .map((a) => a.createdAt)
    .sort((a, b) => a.getTime() - b.getTime());
  const events: { form: Form; at: Date }[] = [];
  let best: Form = 1;
  for (const at of checkpoints) {
    const until = apps.filter((a) => a.createdAt <= at);
    const form = formForLevel(levelFromXp(totalXp(playerId, until, nudges.filter((n) => n.sentAt <= at))).level);
    if (form > best) {
      best = form;
      events.push({ form, at });
    }
  }
  return events;
}

type PlayerRow = { id: string; pseudo: string; character: CharacterId; color: ColorId };
type GoalRow = { target: number; deadline: Date; createdAt: Date } | null;

function daysBetween(from: Day, to: Day): number {
  let n = 0;
  for (let d = from; d < to; d = addDays(d, 1)) n++;
  return n;
}

export function buildPlayerView(player: PlayerRow, apps: Application[], nudges: Nudge[], goal: GoalRow, now: Date): PlayerView {
  const today = parisDay(now);
  const mine = activeApplications(apps)
    .filter((a) => a.userId === player.id)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const counts = countsByDay(mine);
  const { level, xpInLevel, xpForNext } = levelFromXp(totalXp(player.id, apps, nudges));
  const levelForm = formForLevel(level);
  const state = avatarState(counts, levelForm, today);
  const levelName = formName(player.character, levelForm);
  const title = state.fallen ? `${levelName} déchu` : formName(player.character, state.displayedForm);
  const todays = mine.filter((a) => parisDay(a.createdAt) === today);

  let goalView: PlayerView["goal"] = null;
  if (goal) {
    const deadline = parisDay(goal.deadline);
    const done = mine.filter((a) => a.createdAt >= goal.createdAt).length;
    goalView = { target: goal.target, done, deadline, daysLeft: Math.max(0, daysBetween(today, deadline)) };
  }

  return {
    id: player.id,
    pseudo: player.pseudo,
    character: player.character,
    color: player.color,
    level,
    xpInLevel,
    xpForNext,
    levelForm,
    displayedForm: state.displayedForm,
    title,
    mood: state.mood,
    fallen: state.fallen,
    idleWorkdays: state.idleWorkdays,
    streak: currentStreak(counts, today),
    goal: goalView,
    today: { count: todays.length, companies: todays.map((a) => a.company).reverse() },
    feed: [
      ...evolutions(player.id, apps, nudges).map((e) => ({ at: e.at, rank: 1, item: { kind: "evolution", formName: formName(player.character, e.form), day: parisDay(e.at) } as FeedItem })),
      ...mine.map((a) => ({ at: a.createdAt, rank: 0, item: { kind: "application", company: a.company, day: parisDay(a.createdAt) } as FeedItem })),
    ]
      .sort((a, b) => b.at.getTime() - a.at.getTime() || b.rank - a.rank)
      .slice(0, FEED_SIZE)
      .map((e) => e.item),
  };
}

/** Candidature précédente chez la même entreprise (casse et espaces ignorés), la plus récente. */
export function findDuplicate(company: string, playerId: string, apps: Application[]): Application | null {
  const key = company.trim().toLowerCase();
  return (
    activeApplications(apps)
      .filter((a) => a.userId === playerId && a.company.trim().toLowerCase() === key)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null
  );
}
