// Scène du mode libre (spec encart-libre-vivant) : ce qui se calcule sans DOM. Le moteur est dans FreeScene.tsx.
import type { CompanionId } from "@/game/quests";
import { DAILY_XP_CAP } from "@/game/levels";
import { MONSTER_IDS, type MonsterId } from "./monsters";
import type { WidgetFriend, WidgetState } from "./widgetState";

export type Range = readonly [number, number];
/** Un monstre toutes les 2 à 5 minutes (décision d'Adrien, 19/11). */
export const MONSTER_DELAY_S: Range = [120, 300];
/** Le premier monstre arrive vite : la scène ne reste pas vide à l'ouverture. */
export const FIRST_MONSTER_S: Range = [30, 60];
/** Sans compagnon, le héros de l'ami passe toutes les 3 à 6 minutes, le premier 1 à 2 minutes après l'ouverture. */
export const FRIEND_FIRST_S: Range = [60, 120];
export const FRIEND_DELAY_S: Range = [180, 360];
/** Une pensée toutes les 1 min 30 à 3 min, affichée 4 s. */
export const THOUGHT_DELAY_S: Range = [90, 180];
export const THOUGHT_MS = 4_000;
/** « L'ami vient de candidater » : dans les 10 minutes. */
const FRIEND_NEWS_MS = 10 * 60 * 1000;
/** Un compagnon passe toutes les 2 à 4 minutes, le premier un peu après l'ouverture. */
export const VISIT_DELAY_S: Range = [120, 240];
export const FIRST_VISIT_S: Range = [20, 40];
/** Il reste environ une minute. */
export const STAY_S: Range = [50, 70];
export const MONSTER_HP = 3;
export const STRIKE_S = 0.5;

export function between([min, max]: Range, random: () => number = Math.random): number {
  return min + (max - min) * random();
}

type BubbleSource = { level: number; formName: string; streak: number; xpInLevel: number; xpForNext: number; evolutionPending: boolean };

/** Bulle du héros cliqué. Une nouvelle forme pas encore vue n'est jamais nommée. */
export function heroBubble(s: BubbleSource): { strong: string; rest: string } {
  if (s.evolutionPending) return { strong: "NOUVELLE FORME !", rest: "Ouvre Goal Master pour la voir" };
  const xp = `${Math.max(0, s.xpForNext - s.xpInLevel)} XP avant niv. ${s.level + 1}`;
  return { strong: `NIV. ${s.level} · ${s.formName.toUpperCase()}`, rest: s.streak > 0 ? `Série ${s.streak} j · ${xp}` : xp };
}

/** Prochain compagnon de passage : au hasard, pas le même deux fois de suite quand on a le choix. */
export function pickVisitor(ids: readonly CompanionId[], last: CompanionId | null, random: () => number = Math.random): CompanionId | null {
  const pool = ids.length > 1 ? ids.filter((c) => c !== last) : ids;
  return pool.length ? pool[Math.floor(random() * pool.length)] : null;
}

export function nextMonster(last: MonsterId | null, random: () => number = Math.random): MonsterId {
  const pool = MONSTER_IDS.filter((m) => m !== last);
  return pool[Math.floor(random() * pool.length)];
}

/** La bulle reste dans la page : calée vers l'intérieur près des bords. */
export function bubbleAlign(x: number, width: number, margin = 120): "start" | "center" | "end" {
  if (x < margin) return "start";
  if (x > width - margin) return "end";
  return "center";
}

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;

/** Bulle d'arrivée du héros de l'ami : sa journée. */
export function friendHello(f: WidgetFriend): { strong: string; rest: string } {
  const strong = `${f.pseudo.toUpperCase()} · NIV. ${f.level}`;
  if (f.today > 0) return { strong, rest: `${plural(f.today, "candidature")} aujourd'hui` };
  if (f.idleWorkdays >= 2) return { strong, rest: `Rien depuis ${f.idleWorkdays} jours ouvrés…` };
  return { strong, rest: "Pas encore candidaté aujourd'hui" };
}

