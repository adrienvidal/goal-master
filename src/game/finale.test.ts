import { describe, expect, test } from "vitest";
import type { Duel, Fighter } from "./duel";
import { buildFinale, MAX_FINALE_WEEKS } from "./finale";

function fighter(playerId: string, hits: number, need = 8): Fighter {
  return { playerId, need, hits, support: 0, bonus: 2 };
}
function duel(id: string, a: number | null, n: number | null, boss: 0 | 1 | 2 | 3 = 0): Duel {
  const fighters = [a === null ? null : fighter("me", a), n === null ? null : fighter("nico", n)].filter((f): f is Fighter => f !== null);
  const hp = fighters.reduce((s, f) => s + f.need, 0);
  const hits = fighters.reduce((s, f) => s + f.hits, 0);
  const bonus = fighters.reduce((s, f) => s + f.bonus, 0);
  return { id, boss, start: new Date(0), at: new Date(0), hp, hits, bonus, fighters, won: hits + bonus >= hp, resolved: true };
}

describe("buildFinale", () => {
  test("one week per duel I fought, oldest first, with the boss of the last one", () => {
    const f = buildFinale([duel("2026-11-27", 6, 4, 1), duel("2026-11-20", 9, 2, 0)], "me", "nico", "won")!;
    expect(f.weeks.map((w) => [w.a, w.n, w.hp])).toEqual([[9, 2, 16], [6, 4, 16]]);
    expect(f.boss).toBe(1);
    expect(f.totalHp).toBe(32);
  });

  test("duels where I did not fight are left out", () => {
    const f = buildFinale([duel("2026-11-20", null, 5), duel("2026-11-27", 3, 5)], "me", "nico", "expired")!;
    expect(f.weeks).toHaveLength(1);
  });

  test("no week: no finale", () => {
    expect(buildFinale([duel("2026-11-20", null, 5)], "me", "nico", "won")).toBeNull();
  });

  test("a week never takes more than its boss's hit points", () => {
    const f = buildFinale([duel("2026-11-20", 15, 14), duel("2026-11-27", 2, 1)], "me", "nico", "expired")!;
    expect(f.weeks[0].dealt).toBe(16);
    expect(f.dealt).toBe(16 + 3);
  });

  test("between 40 and 60 % each: the ultimate strike is shared", () => {
    expect(buildFinale([duel("2026-11-20", 50, 50)], "me", "nico", "won")!.finisher).toBe("both");
    expect(buildFinale([duel("2026-11-20", 40, 60)], "me", "nico", "won")!.finisher).toBe("both");
    expect(buildFinale([duel("2026-11-20", 61, 39)], "me", "nico", "won")!.finisher).toBe("me");
    expect(buildFinale([duel("2026-11-20", 39, 61)], "me", "nico", "won")!.finisher).toBe("partner");
  });

  test("a partner who never struck does not appear", () => {
    const f = buildFinale([duel("2026-11-20", 8, null), duel("2026-11-27", 7, 0)], "me", "nico", "won")!;
    expect(f.duo).toBe(false);
    expect(f.finisher).toBe("me");
    expect(f.weeks.every((w) => w.n === 0)).toBe(true);
  });

  test("no partner at all", () => {
    expect(buildFinale([duel("2026-11-20", 8, null)], "me", null, "expired")!.duo).toBe(false);
  });

  test("long quests are grouped into at most 12 attacks, sums kept", () => {
    const days = Array.from({ length: 20 }, (_, i) => new Date(Date.UTC(2026, 10, 20 + 7 * i)).toISOString().slice(0, 10));
    const f = buildFinale(days.map((d, i) => duel(d, i + 1, 2)), "me", "nico", "expired")!;
    expect(f.weeks.length).toBeLessThanOrEqual(MAX_FINALE_WEEKS);
    expect(f.mine).toBe(210);
    expect(f.theirs).toBe(40);
    expect(f.totalHp).toBe(20 * 16);
  });

  test("a grouped week is won when its strikes and bonuses cover its hit points", () => {
    const days = Array.from({ length: 13 }, (_, i) => new Date(Date.UTC(2026, 10, 20 + 7 * i)).toISOString().slice(0, 10));
    const f = buildFinale(days.map((d) => duel(d, 6, 6)), "me", "nico", "won")!;
    expect(f.weeks.length).toBeLessThanOrEqual(MAX_FINALE_WEEKS);
    expect(f.weeks.every((w) => w.won)).toBe(true);
  });
});
