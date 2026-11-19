// Scène du mode libre (spec encart-libre-vivant) : ce qui se calcule sans DOM. Le moteur est dans FreeScene.tsx.
import type { CompanionId } from "@/game/quests";
import { MONSTER_IDS, type MonsterId } from "./monsters";

type Range = readonly [number, number];
/** Un monstre toutes les 2 à 5 minutes (décision d'Adrien, 19/11). */
export const MONSTER_DELAY_S: Range = [120, 300];
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
