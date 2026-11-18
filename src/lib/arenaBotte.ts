import { tierOf, type ArenaKind } from "@/game/arena";

// Barème des Bottes plein écran (maquette docs/maquettes/arene-botte.html) : purement visuel. Le palier est celui des
// règles (évolution figée du combat) ; tout ce qui grandit avec lui est ici, le composant ne fait que jouer.

export type BotteCut = {
  kind: "THRUST" | "WHIRL";
  tier: 1 | 2 | 3;
  title: string;
  /** Durée totale de la séquence, avant l'impact. */
  ms: number;
  reduced: boolean;
  speedLines: boolean;
  /** Chevalier : fantômes de la ruée, poussée vers l'avant (% de sa largeur), traversée du bandeau, entailles, fissure. */
  ghosts: number;
  lunge: number;
  traverse: boolean;
  slashes: number;
  cracks: boolean;
  /** Panda : tours de vrille, hauteur du saut (% de sa hauteur), lévitation, feuilles. */
  turns: number;
  jump: number;
  float: boolean;
  leaves: number;
};

const MINE_MS = { 1: 1000, 2: 1300, 3: 1600 } as const;
const REPLAY_MS = { 1: 600, 2: 800, 3: 1000 } as const;
export const REDUCED_MS = 700;

export function botteCut(kind: ArenaKind, levelForm: number, { replay, reduced }: { replay: boolean; reduced: boolean }): BotteCut | null {
  if (kind !== "THRUST" && kind !== "WHIRL") return null;
  const tier = tierOf(levelForm);
  return {
    kind,
    tier,
    title: kind === "THRUST" ? "COUP D'ESTOC" : "BAMBOU TOURBILLON",
    ms: reduced ? REDUCED_MS : (replay ? REPLAY_MS : MINE_MS)[tier],
    reduced,
    speedLines: tier >= 2,
    ghosts: tier + 1,
    lunge: { 1: 45, 2: 65, 3: 260 }[tier],
    traverse: tier === 3,
    slashes: tier === 1 ? 1 : 2,
    cracks: tier === 3,
    turns: tier,
    jump: { 1: 28, 2: 40, 3: 55 }[tier],
    float: tier === 3,
    leaves: { 1: 8, 2: 16, 3: 36 }[tier],
  };
}
