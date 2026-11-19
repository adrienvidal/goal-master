// Bilan du jour : un seul e-mail par joueur et par jour, qui regroupe ses notifications (spec bilan du jour).
import { addDays, parisDay, type Day } from "./calendar";
import { ruleOf, sendsEmail, textOf, type NotificationEvent } from "./notifications";
import type { QuestRow } from "./quests";
import { activeApplications, totalXp, type Application, type Nudge } from "./xp";

export type DigestRow = { id: string; event: NotificationEvent; sentAt: Date };
export type DigestLine = { id: string; event: NotificationEvent; time: string };
type DuelEvent = Extract<NotificationEvent, { kind: "duel" }>;
export type Digest = { duel: DuelEvent | null; lines: DigestLine[]; top: NotificationEvent; subject: string; count: number };

/** Ordre d'importance pour l'objet et l'image : le premier présent mène le bilan. */
const PRIORITY: NotificationEvent["kind"][] = [
  "duel",
  "remind",
  "quest",
  "quest-done",
  "quest-end",
  "challenge",
  "challenge-end",
  "arena",
  "arena-end",
  "nudge",
  "nudge-ok",
  "evo",
  "evo-me",
  "ko",
  "rust",
  "news",
  "quest-cancel",
  "arena-turn",
];

const clock = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
const dayMonth = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit" });
const longDate = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" });

/** « 09:12 » aujourd'hui, « hier 19:30 », sinon « 15/11 09:00 ». */
function timeLabel(at: Date, today: Day): string {
  const day = parisDay(at);
  const hour = clock.format(at);
  if (day === today) return hour;
  if (day === addDays(today, -1)) return `hier ${hour}`;
  return `${dayMonth.format(at)} ${hour}`;
}

/** « Mercredi 18 novembre ». */
export function digestDate(now: Date): string {
  const s = longDate.format(now);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function subjectOf(top: NotificationEvent, count: number): string {
  const headline = textOf(top).headline.replace(/\.$/, "");
  const others = count - 1;
  if (others === 0) return `Ta journée : ${headline}`;
  const tail = `et ${others} autre${others > 1 ? "s" : ""} nouvelle${others > 1 ? "s" : ""}`;
  return `Ta journée : ${headline}${/[!?]$/.test(headline) ? "" : ","} ${tail}`;
}

/** Bilan d'un joueur à partir de ses notifications en attente, ou null s'il n'y a rien à dire. */
export function digestOf(rows: DigestRow[], muted: readonly string[], now: Date): Digest | null {
  const kept = rows.filter((r) => sendsEmail(r.event) && !muted.includes(ruleOf(r.event).category)).sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
  if (kept.length === 0) return null;
  const today = parisDay(now);
  const duels = kept.filter((r) => r.event.kind === "duel");
  const duel = (duels.at(-1)?.event as DuelEvent | undefined) ?? null;
  const lines = kept.filter((r) => r.event.kind !== "duel").map((r) => ({ id: r.id, event: r.event, time: timeLabel(r.sentAt, today) }));
  const rank = (e: NotificationEvent): number => PRIORITY.indexOf(e.kind);
  const top = kept.reduce((best, r) => (rank(r.event) < rank(best.event) ? r : best)).event;
  const count = lines.length + (duel ? 1 : 0);
  return { duel, lines, top, subject: subjectOf(top, count), count };
}

type XpData = { apps: Application[]; nudges: Nudge[]; quests: QuestRow[] };

/** Candidatures actives du joueur ce jour-là (heure de Paris). */
export function applicationsOn(playerId: string, apps: Application[], day: Day): number {
  return activeApplications(apps).filter((a) => a.userId === playerId && parisDay(a.createdAt) === day).length;
}

/** XP gagnées depuis `since` : total d'aujourd'hui moins celui d'avant, jamais négatif. */
export function xpGainedSince(playerId: string, data: XpData, since: Date): number {
  const before = {
    apps: data.apps.filter((a) => a.createdAt < since),
    nudges: data.nudges.filter((n) => n.sentAt < since),
    quests: data.quests.map((q) => (q.validatedAt && q.validatedAt >= since ? { ...q, status: "DONE" as const } : q)),
  };
  const gained = totalXp(playerId, data.apps, data.nudges, data.quests) - totalXp(playerId, before.apps, before.nudges, before.quests);
  return Math.max(0, gained);
}
