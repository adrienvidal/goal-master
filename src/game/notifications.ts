// Notifications (spec docs/specs/2026-11-16-notifications-design.md) : catégories, plafond, textes et
// détection des événements. Tout est pur : l'envoi vit dans src/server/notify.ts.
import { addDays, dayRange, isWorkday, parisDay, type Day } from "./calendar";
import { BOSSES, type BossIndex, type Duel } from "./duel";
import { formForLevel, levelFromXp, type Form } from "./levels";
import { NUDGE_MESSAGES, type NudgeRow } from "./nudges";
import type { QuestRow } from "./quests";
import { activeApplications, nudgeSucceeded, totalXp, type Application } from "./xp";

export const CATEGORIES = ["nudges", "partner", "duel", "quests", "reminders", "news"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_INFO: Record<Category, { label: string; hint: string }> = {
  nudges: { label: "Relances", hint: "Ton binôme te motive, ta relance a marché." },
  partner: { label: "Binôme", hint: "Il change de forme, il achève le boss." },
  duel: { label: "Duel", hint: "Rappel du jeudi soir, résultat du vendredi 18 h, défis." },
  quests: { label: "Quêtes", hint: "Quête reçue, faite, validée." },
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
  | { kind: "news"; step: number; title: string }
  | { kind: "challenge"; challengeId: string; from: string; target: number; until: string }
  | { kind: "challenge-end"; challengeId: string; won: boolean; partner: string; mine: number; theirs: number }
  | { kind: "arena"; arenaId: string; from: string; rusty: boolean }
  | { kind: "arena-turn"; arenaId: string; turn: number; partner: string; summary: string; hp: number }
  | { kind: "arena-end"; arenaId: string; won: boolean | null; ko: boolean; partner: string }
  | { kind: "quest"; questId: string; from: string; text: string }
  | { kind: "quest-done"; questId: string; round: number; from: string; text: string }
  | { kind: "quest-end"; questId: string; round: number; validated: boolean; chest?: boolean; partner: string; text: string }
  | { kind: "quest-cancel"; questId: string; partner: string; text: string };

const RULES: Record<NotificationEvent["kind"], { category: Category; capped: boolean }> = {
  nudge: { category: "nudges", capped: false },
  "nudge-ok": { category: "nudges", capped: true },
  evo: { category: "partner", capped: true },
  ko: { category: "partner", capped: true },
  remind: { category: "duel", capped: false },
  duel: { category: "duel", capped: false },
  rust: { category: "reminders", capped: true },
  news: { category: "news", capped: true },
  challenge: { category: "duel", capped: false },
  "challenge-end": { category: "duel", capped: false },
  arena: { category: "duel", capped: false },
  "arena-turn": { category: "duel", capped: false },
  "arena-end": { category: "duel", capped: false },
  // Une quête n'avance que si l'autre est prévenu : jamais plafonnées (spec quetes).
  quest: { category: "quests", capped: false },
  "quest-done": { category: "quests", capped: false },
  "quest-end": { category: "quests", capped: false },
  "quest-cancel": { category: "quests", capped: false },
};

export function ruleOf(event: NotificationEvent): { category: Category; capped: boolean } {
  return RULES[event.kind];
}

/** Pendant un combat d'Arène, les tours ne partent qu'en push : périmés le soir, ils n'entrent pas dans le bilan. */
const PUSH_ONLY: ReadonlySet<NotificationEvent["kind"]> = new Set(["arena-turn"]);

/** L'événement entre-t-il dans le bilan du jour ? */
export function sendsEmail(event: NotificationEvent): boolean {
  return !PUSH_ONLY.has(event.kind);
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
    case "challenge":
    case "challenge-end":
      return `${event.kind}:${event.challengeId}`;
    case "arena":
    case "arena-end":
      return `${event.kind}:${event.arenaId}`;
    case "arena-turn":
      return `arena-turn:${event.arenaId}:${event.turn}`;
    case "quest":
    case "quest-cancel":
      return `${event.kind}:${event.questId}`;
    case "quest-done":
    case "quest-end":
      // Un aller-retour « pas encore » change `round` (l'instant où la quête a été marquée faite).
      return `${event.kind}:${event.questId}:${event.round}`;
  }
}

/** Catégorie coupée par le joueur : ni push, ni bilan. */
export function isMuted(event: NotificationEvent, muted: readonly string[]): boolean {
  return muted.includes(ruleOf(event).category);
}

/** Le push part-il ? Non au-delà du plafond du jour pour les catégories plafonnées (le bilan, lui, garde tout). */
export function pushAllowed(event: NotificationEvent, cappedPushedToday: number): boolean {
  return !ruleOf(event).capped || cappedPushedToday < DAILY_NOTIFICATION_CAP;
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
    case "challenge":
      return { title: `🏁 ${event.from} te défie`, headline: `${event.from} te défie : ${event.target} candidatures avant ${event.until}.`, detail: "Le premier arrivé gagne la couronne.", url: "/" };
    case "challenge-end":
      return event.won
        ? t(`Défi gagné ! Tu as battu ${event.partner} ${event.mine} à ${event.theirs}.`, "La couronne est à toi jusqu'à demain soir.", "/defi")
        : t(`${event.partner} l'emporte ${event.theirs} à ${event.mine}.`, "Tes candidatures comptent quand même pour l'XP et pour le boss.", "/defi");
    case "arena":
      return {
        title: `🛡️ ${event.from} te provoque en Arène`,
        headline: `${event.from} te provoque en Arène.`,
        detail: event.rusty ? "Ton héros est rouillé : il entre sans énergie. Une candidature et il reprend les armes." : "Tour par tour, tes candidatures font tes coups.",
        url: "/",
      };
    case "arena-turn":
      return { title: "🛡️ À toi de jouer", headline: `${event.summary} Il te reste ${event.hp} PV.`, detail: "Ton tour t'attend 24 h dans l'Arène.", url: "/arene" };
    case "arena-end":
      if (event.won === null) return t(`Arène : match nul contre ${event.partner}.`, "Même nombre de PV vendredi 18 h, pas de couronne cette fois.", "/arene/resultat");
      return event.won
        ? t(event.ko ? `K.O. ! Tu as battu ${event.partner} dans l'Arène.` : `Victoire aux points contre ${event.partner} !`, "La couronne est à toi jusqu'à demain soir.", "/arene/resultat")
        : t(`${event.partner} l'emporte dans l'Arène.`, "Tes candidatures comptent quand même pour l'XP et pour le boss.", "/arene/resultat");
    case "quest":
      return { title: `📜 ${event.from} te lance une quête`, headline: `${event.from} te lance une quête`, detail: `« ${event.text} ». Un coffre à la clé.`, url: `/quete/${event.questId}` };
    case "quest-done":
      return { title: `📜 ${event.from} a fait sa quête`, headline: `${event.from} a fait sa quête`, detail: `« ${event.text} ». À toi de valider.`, url: `/quete/${event.questId}` };
    case "quest-end":
      if (event.validated && event.chest === false) return { title: "📜 Quête validée", headline: "Quête validée", detail: `${event.partner} a validé « ${event.text} ». +20 XP. Ta Ménagerie est complète.`, url: "/" };
      return event.validated
        ? { title: "🎁 Quête validée", headline: "Quête validée, un coffre t'attend", detail: `${event.partner} a validé « ${event.text} ». +20 XP.`, url: "/coffre" }
        : { title: "📜 Pas encore", headline: "Pas encore", detail: `${event.partner} n'a pas validé « ${event.text} ». Jette un œil à ton lien.`, url: `/quete/${event.questId}` };
    case "quest-cancel":
      return t("Quête annulée", `${event.partner} a retiré « ${event.text} ».`);
  }
}

