import { addDays, dayRange, isWorkday, parisDay, type Day } from "./calendar";
import type { Form } from "./levels";
import { activeApplications, type Application } from "./xp";

export type Mood = "normal" | "sleep" | "tired" | "exhausted";

export type AvatarState = {
  mood: Mood;
  idleWorkdays: number;
  lostForms: number;
  displayedForm: Form;
  fallen: boolean;
  reconquests: number;
};

const SLEEP_AFTER = 2;
const TIRED_AFTER = 4;
const FALL_AFTER = 7;
const EXTRA_LOSS_EVERY = 5;
const RECONQUEST_APPLICATIONS = 3;

export function countsByDay(apps: Application[]): Map<Day, number> {
  const counts = new Map<Day, number>();
  for (const a of activeApplications(apps)) {
    const day = parisDay(a.createdAt);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return counts;
}

export function currentStreak(counts: Map<Day, number>, today: Day): number {
  let day = counts.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (counts.has(day)) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}

export function bestStreak(counts: Map<Day, number>): number {
  let best = 0;
  for (const day of counts.keys()) {
    if (counts.has(addDays(day, -1))) continue;
    let length = 0;
    for (let d = day; counts.has(d); d = addDays(d, 1)) length++;
    best = Math.max(best, length);
  }
  return best;
}

export function avatarState(counts: Map<Day, number>, levelForm: Form, today: Day): AvatarState {
  let idle = 0;
  let lostForms = 0;
  let fallen = false;
  let reconquests = 0;
  const days = [...counts.keys()].sort();

  if (days.length > 0) {
    for (const day of dayRange(days[0], today)) {
      const n = counts.get(day) ?? 0;
      if (n > 0) {
        const previous = counts.get(addDays(day, -1)) ?? 0;
        if (fallen && previous > 0 && previous + n >= RECONQUEST_APPLICATIONS) {
          fallen = false;
          lostForms = 0;
          reconquests++;
        }
        idle = 0;
      } else if (isWorkday(day)) {
        idle++;
        if (idle >= FALL_AFTER) {
          fallen = true;
          lostForms = Math.max(lostForms, 1 + Math.floor((idle - FALL_AFTER) / EXTRA_LOSS_EVERY));
        }
      }
    }
  }

  const mood: Mood = fallen ? "exhausted" : idle >= TIRED_AFTER ? "tired" : idle >= SLEEP_AFTER ? "sleep" : "normal";
  const displayedForm = Math.max(1, levelForm - lostForms) as Form;
  return { mood, idleWorkdays: idle, lostForms, displayedForm, fallen, reconquests };
}
