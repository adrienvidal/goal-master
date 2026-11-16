// Notifications (spec docs/specs/2026-11-16-notifications-design.md) : catégories, plafond, textes et
// détection des événements. Tout est pur : l'envoi vit dans src/server/notify.ts.
import { addDays, dayRange, isWorkday, parisDay, type Day } from "./calendar";
import { BOSSES, type BossIndex, type Duel } from "./duel";
import { formForLevel, levelFromXp, type Form } from "./levels";
import { NUDGE_MESSAGES, type NudgeRow } from "./nudges";
import { activeApplications, nudgeSucceeded, totalXp, type Application } from "./xp";

export const CATEGORIES = ["nudges", "partner", "duel", "reminders", "news"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_INFO: Record<Category, { label: string; hint: string }> = {
  nudges: { label: "Relances", hint: "Ton binôme te motive, ta relance a marché." },
  partner: { label: "Binôme", hint: "Il change de forme, il achève le boss." },
  duel: { label: "Duel", hint: "Rappel du jeudi soir, résultat du vendredi 18 h." },
  reminders: { label: "Rappels", hint: "Ton avatar commence à rouiller." },
  news: { label: "Nouveautés", hint: "Une nouvelle fonctionnalité arrive dans Goal Master." },
};

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

/** Notifications plafonnées par jour (Paris) et par personne ; relance reçue et duel passent toujours. */
export const DAILY_NOTIFICATION_CAP = 2;
/** Jours ouvrés sans candidature avant le rappel « ton avatar rouille ». */
export const RUST_AFTER_WORKDAYS = 3;

export type NotificationEvent =
  | { kind: "nudge"; nudgeId: string; from: string; message: number }
  | { kind: "nudge-ok"; nudgeId: string; partner: string }
  | { kind: "evo"; partnerId: string; partner: string; form: Form; formName: string }
  | { kind: "ko"; friday: Day; partner: string; boss: BossIndex }
  | { kind: "remind"; friday: Day; boss: BossIndex; missing: number }
  | { kind: "duel"; friday: Day; won: boolean; boss: BossIndex; total: number; hp: number }
  | { kind: "rust"; lastDay: Day; idle: number; hero: string }
  | { kind: "news"; step: number; title: string };

const RULES: Record<NotificationEvent["kind"], { category: Category; capped: boolean }> = {
  nudge: { category: "nudges", capped: false },
  "nudge-ok": { category: "nudges", capped: true },
  evo: { category: "partner", capped: true },
  ko: { category: "partner", capped: true },
  remind: { category: "duel", capped: false },
  duel: { category: "duel", capped: false },
  rust: { category: "reminders", capped: true },
  news: { category: "news", capped: true },
};

export function ruleOf(event: NotificationEvent): { category: Category; capped: boolean } {
  return RULES[event.kind];
}

/** Clé unique par destinataire : un même événement ne part qu'une fois. */
export function keyOf(event: NotificationEvent): string {
  switch (event.kind) {
    case "nudge":
    case "nudge-ok":
      return `${event.kind}:${event.nudgeId}`;
    case "evo":
      return `evo:${event.partnerId}:${event.form}`;
    case "ko":
    case "remind":
    case "duel":
      return `${event.kind}:${event.friday}`;
    case "rust":
      return `rust:${event.lastDay}`;
    case "news":
      return `news:${event.step}`;
  }
}

/** Faut-il envoyer ? Catégorie coupée ou plafond du jour atteint : non. */
export function shouldSend(event: NotificationEvent, muted: readonly string[], cappedSentToday: number): boolean {
  const rule = ruleOf(event);
  if (muted.includes(rule.category)) return false;
  return !rule.capped || cappedSentToday < DAILY_NOTIFICATION_CAP;
}

export type NotificationText = { title: string; headline: string; detail: string; url: string };

/** Textes de la maquette ; jamais de nom d'entreprise. */
export function textOf(event: NotificationEvent): NotificationText {
  const t = (headline: string, detail: string, url = "/"): NotificationText => ({ title: "Goal Master", headline, detail, url });
  switch (event.kind) {
    case "nudge":
      return { title: `⚔️ ${event.from} te motive`, headline: `${event.from} te motive : ${NUDGE_MESSAGES[event.message]}`, detail: "Candidate dans les 24 h : +15 XP pour vous deux.", url: "/" };
    case "nudge-ok":
      return t(`${event.partner} a candidaté après ta relance : +15 XP pour vous deux.`, "Ta relance a fait mouche.");
    case "evo":
      return t(`${event.partner} est devenu ${event.formName} ⚔️`, "Ton binôme vient de changer de forme. À ton tour de lui montrer le chemin.");
    case "ko":
      return t(`${event.partner} a mis ${BOSSES[event.boss]} K.O. !`, "Victoire assurée vendredi 18 h.");
    case "remind":
      return t(`${BOSSES[event.boss]} tient encore.`, `Il manque ${event.missing} coup${event.missing > 1 ? "s" : ""} avant demain 18 h.`);
    case "duel":
      return event.won
        ? t("Boss vaincu !", `${BOSSES[event.boss]} est tombé : ${event.total} coups contre ${event.hp} PV.`, "/duel")
        : t(`${BOSSES[event.boss]} s'échappe.`, `${event.total} coup${event.total > 1 ? "s" : ""} contre ${event.hp} PV. Vous êtes blessés jusqu'à la prochaine victoire.`, "/duel");
    case "rust":
      return t(`Ton ${event.hero} commence à rouiller.`, `${event.idle} jours sans candidature. Une candidature suffit à le réveiller.`);
    case "news":
      return t(`Nouveau dans Goal Master : ${event.title}.`, "Viens voir ce qui a changé.", "/intro");
  }
}

/** Corps de la notification push : titre à part, le reste en une phrase. */
export function pushBody(text: NotificationText, event: NotificationEvent): string {
  return event.kind === "nudge" ? NUDGE_MESSAGES[event.message] : `${text.headline} ${text.detail}`;
}

/** Rouille : dernier jour actif et jours ouvrés d'inactivité depuis, si le seuil est atteint. */
export function rustDue(playerId: string, apps: Application[], today: Day): { lastDay: Day; idle: number } | null {
  const days = activeApplications(apps)
    .filter((a) => a.userId === playerId)
    .map((a) => a.createdAt);
  if (days.length === 0) return null;
  const last = new Date(Math.max(...days.map((d) => d.getTime())));
  const lastDay = parisDay(last);
  if (lastDay >= today) return null;
  const idle = dayRange(addDays(lastDay, 1), today).filter(isWorkday).length;
  return idle >= RUST_AFTER_WORKDAYS ? { lastDay, idle } : null;
}

function formOf(playerId: string, apps: Application[], nudges: NudgeRow[]): Form {
  return formForLevel(levelFromXp(totalXp(playerId, apps, nudges)).level);
}

/** Nouvelle forme atteinte entre deux états des candidatures, ou null. */
export function formReached(playerId: string, before: Application[], after: Application[], nudges: NudgeRow[]): Form | null {
  const from = formOf(playerId, before, nudges);
  const to = formOf(playerId, after, nudges);
  return to > from ? to : null;
}

/** Relances validées par la candidature qu'on vient d'ajouter. */
export function nudgesJustSucceeded(recipientId: string, nudges: NudgeRow[], before: Application[], after: Application[]): NudgeRow[] {
  return nudges.filter((n) => n.recipientId === recipientId && !nudgeSucceeded(n, before) && nudgeSucceeded(n, after));
}

/** Le boss vient de tomber à 0 PV (coups seuls, comme la carte « K.O. »). */
export function koCrossed(before: Duel | null, after: Duel | null): boolean {
  if (!after || after.hits < after.hp) return false;
  return !before || before.id !== after.id || before.hits < before.hp;
}