/** Corps de la notification push : titre à part, le reste en une phrase. */
export function pushBody(text: NotificationText, event: NotificationEvent): string {
  if (event.kind === "nudge") return NUDGE_MESSAGES[event.message];
  if (event.kind === "challenge") return `${event.target} candidatures avant ${event.until}. ${text.detail}`;
  if (event.kind === "arena" || event.kind === "arena-turn") return `${event.kind === "arena" ? "" : text.headline + " "}${text.detail}`.trim();
  return `${text.headline} ${text.detail}`;
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

function formOf(playerId: string, apps: Application[], nudges: NudgeRow[], quests: QuestRow[]): Form {
  return formForLevel(levelFromXp(totalXp(playerId, apps, nudges, quests)).level);
}

/** Nouvelle forme atteinte entre deux états des candidatures, ou null. */
export function formReached(playerId: string, before: Application[], after: Application[], nudges: NudgeRow[], quests: QuestRow[] = []): Form | null {
  const from = formOf(playerId, before, nudges, quests);
  const to = formOf(playerId, after, nudges, quests);
  return to > from ? to : null;
}

/** Nouvelle forme atteinte grâce à une quête qu'on vient de valider, ou null. */
export function questFormReached(playerId: string, apps: Application[], nudges: NudgeRow[], before: QuestRow[], after: QuestRow[]): Form | null {
  const from = formOf(playerId, apps, nudges, before);
  const to = formOf(playerId, apps, nudges, after);
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
