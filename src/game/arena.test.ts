import { describe, expect, test } from "vitest";
import {
  arenaCrowns,
  arenaDeadline,
  arenaPhase,
  arenaState,
  canProvoke,
  openArena,
  startEnergy,
  statsFor,
  type ArenaActionRow,
  type ArenaRow,
} from "./arena";
import type { Application, Nudge } from "./xp";

let seq = 0;
const H = 60 * 60 * 1000;
const T0 = new Date("2026-11-17T09:00:00Z"); // mardi 10 h à Paris
const at = (h: number) => new Date(T0.getTime() + h * H);

function app(userId: string, h: number, cancelledH: number | null = null): Application {
  return { id: `a${seq++}`, userId, company: "Acme", createdAt: at(h), cancelledAt: cancelledH === null ? null : at(cancelledH) };
}
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
    challengerEnergy: 2,
    opponentEnergy: 2,
    ...over,
  };
}
function act(playerId: string, kind: ArenaActionRow["kind"], h: number, value = 0): ArenaActionRow {
  return { id: `x${seq++}`, arenaId: "r", playerId, kind, value, createdAt: at(h) };
}
const state = (r: ArenaRow, actions: ArenaActionRow[], nowH: number, apps: Application[] = [], nudges: Nudge[] = []) =>
  arenaState({ arena: r, actions, apps, nudges }, at(nowH));

