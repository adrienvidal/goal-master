import { describe, expect, test } from "vitest";
import {
  arenaCrowns,
  arenaDeadline,
  arenaPhase,
  arenaState,
  canPlay,
  canProvoke,
  isStunned,
  mustPass,
  openArena,
  startBonus,
  statsFor,
  rollValue,
  rulesFor,
  type ArenaActionRow,
  type ArenaRow,
} from "./arena";

let seq = 0;
const H = 60 * 60 * 1000;
const T0 = new Date("2026-11-17T09:00:00Z"); // mardi 10 h à Paris
const at = (h: number) => new Date(T0.getTime() + h * H);

function arena(over: Partial<ArenaRow> = {}): ArenaRow {
  return {
    id: `r${seq++}`,
    challengerId: "a",
    opponentId: "n",
    status: "ACCEPTED",
    createdAt: at(-1),
    acceptedAt: at(0),
    deadline: arenaDeadline(at(0)),
    challengerForm: 3,
    opponentForm: 3,
    challengerEnergy: null,
    opponentEnergy: null,
    rules: 2,
    ...over,
  };
}
function act(playerId: string, kind: ArenaActionRow["kind"], h: number, value = 0): ArenaActionRow {
  return { id: `x${seq++}`, arenaId: "r", playerId, kind, value, createdAt: at(h) };
}
const v2 = rulesFor(2);
const state = (r: ArenaRow, actions: ArenaActionRow[], nowH: number) => arenaState({ arena: r, actions }, at(nowH));

describe("stats", () => {
  test("grow modestly with the evolution", () => {
    expect(statsFor(1, v2)).toMatchObject({ maxHp: 30, attack: [4, 6], thrust: [12, 12], pierce: false });
    expect(statsFor(3, v2)).toMatchObject({ maxHp: 34, attack: [5, 7], thrust: [14, 14], pierce: false });
    expect(statsFor(6, v2)).toMatchObject({ maxHp: 40, attack: [6, 8], thrust: [16, 16], pierce: true });
    expect(statsFor(2, v2)).toMatchObject({ maxHp: 32, whirl: 8, stun: 1 });
    expect(statsFor(5, v2)).toMatchObject({ maxHp: 38, whirl: 12, stun: 2 });
  });

  test("start bonus: +1 action point for the less evolved hero only", () => {
    expect(startBonus(3, 3, v2)).toBe(0);
    expect(startBonus(2, 3, v2)).toBe(1);
    expect(startBonus(3, 2, v2)).toBe(0);
  });
});

describe("deadline and phases", () => {
  test("ends the Friday 18 h after acceptance, the next one when under 48 h", () => {
    expect(arenaDeadline(new Date("2026-11-17T09:00:00Z")).toISOString()).toBe("2026-11-20T17:00:00.000Z");
    expect(arenaDeadline(new Date("2026-11-19T09:00:00Z")).toISOString()).toBe("2026-11-27T17:00:00.000Z");
  });

  test("pending expires after 24 h without an answer", () => {
    const p = arena({ status: "PENDING", acceptedAt: null, deadline: null, createdAt: at(0) });
    expect(arenaPhase(p, [], at(23))).toBe("pending");
    expect(arenaPhase(p, [], at(25))).toBe("expired");
  });

  test("one open arena, one provocation a day; declined and expired do not count", () => {
    const today = arena({ status: "DECLINED", createdAt: at(0), acceptedAt: null, deadline: null });
    expect(canProvoke("a", [{ arena: today, actions: [] }], at(1))).toEqual({ ok: true });
    const cancelled = arena({ status: "CANCELLED", createdAt: at(0), acceptedAt: null, deadline: null });
    expect(canProvoke("a", [{ arena: cancelled, actions: [] }], at(1))).toEqual({ ok: false, reason: "today" });
    const running = arena();
    expect(canProvoke("n", [{ arena: running, actions: [] }], at(1))).toEqual({ ok: false, reason: "open" });
    expect(openArena([{ arena: running, actions: [] }], at(1))?.arena.id).toBe(running.id);
  });
});

describe("action points and potions", () => {
  test("each turn gives 3 action points; the outsider gets 1 more at the start", () => {
    expect(state(arena(), [], 1).energy).toEqual({ a: 3, n: 0 });
    const s = state(arena({ challengerForm: 4, opponentForm: 2 }), [act("a", "END", 1)], 2);
    expect(s.energy).toEqual({ a: 3, n: 4 });
    expect(s.log.at(-1)).toMatchObject({ kind: "ENERGY", playerId: "n", amount: 3 });
  });

  test("unspent action points carry over, capped at 6", () => {
    const actions = [act("a", "END", 1), act("n", "END", 2), act("a", "END", 3), act("n", "END", 4)];
    expect(state(arena(), actions.slice(0, 2), 2.5).energy.a).toBe(6);
    const s = state(arena(), actions, 5);
    expect(s.energy.a).toBe(6);
    expect(s.log.at(-1)).toMatchObject({ kind: "ENERGY", playerId: "a", amount: 0 });
  });

  test("two potions each at the start, never regained", () => {
    const s = state(arena(), [act("a", "POTION", 1, 6)], 2);
    expect(s.potions).toEqual({ a: 1, n: 2 });
  });

  test("a hero who looks rusty starts like the other one", () => {
    expect(state(arena({ challengerEnergy: 0, opponentEnergy: 0 }), [], 1).energy.a).toBe(3);
  });
});

