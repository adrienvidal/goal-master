import type { Mood } from "@/game/avatar";
import { parisDay } from "@/game/calendar";
import { shownForm } from "@/game/evolution";
import { DAILY_XP_CAP, XP_PER_APPLICATION, type Form } from "@/game/levels";
import { activeApplications, type Application } from "@/game/xp";
import type { Duel } from "@/game/duel";
import type { CompanionId } from "@/game/quests";
import { formName } from "./forms";
import type { CharacterId, ColorId } from "./onboarding";
import { splitCompany, type PlayerView } from "./playerView";

/** Ce que l'encart job-finder affiche (cadrage encart-job-finder). */
export type WidgetState = {
  pseudo: string;
  character: CharacterId;
  color: ColorId;
  displayedForm: Form;
  levelForm: Form;
  mood: Mood;
  idleWorkdays: number;
  level: number;
  xpInLevel: number;
  xpForNext: number;
  today: number;
  capReached: boolean;
  streak: number;
  /** Une forme atteinte dont la scène n'a pas encore été vue sur / : l'encart l'annonce en silhouette jusque-là. */
  evolutionPending: boolean;
  /** Nom de la forme affichée (bulle du mode libre). */
  formName: string;
  /** Compagnons choisis pour passer dans la scène du mode libre, avec le nom donné dans la Ménagerie. */
  companions: { id: CompanionId; name: string }[];
  /** Les dernières candidatures arrivées par job-finder, la plus récente d'abord, avec l'XP qu'elles ont rapportée. */
  recent: { id: string; company: string; at: string; xp: number }[];
  /** Le héros de l'ami, qui passe dans la scène du mode libre (cadrage encart-sans-compagnon). */
  friend: WidgetFriend | null;
  /** Le boss de la semaine : coups qui manquent encore, ou déjà battu. */
  boss: { left: number; won: boolean } | null;
  /** La relance du jour vers l'ami est encore possible et il n'a pas candidaté aujourd'hui. */
  canNudge: boolean;
};

export type WidgetFriend = {
  pseudo: string;
  character: CharacterId;
  color: ColorId;
  displayedForm: Form;
  formName: string;
  mood: Mood;
  level: number;
  today: number;
  streak: number;
  idleWorkdays: number;
  last: { company: string; at: string } | null;
};

export type WidgetExtras = { friend?: WidgetFriend | null; boss?: WidgetState["boss"]; canNudge?: boolean };

/** L'ami vu depuis l'encart : jamais une forme qu'il n'a pas encore vue lui-même. */
export function widgetFriend(view: PlayerView, apps: Application[], seenForm: number | null): WidgetFriend {
  const last = activeApplications(apps)
    .filter((a) => a.userId === view.id)
    .reduce<Application | null>((best, a) => (!best || a.createdAt > best.createdAt ? a : best), null);
  const displayedForm = shownForm(view.displayedForm, view.levelForm, seenForm);
  return {
    pseudo: view.pseudo,
    character: view.character,
    color: view.color,
    displayedForm,
    formName: formName(view.character, displayedForm),
    mood: view.mood,
    level: view.level,
    today: view.today.count,
    streak: view.streak,
    idleWorkdays: view.idleWorkdays,
    last: last ? { company: splitCompany(last.company).name, at: last.createdAt.toISOString() } : null,
  };
}

export function widgetBoss(duel: Pick<Duel, "hp" | "hits" | "bonus" | "won"> | null): WidgetState["boss"] {
  if (!duel) return null;
  return { left: duel.won ? 0 : Math.max(0, duel.hp - duel.hits - duel.bonus), won: duel.won };
}

const RECENT = 5;

/** `seenForm` : dernière scène d'évolution vue ; l'encart n'affiche pas une forme plus haute (la surprise reste pour /). */
export function widgetState(view: PlayerView, apps: Application[], playerId: string, seenForm: number | null = null, companions: WidgetState["companions"] = [], extras: WidgetExtras = {}): WidgetState {
  const mine = activeApplications(apps)
    .filter((a) => a.userId === playerId)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const rankInDay = new Map<string, number>();
  const perDay = new Map<string, number>();
  for (const a of mine) {
    const day = parisDay(a.createdAt);
    const rank = (perDay.get(day) ?? 0) + 1;
    perDay.set(day, rank);
    rankInDay.set(a.id, rank);
  }
  const recent = mine
    .filter((a) => a.source === "job-finder")
    .slice(-RECENT)
    .reverse()
    .map((a) => ({ id: a.id, company: a.company, at: a.createdAt.toISOString(), xp: (rankInDay.get(a.id) ?? 0) > DAILY_XP_CAP ? 0 : XP_PER_APPLICATION }));
  const displayedForm = shownForm(view.displayedForm, view.levelForm, seenForm);
  return {
    pseudo: view.pseudo,
    character: view.character,
    color: view.color,
    displayedForm,
    formName: formName(view.character, displayedForm),
    levelForm: view.levelForm,
    mood: view.mood,
    idleWorkdays: view.idleWorkdays,
    level: view.level,
    xpInLevel: view.xpInLevel,
    xpForNext: view.xpForNext,
    today: view.today.count,
    capReached: view.today.count >= DAILY_XP_CAP,
    streak: view.streak,
    evolutionPending: seenForm !== null && view.levelForm > seenForm,
    companions,
    recent,
    friend: extras.friend ?? null,
    boss: extras.boss ?? null,
    canNudge: extras.canNudge ?? false,
  };
}
