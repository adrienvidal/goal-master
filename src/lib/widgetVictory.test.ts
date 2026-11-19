import { describe, expect, test } from "vitest";
import { victoryFor } from "./widgetVictory";
import type { WidgetState } from "./widgetState";

const base: WidgetState = {
  pseudo: "Adrien", character: "KNIGHT", color: "BLUE", displayedForm: 2, levelForm: 2, mood: "normal", idleWorkdays: 0,
  level: 7, xpInLevel: 62, xpForNext: 100, today: 2, capReached: false, streak: 4, recent: [{ id: "a1", company: "Alan", at: "2026-11-19T09:00:00Z", xp: 10 }],
};
const withNew = (extra: Partial<WidgetState> = {}, xp = 10): WidgetState => ({
  ...base, ...extra, recent: [{ id: "a2", company: "Doctolib", at: "2026-11-19T10:00:00Z", xp }, ...base.recent],
});

describe("victoryFor", () => {
  test("premier affichage : pas de victoire", () => expect(victoryFor(null, withNew())).toBeNull());
  test("rien de nouveau : pas de victoire", () => expect(victoryFor(base, base)).toBeNull());
  test("nouvelle candidature : son entreprise et son XP", () => {
    expect(victoryFor(base, withNew())).toEqual({ company: "Doctolib", xp: 10, levelUp: false, newForm: false, derust: false });
  });
  test("au plafond : victoire à 0 XP", () => expect(victoryFor(base, withNew({}, 0))?.xp).toBe(0));
  test("passage de niveau", () => expect(victoryFor(base, withNew({ level: 8 }))?.levelUp).toBe(true));
  test("nouvelle forme", () => expect(victoryFor(base, withNew({ level: 8, levelForm: 3 }))?.newForm).toBe(true));
  test("la rouille part", () => {
    expect(victoryFor({ ...base, idleWorkdays: 3, mood: "tired" }, withNew())?.derust).toBe(true);
  });
});