describe("turns", () => {
  test("the challenger opens; 3 actions end the turn and keep the rest", () => {
    const s = state(arena(), [act("a", "ATTACK", 1, 5), act("a", "ATTACK", 1.1, 6), act("a", "PARRY", 1.2)], 2);
    expect(s.hp.n).toBe(34 - 11);
    expect(s.energy.a).toBe(0);
    expect(s.turn).toMatchObject({ playerId: "n", number: 2, used: 0, max: 3 });
  });

  test("ending the turn early passes the hand", () => {
    const s = state(arena(), [act("a", "ATTACK", 1, 5), act("a", "END", 1.5)], 2);
    expect(s.turn).toMatchObject({ playerId: "n", number: 2 });
    expect(s.energy.a).toBe(2);
  });

  test("a parry halves the next hit, rounded down, then is spent and gives back 1 action point", () => {
    const actions = [act("a", "PARRY", 1), act("a", "END", 1.1), act("n", "ATTACK", 2, 7), act("n", "ATTACK", 2.1, 5)];
    const s = state(arena(), actions, 3);
    expect(s.hp.a).toBe(34 - 3 - 5);
    expect(s.energy.a).toBe(2 + 1);
    expect(s.log.find((l) => l.kind === "REFUND")).toMatchObject({ playerId: "a", amount: 1 });
  });

  test("a parry gives nothing back while no hit lands on it", () => {
    const actions = [act("a", "PARRY", 1), act("a", "END", 1.1), act("n", "POTION", 2, 6), act("n", "END", 2.1)];
    const s = state(arena(), actions, 3);
    expect(s.parry.a).toBe(true);
    expect(s.energy.a).toBe(2 + 3);
  });

  test("the knight's thrust pierces the parry from evolution 5, and the parry gives nothing back", () => {
    const r = arena({ challengerForm: 5, opponentForm: 5 });
    const actions = [act("a", "END", 1), act("n", "PARRY", 2), act("n", "END", 2.1), act("a", "THRUST", 3, 16)];
    const s = state(r, actions, 4);
    expect(s.hp.n).toBe(38 - 16);
    expect(s.energy.n).toBe(2);
  });

  test("the panda's whirl heals up to the maximum and stuns the next turn", () => {
    const actions = [act("a", "ATTACK", 1, 5), act("a", "END", 1.1), act("n", "WHIRL", 2, 10), act("n", "END", 2.1)];
    const s = state(arena(), actions, 3);
    expect(s.hp.n).toBe(34);
    expect(s.turn).toMatchObject({ playerId: "a", max: 2 });
  });

  test("24 h without playing: automatic parry and the hand passes", () => {
    const s = state(arena(), [], 25);
    expect(s.turn).toMatchObject({ playerId: "n", number: 2 });
    expect(s.parry.a).toBe(true);
    expect(s.log.some((l) => l.kind === "TIMEOUT" && l.playerId === "a")).toBe(true);
  });

  test("a started turn left for 24 h ends as it is", () => {
    const s = state(arena(), [act("a", "ATTACK", 1, 5)], 25);
    expect(s.turn).toMatchObject({ playerId: "n" });
    expect(s.parry.a).toBe(false);
  });

  test("a hit stored out of turn keeps its hand (fights started under the old rules)", () => {
    const s = state(arena(), [act("n", "ATTACK", 1, 5)], 2);
    expect(s.hp.a).toBe(29);
    expect(s.turn).toMatchObject({ playerId: "n", used: 1 });
  });

  test("the log carries the hit points after each entry", () => {
    const s = state(arena(), [act("a", "ATTACK", 1, 5)], 2);
    expect(s.log.at(-1)).toMatchObject({ kind: "ATTACK", hp: { a: 34, n: 29 } });
  });
});

describe("end of the fight", () => {
  const ko = () => {
    const a = (h: number) => [act("a", "ATTACK", h, 6), act("a", "ATTACK", h + 0.1, 6), act("a", "ATTACK", h + 0.2, 6)];
    return [...a(1), act("n", "END", 2), act("a", "THRUST", 3, 12)];
  };

  test("knock-out: the hitter wins at once", () => {
    const s = state(arena({ challengerForm: 1, opponentForm: 1 }), ko(), 4);
    expect(s.over).toMatchObject({ winnerId: "a", ko: true, byBotte: true });
    expect(s.turn).toBeNull();
  });

  test("at the deadline, more hit points win; equal is a draw", () => {
    const r = arena();
    const end = (r.deadline!.getTime() - T0.getTime()) / H + 1;
    expect(state(r, [act("a", "ATTACK", 1, 5)], end).over).toMatchObject({ winnerId: "a", ko: false });
    expect(state(r, [], end).over).toMatchObject({ winnerId: null, ko: false });
  });

  test("the winner wears the crown until the end of the next day", () => {
    const input = { arena: arena({ challengerForm: 1, opponentForm: 1 }), actions: ko() };
    expect(arenaCrowns([input], at(4))).toEqual(["a"]);
    expect(arenaCrowns([input], new Date("2026-11-19T22:00:00Z"))).toEqual([]);
  });
});

