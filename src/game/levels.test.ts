import { describe, expect, test } from "vitest";
import { formForLevel, levelFromXp, xpToNextLevel } from "./levels";

describe("levels", () => {
  test("cost of a level", () => {
    expect(xpToNextLevel(1)).toBe(22);
    expect(xpToNextLevel(13)).toBe(46);
  });

  test("level from XP", () => {
    expect(levelFromXp(0)).toEqual({ level: 1, xpInLevel: 0, xpForNext: 22 });
    expect(levelFromXp(22)).toEqual({ level: 2, xpInLevel: 0, xpForNext: 24 });
    expect(levelFromXp(420)).toEqual({ level: 13, xpInLevel: 24, xpForNext: 46 });
    expect(levelFromXp(310).level).toBe(11);
  });

  test("form thresholds", () => {
    expect([1, 3, 4, 8, 12, 16, 20, 35].map(formForLevel)).toEqual([1, 1, 2, 3, 4, 5, 6, 6]);
  });
});
