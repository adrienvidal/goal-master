import { parisDay } from "./calendar";
import { DAILY_XP_CAP, XP_NUDGE_BONUS, XP_PER_APPLICATION } from "./levels";
import { questXp, type QuestRow } from "./quests";

export type Application = {
  id: string;
  userId: string;
  company: string;
  createdAt: Date;
  cancelledAt: Date | null;
};

export type Nudge = {
  id: string;
  senderId: string;
  recipientId: string;
  sentAt: Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function activeApplications(apps: Application[]): Application[] {
  return apps.filter((a) => a.cancelledAt === null);
}

export function nudgeSucceeded(nudge: Nudge, apps: Application[]): boolean {
  const start = nudge.sentAt.getTime();
  return activeApplications(apps).some(
    (a) => a.userId === nudge.recipientId && a.createdAt.getTime() > start && a.createdAt.getTime() <= start + DAY_MS,
  );
}

/** XP totale : candidatures (plafonnées par jour), relances suivies d'effet et quêtes validées. */
export function totalXp(userId: string, apps: Application[], nudges: Nudge[], quests: QuestRow[] = []): number {
  const perDay = new Map<string, number>();
  let xp = 0;
  const mine = activeApplications(apps)
    .filter((a) => a.userId === userId)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  for (const a of mine) {
    const day = parisDay(a.createdAt);
    const count = (perDay.get(day) ?? 0) + 1;
    perDay.set(day, count);
    if (count <= DAILY_XP_CAP) xp += XP_PER_APPLICATION;
  }
  for (const n of nudges) {
    if ((n.senderId === userId || n.recipientId === userId) && nudgeSucceeded(n, apps)) xp += XP_NUDGE_BONUS;
  }
  return xp + questXp(userId, quests);
}
