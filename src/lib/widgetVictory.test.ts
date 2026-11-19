import { describe, expect, test } from "vitest";
import { victoryFor, victoryLine, victoryPop, type Victory } from "./widgetVictory";
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

describe("victoryLine (mode normal, une ligne)", () => {
  const v = (extra: Partial<Victory> = {}): Victory => ({ company: "Doctolib", xp: 10, levelUp: false, newForm: false, derust: false, ...extra });
  const s = { ...base, level: 9 };
  test("candidature", () => expect(victoryLine(v(), s)).toEqual({ strong: "Doctolib", rest: " compte", gold: false }));
  test("niveau gagné", () => expect(victoryLine(v({ levelUp: true }), s).rest).toBe(" compte · niveau 9"));
  test("plafond", () => expect(victoryLine(v({ xp: 0 }), s).rest).toBe(" · plafond, sans XP"));
  test("rouille partie", () => expect(victoryLine(v({ derust: true }), s).rest).toBe(" · la rouille part"));
  test("nouvelle forme : annoncée, jamais nommée", () => {
    expect(victoryLine(v({ levelUp: true, newForm: true }), s)).toEqual({ strong: "NOUVELLE FORME !", rest: " Va la voir", gold: true });
  });
});

describe("victoryPop", () => {
  const v = (extra: Partial<Victory> = {}): Victory => ({ company: "Doctolib", xp: 10, levelUp: false, newForm: false, derust: false, ...extra });
  const s = { ...base, level: 8 };
  test("XP gagnée", () => expect(victoryPop(v(), s, "small")).toBe("+10 XP"));
  test("plafond", () => expect(victoryPop(v({ xp: 0 }), s, "normal")).toBe("+0 XP"));
  test("niveau", () => expect(victoryPop(v({ levelUp: true }), s, "free")).toBe("NIV. 8 !"));
  test("nouvelle forme selon le mode", () => {
    const evo = v({ levelUp: true, newForm: true });
    expect([victoryPop(evo, s, "normal"), victoryPop(evo, s, "small"), victoryPop(evo, s, "free")]).toEqual(["NIV. 8 !", "ÉVOLUE !", "NOUVELLE FORME !"]);
  });
});