describe("stats", () => {
  test("grow modestly with the evolution", () => {
    expect(statsFor(1)).toMatchObject({ maxHp: 30, attack: [4, 6], thrust: 12, pierce: false });
    expect(statsFor(3)).toMatchObject({ maxHp: 34, attack: [5, 7], thrust: 14, pierce: false });
    expect(statsFor(6)).toMatchObject({ maxHp: 40, attack: [6, 8], thrust: 16, pierce: true });
    expect(statsFor(2)).toMatchObject({ maxHp: 32, whirl: 8, stun: 1 });
    expect(statsFor(5)).toMatchObject({ maxHp: 38, whirl: 12, stun: 2 });
  });

  test("start energy: 2, +1 for the outsider, 0 when rusty", () => {
    expect(startEnergy(3, 3, false)).toBe(2);
    expect(startEnergy(2, 3, false)).toBe(3);
    expect(startEnergy(3, 2, false)).toBe(2);
    expect(startEnergy(2, 3, true)).toBe(0);
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

describe("energy and potions", () => {
  test("each active application after acceptance gives 1, capped at 6; a cancelled one gives nothing", () => {
    const r = arena();
    const apps = [app("a", -2), app("a", 1), app("a", 2, 3), ...[4, 5, 6, 7, 8, 9].map((h) => app("a", h / 10 + 4))];
    expect(state(r, [], 10, apps).energy.a).toBe(6);
    expect(state(r, [], 1.5, apps).energy.a).toBe(3);
  });

  test("a successful nudge during the fight gives each fighter a potion, 2 at most", () => {
    const r = arena();
    const nudges = [1, 2, 3].map((h) => ({ id: `n${h}`, senderId: "a", recipientId: "n", sentAt: at(h) }));
    const apps = [app("n", 1.5), app("n", 2.5), app("n", 3.5)];
    expect(state(r, [], 5, apps, nudges).potions).toEqual({ a: 2, n: 2 });
  });
});

describe("turns", () => {
  test("the challenger opens; 3 actions end the turn", () => {
    const r = arena();
    const apps = [app("a", 0.5)];
    const s = state(r, [act("a", "ATTACK", 1, 5), act("a", "ATTACK", 1.1, 6), act("a", "PARRY", 1.2)], 2, apps);
    expect(s.hp.n).toBe(34 - 11);
    expect(s.energy.a).toBe(0);
    expect(s.turn).toMatchObject({ playerId: "n", number: 2, used: 0, max: 3 });
  });

  test("ending the turn early passes the hand", () => {
    const s = state(arena(), [act("a", "ATTACK", 1, 5), act("a", "END", 1.5)], 2);
    expect(s.turn).toMatchObject({ playerId: "n", number: 2 });
  });

  test("a parry halves the next hit, rounded down, then is spent", () => {
    const r = arena();
    const actions = [act("a", "PARRY", 1), act("a", "END", 1.1), act("n", "ATTACK", 2, 7), act("n", "ATTACK", 2.1, 5)];
    expect(state(r, actions, 3).hp.a).toBe(34 - 3 - 5);
  });

  test("the knight's thrust pierces the parry from evolution 5", () => {
    const r = arena({ challengerForm: 5, opponentForm: 5, challengerEnergy: 3 });
    const actions = [act("a", "END", 1), act("n", "PARRY", 2), act("n", "END", 2.1), act("a", "THRUST", 3, 16)];
    expect(state(r, actions, 4).hp.n).toBe(38 - 16);
  });

  test("the panda's whirl heals up to the maximum and stuns the next turn", () => {
    const r = arena({ challengerEnergy: 3, opponentEnergy: 3 });
    const actions = [act("a", "ATTACK", 1, 5), act("a", "END", 1.1), act("n", "WHIRL", 2, 10)];
    const s = state(r, actions, 3);
    expect(s.hp.n).toBe(34);
    expect(s.turn).toMatchObject({ playerId: "n" });
    const s2 = state(r, [...actions, act("n", "END", 2.1)], 3);
    expect(s2.turn).toMatchObject({ playerId: "a", max: 2 });
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

  test("a potion heals 6 without energy", () => {
    const r = arena({ challengerEnergy: 0 });
    const nudges = [{ id: "z", senderId: "n", recipientId: "a", sentAt: at(0.2) }];
    const actions = [act("a", "END", 1), act("n", "ATTACK", 2, 7), act("n", "END", 2.1), act("a", "POTION", 3, 6)];
    const s = state(r, actions, 4, [app("a", 0.5)], nudges);
    expect(s.hp.a).toBe(34 - 7 + 6);
    expect(s.potions.a).toBe(0);
  });
});

describe("end of the fight", () => {
  test("knock-out: the hitter wins at once", () => {
    const r = arena({ challengerForm: 1, opponentForm: 1, challengerEnergy: 6 });
    const hits = [act("a", "ATTACK", 1, 6), act("a", "ATTACK", 1.1, 6), act("a", "ATTACK", 1.2, 6)];
    const later = [act("n", "END", 2), act("a", "THRUST", 3, 12)];
    const s = state(r, [...hits, ...later], 4, [app("a", 0.5), app("a", 0.6), app("a", 0.7), app("a", 0.8)]);
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
    const r = arena({ challengerForm: 1, opponentForm: 1, challengerEnergy: 6, opponentEnergy: 2 });
    const a = [app("a", 0.1), app("a", 0.2), app("a", 0.3)];
    const actions = [act("a", "ATTACK", 1, 6), act("a", "ATTACK", 1.1, 6), act("a", "ATTACK", 1.2, 6), act("n", "END", 2), act("a", "ATTACK", 3, 6), act("a", "ATTACK", 3.1, 6), act("a", "ATTACK", 3.2, 6)];
    const input = { arena: r, actions, apps: a, nudges: [] };
    expect(arenaCrowns([input], at(4))).toEqual(["a"]);
    expect(arenaCrowns([input], new Date("2026-11-19T22:00:00Z"))).toEqual([]);
  });
});

describe("masterstroke", () => {
  test("a knock-out in the same turn as the panda's whirl counts", () => {
    const r = arena({ challengerForm: 1, opponentForm: 1, challengerEnergy: 6 });
    const apps = [app("a", 0.1), app("a", 0.2), app("a", 0.3), app("a", 0.4)];
    const first = [act("a", "ATTACK", 1, 6), act("a", "ATTACK", 1.1, 6), act("a", "ATTACK", 1.2, 6), act("n", "END", 2)];
    const last = [act("a", "WHIRL", 3, 8), act("a", "ATTACK", 3.1, 6), act("a", "ATTACK", 3.2, 6)];
    expect(state(r, [...first, ...last], 4, apps).over).toMatchObject({ winnerId: "a", ko: true, byBotte: true });
  });
});
