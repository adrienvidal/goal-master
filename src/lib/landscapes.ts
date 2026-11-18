// Paysages de fond 8 bits : identifiants, noms, et la logique pure du dessin (forme de la toile, moment
// de la journée). Le dessin lui-même vit dans landscapeArt.ts (navigateur seulement).
// Maquette validée : docs/maquettes/fonds-vivants.html ; cadrage : docs/specs/2026-11-18-fonds-vivants-design.md.
export const LANDSCAPES = ["CASTLE", "BAMBOO", "MOUNTAINS", "PLAINS"] as const;
export type LandscapeId = (typeof LANDSCAPES)[number];

export const LANDSCAPE_NAMES: Record<LandscapeId, string> = {
  CASTLE: "Château",
  BAMBOO: "Forêt de bambous",
  MOUNTAINS: "Montagnes",
  PLAINS: "Plaine au donjon",
};

export function isLandscape(value: unknown): value is LandscapeId {
  return typeof value === "string" && (LANDSCAPES as readonly string[]).includes(value);
}

/** Scène de référence : l'écran en montre plus ou moins selon sa forme. */
export const SCENE_W = 320;
export const SCENE_H = 180;

export type Grid = { w: number; h: number; scale: number };

/**
 * Taille de la toile pour un écran : des pixels entiers (jamais un pixel plus large que son voisin),
 * au moins 120 de large et 180 de haut quand l'écran le permet.
 */
export function landscapeGrid(vw: number, vh: number): Grid {
  const scale = Math.max(2, Math.min(Math.floor(vh / SCENE_H), Math.floor(vw / 120)));
  return { w: Math.max(1, Math.ceil(vw / scale)), h: Math.max(1, Math.ceil(vh / scale)), scale };
}

export type Moment = "nuit" | "aube" | "jour" | "crep";

const KEYFRAMES: [number, Moment][] = [
  [0, "nuit"], [5.5, "nuit"], [6.5, "aube"], [7.75, "aube"], [9, "jour"],
  [17.5, "jour"], [19, "crep"], [20.25, "crep"], [21.5, "nuit"], [24, "nuit"],
];

/** Moment de la journée : entre deux moments, les couleurs glissent en quatre paliers (step 0, ¼, ½, ¾). */
export function momentAt(hour: number): { hour: number; from: Moment; to: Moment; step: number; moment: Moment } {
  const h = ((hour % 24) + 24) % 24;
  let i = 0;
  while (i < KEYFRAMES.length - 2 && h >= KEYFRAMES[i + 1][0]) i++;
  const [a, from] = KEYFRAMES[i];
  const [b, to] = KEYFRAMES[i + 1];
  const step = Math.round(((h - a) / (b - a)) * 4) / 4;
  return { hour: h, from, to, step, moment: step < 0.5 ? from : to };
}

/** Heure de Paris en heures décimales (18 h 30 → 18.5), quel que soit le fuseau de l'appareil. */
export function parisHour(date: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return get("hour") + get("minute") / 60;
}

/** Décalage de l'élément principal : nul s'il tient à sa place dans la partie visible, sinon recentré. */
export function heroShift([x0, x1]: readonly [number, number], vx0: number, vx1: number, margin = 6): number {
  if (x0 >= vx0 + margin && x1 <= vx1 - margin) return 0;
  return Math.round((vx0 + vx1) / 2 - (x0 + x1) / 2);
}
