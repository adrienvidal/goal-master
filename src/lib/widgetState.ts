import type { Mood } from "@/game/avatar";
import { parisDay } from "@/game/calendar";
import { shownForm } from "@/game/evolution";
import { DAILY_XP_CAP, XP_PER_APPLICATION, type Form } from "@/game/levels";
import { activeApplications, type Application } from "@/game/xp";
import type { CharacterId, ColorId } from "./onboarding";
import type { PlayerView } from "./playerView";

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
  /** Les dernières candidatures arrivées par job-finder, la plus récente d'abord, avec l'XP qu'elles ont rapportée. */
  recent: { id: string; company: string; at: string; xp: number }[];
};

const RECENT = 5;

/** `seenForm` : dernière scène d'évolution vue ; l'encart n'affiche pas une forme plus haute (la surprise reste pour /). */
export function widgetState(view: PlayerView, apps: Application[], playerId: string, seenForm: number | null = null): WidgetState {
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
  return {
    pseudo: view.pseudo,
    character: view.character,
    color: view.color,
    displayedForm: shownForm(view.displayedForm, view.levelForm, seenForm),
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
    recent,
  };
}
