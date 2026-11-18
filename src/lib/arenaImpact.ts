import type { ArenaKind } from "@/game/arena";

// Barème d'impact de l'Arène (maquette docs/maquettes/arene-impact.html) : purement visuel, ne touche ni aux règles
// ni aux chiffres. `at` : instant du contact depuis le début du coup ; `stop` : gel de la scène au contact ;
// `trauma` : force du tremblement (0..1, le décalage suit son carré) ; `sparks` : étincelles à l'impact.

export type Impact = { at: number; stop: number; trauma: number; sparks: number; flash: boolean };

export function impactOf(kind: ArenaKind, { parried, ko }: { parried: boolean; ko: boolean }): Impact | null {
  if (kind === "ATTACK" || kind === "THRUST") {
    const at = kind === "THRUST" ? 315 : 250;
    if (parried) return { at, stop: 50, trauma: 0.2, sparks: 10, flash: false };
    if (ko) return { at, stop: 250, trauma: 0.9, sparks: 18, flash: true };
    return kind === "THRUST" ? { at, stop: 120, trauma: 0.75, sparks: 18, flash: true } : { at, stop: 60, trauma: 0.4, sparks: 8, flash: true };
  }
  if (kind === "WHIRL") return { at: 420, stop: ko ? 250 : 40, trauma: ko ? 0.9 : 0.3, sparks: 6, flash: true };
  if (kind === "POTION") return { at: 250, stop: 0, trauma: 0, sparks: 0, flash: false };
  return null;
}

/** Trauma perdu par seconde réelle : le plus fort tremblement s'éteint en moins d'une seconde. */
export const SHAKE_DECAY = 1.4;

export function decayTrauma(trauma: number, dtSeconds: number): number {
  return Math.max(0, trauma - SHAKE_DECAY * dtSeconds);
}

/** Décalage de la scène : sinus à fréquences sans rapport (jamais un bruit image par image), amplitude = trauma². */
export function shakeOffset(trauma: number, t: number): { x: number; y: number; rotate: number } {
  const s = trauma * trauma;
  if (s === 0) return { x: 0, y: 0, rotate: 0 };
  const p = t * 30;
  return { x: 10 * s * Math.sin(p * 1.7), y: 7 * s * Math.sin(p * 2.3), rotate: 1.2 * s * Math.sin(p * 1.1) };
}