/** Bulle du héros de l'ami cliqué. */
export function friendBubble(f: WidgetFriend): { strong: string; rest: string } {
  return { strong: `${f.pseudo.toUpperCase()} · NIV. ${f.level} · ${f.formName.toUpperCase()}`, rest: `${f.today} aujourd'hui${f.streak > 0 ? ` · série ${f.streak} j` : ""}` };
}

export type Thought = { key: string; text: string; urgent?: boolean };
type ThoughtSource = Pick<WidgetState, "level" | "xpInLevel" | "xpForNext" | "today" | "capReached" | "streak" | "boss" | "canNudge"> & { friend: WidgetFriend | null };

/** Les pensées vraies à l'instant `now`. `said` : les nouvelles de l'ami déjà dites (une fois chacune). */
export function thoughts(s: ThoughtSource, now: number, said: ReadonlySet<string>): Thought[] {
  const list: Thought[] = [];
  const last = s.friend?.last;
  if (s.friend && last) {
    const key = `app:${last.at}`;
    const age = now - Date.parse(last.at);
    if (age >= 0 && age <= FRIEND_NEWS_MS && !said.has(key)) list.push({ key, text: `${s.friend.pseudo} vient de candidater chez ${last.company} !`, urgent: true });
  }
  if (s.boss?.won) list.push({ key: "boss", text: "Boss à terre ! On a gagné cette semaine" });
  else if (s.boss && s.boss.left > 0) list.push({ key: "boss", text: `Boss vendredi 18 h : encore ${plural(s.boss.left, "coup")}` });
  if (s.streak > 0) list.push({ key: "streak", text: s.today === 0 ? `Encore 1 pour garder la série de ${plural(s.streak, "jour")}` : `Série de ${plural(s.streak, "jour")}. On lâche rien` });
  list.push(s.capReached ? { key: "xp", text: `${DAILY_XP_CAP} aujourd'hui ! Le reste compte, sans XP` } : { key: "xp", text: `Plus que ${Math.max(0, s.xpForNext - s.xpInLevel)} XP avant le niveau ${s.level + 1}` });
  if (s.canNudge && s.friend) list.push({ key: "nudge", text: `Tu peux relancer ${s.friend.pseudo} aujourd'hui` });
  return list;
}

/** L'urgente d'abord ; sinon au hasard, pas la même que la dernière quand on a le choix. */
export function pickThought(list: readonly Thought[], lastKey: string | null, random: () => number = Math.random): Thought | null {
  const urgent = list.find((t) => t.urgent);
  if (urgent) return urgent;
  const pool = list.length > 1 ? list.filter((t) => t.key !== lastKey) : list;
  return pool.length ? pool[Math.floor(random() * pool.length)] : null;
}

export type Visitor = CompanionId | "friend";
export type Gesture = "sit" | "stretch" | "whistle" | "look" | "nap";

/** Geste d'une pause : s'asseoir, s'étirer, siffloter, regarder autour ; la sieste reste rare. */
export function pickGesture(random: () => number = Math.random): Gesture {
  const r = random();
  if (r < 0.3) return "sit";
  if (r < 0.55) return "stretch";
  if (r < 0.8) return "whistle";
  if (r < 0.93) return "look";
  return "nap";
}

/** Un visiteur à la fois : l'ami et les compagnons passent à tour de rôle, les compagnons d'abord. */
export function nextVisitor(ids: readonly CompanionId[], hasFriend: boolean, last: Visitor | null, lastCompanion: CompanionId | null, random: () => number = Math.random): Visitor | null {
  if (hasFriend && (ids.length === 0 || (last !== null && last !== "friend"))) return "friend";
  return pickVisitor(ids, lastCompanion, random);
}

/** Avec des compagnons, leur rythme ; sans, celui de l'ami, plus espacé. */
export function visitDelay(companions: number, first: boolean): Range {
  if (companions > 0) return first ? FIRST_VISIT_S : VISIT_DELAY_S;
  return first ? FRIEND_FIRST_S : FRIEND_DELAY_S;
}
