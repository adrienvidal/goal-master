// Équilibrage de l'Arène (règles actuelles) : des centaines de combats joués par le vrai moteur,
// avec un joueur raisonnable de chaque côté. Échoue dès qu'une cible convenue avec Adrien (18/11) n'est plus tenue.
import { describe, expect, test } from "vitest";
import { arenaDeadline, arenaState, canPlay, CURRENT_RULES, rollValue, statsFor, type ArenaActionRow, type ArenaKind, type ArenaRow } from "./arena";

type Hero = { form: number; character: "KNIGHT" | "PANDA"; botte: boolean };
const knight = (form: number, botte = true): Hero => ({ form, character: "KNIGHT", botte });
const panda = (form: number): Hero => ({ form, character: "PANDA", botte: true });

/** Générateur pseudo-aléatoire déterministe (mulberry32) : les mêmes combats à chaque lancement. */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const T0 = new Date("2026-11-23T08:00:00Z"); // lundi
const MIN = 60 * 1000;

/** Un joueur raisonnable : potion quand il est bas, Botte dès qu'il peut (s'il la joue), sinon attaque. */
function choose(hero: Hero, s: ReturnType<typeof arenaState>, me: string): ArenaKind {
  const ok = (k: ArenaKind) => canPlay(s, me, k).ok;
  const special: ArenaKind = hero.character === "PANDA" ? "WHIRL" : "THRUST";
  if (s.hp[me] <= s.maxHp[me] * 0.4 && ok("POTION")) return "POTION";
  if (hero.botte && ok(special)) return special;
  if (ok("ATTACK")) return "ATTACK";
  return "END";
}

/** Joue un combat jusqu'au bout ; le premier héros ouvre (il a lancé la provocation). */
function fight(opener: Hero, responder: Hero, random: () => number): { winner: 0 | 1 | null; turns: number } {
  const arena: ArenaRow = {
    id: "sim",
    challengerId: "p0",
    opponentId: "p1",
    status: "ACCEPTED",
    createdAt: T0,
    acceptedAt: T0,
    deadline: arenaDeadline(T0),
    challengerForm: opener.form,
    opponentForm: responder.form,
    challengerEnergy: null,
    opponentEnergy: null,
    rules: CURRENT_RULES.version,
  };
  const heroes: Record<string, Hero> = { p0: opener, p1: responder };
  const actions: ArenaActionRow[] = [];
  for (let i = 1; i < 400; i++) {
    const now = new Date(T0.getTime() + i * MIN);
    const s = arenaState({ arena, actions }, now);
    if (s.over) return { winner: s.over.winnerId === "p0" ? 0 : s.over.winnerId === "p1" ? 1 : null, turns: s.turn?.number ?? 0 };
    const me = s.turn!.playerId;
    const kind = choose(heroes[me], s, me);
    const value = rollValue(kind, heroes[me].form, CURRENT_RULES, random);
    actions.push({ id: `a${i}`, arenaId: "sim", playerId: me, kind, value, createdAt: now });
    const after = arenaState({ arena, actions }, new Date(now.getTime() + 1));
    if (after.over) return { winner: after.over.winnerId === "p0" ? 0 : after.over.winnerId === "p1" ? 1 : null, turns: s.turn!.number };
  }
  throw new Error("combat sans fin");
}

const N = 400;
/** Part de victoires de `a` quand il ouvre. */
function opening(a: Hero, b: Hero, seed: number) {
  const random = seeded(seed);
  let wins = 0;
  let turns = 0;
  for (let i = 0; i < N; i++) {
    const r = fight(a, b, random);
    if (r.winner === 0) wins++;
    turns += r.turns;
  }
  return { rate: wins / N, turns: turns / N };
}
/** Part de victoires de `a`, moitié en ouvrant, moitié en répondant. */
function both(a: Hero, b: Hero, seed: number) {
  const first = opening(a, b, seed);
  const second = opening(b, a, seed + 1);
  return { rate: (first.rate + 1 - second.rate) / 2, turns: (first.turns + second.turns) / 2 };
}

describe("arena balance (current rules)", () => {
  test("stats barely grow with the evolution: style over strength", () => {
    expect(statsFor(1)).toMatchObject({ maxHp: 49, attack: [2, 8], thrust: [3, 11], pierce: false, stun: 1 });
    expect(statsFor(6)).toMatchObject({ maxHp: 54, attack: [2, 8], thrust: [5, 13], pierce: true, stun: 1 });
  });

  test("the opener does not win by default (50-60 %)", () => {
    const { rate } = opening(knight(3), knight(3), 1);
    expect(rate).toBeGreaterThanOrEqual(0.5);
    expect(rate).toBeLessThanOrEqual(0.6);
  });

  test("a fight lasts 8 to 10 turns", () => {
    const { turns } = both(knight(3), knight(3), 2);
    expect(turns).toBeGreaterThanOrEqual(8);
    expect(turns).toBeLessThanOrEqual(10);
  });

  test.each([
    [2, 3],
    [4, 5],
  ])("one evolution ahead (%i vs %i) wins 55-65 %", (low, high) => {
    const { rate } = both(knight(high), knight(low), 3);
    expect(rate).toBeGreaterThanOrEqual(0.55);
    expect(rate).toBeLessThanOrEqual(0.65);
  });

  test("the widest gap (1 vs 6) wins 75 % at most", () => {
    const { rate } = both(knight(6), knight(1), 4);
    expect(rate).toBeGreaterThanOrEqual(0.5);
    expect(rate).toBeLessThanOrEqual(0.75);
  });

  test("Panda and Knight are even (45-55 %)", () => {
    const { rate } = both(panda(3), knight(3), 5);
    expect(rate).toBeGreaterThanOrEqual(0.45);
    expect(rate).toBeLessThanOrEqual(0.55);
  });

  test("playing the Botte pays as much as plain attacks (45-65 %)", () => {
    const { rate } = both(knight(3, true), knight(3, false), 6);
    expect(rate).toBeGreaterThanOrEqual(0.45);
    expect(rate).toBeLessThanOrEqual(0.65);
  });
});
