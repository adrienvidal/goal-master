// Boss final de l'écran de fin d'objectif (cadrage docs/specs/2026-11-19-boss-finale-design.md).
// Rien n'est stocké : la quête se relit dans les duels du vendredi.
import type { BossIndex, Duel } from "./duel";

/** Au-delà, les semaines consécutives se regroupent : l'animation ne s'allonge pas. */
export const MAX_FINALE_WEEKS = 12;
/** Part des coups en dessous de laquelle le coup ultime revient à l'autre ; entre les deux, il est partagé. */
const SHARED_FROM = 0.4;

export type FinaleWeek = { a: number; n: number; hp: number; dealt: number; won: boolean };
export type Finisher = "me" | "partner" | "both";
export type Finale = {
  weeks: FinaleWeek[];
  boss: BossIndex;
  /** Le binôme apparaît seulement s'il a porté au moins un coup. */
  duo: boolean;
  mine: number;
  theirs: number;
  totalHp: number;
  dealt: number;
  finisher: Finisher;
  outcome: "won" | "expired";
};

type Raw = { a: number; n: number; hp: number; cover: number };

function group(raw: Raw[]): Raw[] {
  if (raw.length <= MAX_FINALE_WEEKS) return raw;
  const size = Math.ceil(raw.length / MAX_FINALE_WEEKS);
  const out: Raw[] = [];
  for (let i = 0; i < raw.length; i += size) {
    out.push(raw.slice(i, i + size).reduce((s, w) => ({ a: s.a + w.a, n: s.n + w.n, hp: s.hp + w.hp, cover: s.cover + w.cover }), { a: 0, n: 0, hp: 0, cover: 0 }));
  }
  return out;
}

export function buildFinale(duels: Duel[], meId: string, partnerId: string | null, outcome: "won" | "expired"): Finale | null {
  const mineDuels = duels.filter((d) => d.fighters.some((f) => f.playerId === meId)).sort((x, y) => (x.id < y.id ? -1 : 1));
  if (mineDuels.length === 0) return null;
  const raw = mineDuels.map((d) => {
    const a = d.fighters.find((f) => f.playerId === meId)?.hits ?? 0;
    const n = partnerId ? (d.fighters.find((f) => f.playerId === partnerId)?.hits ?? 0) : 0;
    return { a, n, hp: d.hp, cover: d.hits + d.bonus };
  });
  const weeks = group(raw).map((w) => ({ a: w.a, n: w.n, hp: w.hp, dealt: Math.min(w.hp, w.a + w.n), won: w.cover >= w.hp }));
  const mine = weeks.reduce((s, w) => s + w.a, 0);
  const theirs = weeks.reduce((s, w) => s + w.n, 0);
  const duo = theirs > 0;
  const share = mine + theirs === 0 ? 1 : mine / (mine + theirs);
  const finisher: Finisher = !duo ? "me" : share >= SHARED_FROM && share <= 1 - SHARED_FROM ? "both" : share > 1 - SHARED_FROM ? "me" : "partner";
  return {
    weeks,
    boss: mineDuels[mineDuels.length - 1].boss,
    duo,
    mine,
    theirs,
    totalHp: weeks.reduce((s, w) => s + w.hp, 0),
    dealt: weeks.reduce((s, w) => s + w.dealt, 0),
    finisher,
    outcome,
  };
}