describe("masterstroke", () => {
  test("a knock-out in the same turn as the panda's whirl counts", () => {
    const first = [act("a", "ATTACK", 1, 6), act("a", "ATTACK", 1.1, 6), act("a", "ATTACK", 1.2, 6), act("n", "END", 2)];
    const last = [act("a", "WHIRL", 3, 8), act("a", "ATTACK", 3.1, 6), act("a", "ATTACK", 3.2, 6)];
    expect(state(arena({ challengerForm: 1, opponentForm: 1 }), [...first, ...last], 4).over).toMatchObject({ winnerId: "a", ko: true, byBotte: true });
  });
});

describe("automatic end of turn", () => {
  test("no action point and no potion left: the turn must pass", () => {
    const first = [act("a", "POTION", 1, 6), act("a", "POTION", 1.1, 6), act("a", "END", 1.2), act("n", "END", 2)];
    const s = state(arena(), [...first, act("a", "THRUST", 3, 14), act("a", "THRUST", 3.1, 14)], 4);
    expect(s.turn).toMatchObject({ playerId: "a", used: 2 });
    expect(mustPass(s, "a")).toBe(true);
    expect(mustPass(state(arena(), [...first, act("a", "THRUST", 3, 14)], 4), "a")).toBe(false);
  });

  test("a botte costs 3 action points", () => {
    const s = state(arena(), [act("a", "ATTACK", 1, 5)], 2);
    expect(canPlay(s, "a", "THRUST")).toEqual({ ok: false, reason: "energy" });
  });

  test("only the player whose turn it is can be forced to pass", () => {
    expect(mustPass(state(arena(), [], 1), "n")).toBe(false);
  });
});

describe("rules v3 (balance)", () => {
  const v3 = (over: Partial<ArenaRow> = {}) => arena({ rules: 3, ...over });

  test("a fight keeps the rules it started with; unknown versions fall back to the current ones", () => {
    expect(rulesFor(2).version).toBe(2);
    expect(rulesFor(3).version).toBe(3);
    expect(rulesFor(99).version).toBe(3);
    expect(state(arena(), [], 1).maxHp.a).toBe(34);
    expect(state(v3(), [], 1).maxHp.a).toBe(51);
  });

  test("the opener plays 2 actions on the first turn, the responder starts with 1 extra action point", () => {
    const s = state(v3(), [act("a", "ATTACK", 1, 5), act("a", "ATTACK", 1.1, 5)], 2);
    expect(s.turn).toMatchObject({ playerId: "n", number: 2, max: 3 });
    expect(s.energy.n).toBe(4);
    expect(state(v3(), [], 1).turn).toMatchObject({ playerId: "a", max: 2 });
  });

  test("the outsider gets 1 action point per 2 evolutions of gap", () => {
    expect(startBonus(3, 4)).toBe(1);
    expect(startBonus(1, 6)).toBe(3);
    expect(startBonus(4, 3)).toBe(0);
  });

  test("a botte costs 2 action points and the thrust damage is rolled", () => {
    expect(canPlay(state(v3(), [], 1), "a", "THRUST")).toEqual({ ok: true });
    expect(rollValue("THRUST", 3, rulesFor(3), () => 0)).toBe(4);
    expect(rollValue("THRUST", 3, rulesFor(3), () => 0.999)).toBe(12);
  });

  test("the whirl hurts as well as it heals, and the damage shows in the log", () => {
    const s = state(v3(), [act("a", "WHIRL", 1, 4)], 2);
    expect(s.hp.n).toBe(51 - 4);
    expect(s.log.find((e) => e.kind === "WHIRL")).toMatchObject({ amount: 4, dealt: 4 });
  });

  test("a parry halves the whirl damage too", () => {
    const actions = [act("a", "END", 1), act("n", "PARRY", 2), act("n", "END", 2.1), act("a", "WHIRL", 3, 4)];
    expect(state(v3(), actions, 4).hp.n).toBe(51 - 2);
  });
});

describe("stunned", () => {
  test("the opener's shorter first turn is not a stun", () => {
    const s = state(arena({ rules: 3 }), [act("a", "ATTACK", 1, 2)], 2);
    expect(s.turn).toMatchObject({ playerId: "a", number: 1, max: 2 });
    expect(isStunned(s, "a")).toBe(false);
  });

  test("a player who lost actions to the whirl is stunned on their turn only", () => {
    const s = state(arena({ rules: 3 }), [act("a", "WHIRL", 1, 4), act("a", "END", 1.1)], 2);
    expect(s.turn).toMatchObject({ playerId: "n", max: 2 });
    expect(isStunned(s, "n")).toBe(true);
    expect(isStunned(s, "a")).toBe(false);
  });
});
