import { describe, expect, test } from "vitest";
import { between, bubbleAlign, FIRST_VISIT_S, heroBubble, MONSTER_DELAY_S, nextMonster, pickVisitor, VISIT_DELAY_S } from "./freeScene";

describe("délais de la scène libre", () => {
  test("tirés entre les bornes", () => {
    expect(between(MONSTER_DELAY_S, () => 0)).toBe(120);
    expect(between(MONSTER_DELAY_S, () => 0.999999)).toBeCloseTo(300, 2);
    expect(between(VISIT_DELAY_S, () => 0.5)).toBe(180);
    expect(between(FIRST_VISIT_S, () => 0)).toBe(20);
  });
});

describe("heroBubble", () => {
  const s = { level: 8, formName: "Écuyer", streak: 12, xpInLevel: 40, xpForNext: 100, evolutionPending: false };
  test("niveau, forme, série et XP avant le niveau suivant", () => {
    expect(heroBubble(s)).toEqual({ strong: "NIV. 8 · ÉCUYER", rest: "Série 12 j · 60 XP avant niv. 9" });
  });
  test("sans série, seulement l'XP", () => {
    expect(heroBubble({ ...s, streak: 0 }).rest).toBe("60 XP avant niv. 9");
  });
  test("nouvelle forme en attente : jamais son nom", () => {
    expect(heroBubble({ ...s, evolutionPending: true })).toEqual({ strong: "NOUVELLE FORME !", rest: "Ouvre Goal Master pour la voir" });
  });
});

describe("pickVisitor", () => {
  test("aucun compagnon : personne", () => {
    expect(pickVisitor([], null, () => 0)).toBeNull();
  });
  test("un seul : toujours lui, même s'il vient de passer", () => {
    expect(pickVisitor(["cat"], "cat", () => 0.9)).toBe("cat");
  });
  test("plusieurs : jamais deux fois de suite le même", () => {
    expect(pickVisitor(["cat", "fox"], "cat", () => 0)).toBe("fox");
    expect(pickVisitor(["cat", "fox", "owl"], "fox", () => 0.99)).toBe("owl");
  });
});

describe("nextMonster", () => {
  test("jamais deux fois de suite le même", () => {
    expect(nextMonster("slime", () => 0)).toBe("bat");
    expect(nextMonster(null, () => 0)).toBe("slime");
  });
});

describe("bubbleAlign", () => {
  test("calée vers l'intérieur près des bords", () => {
    expect(bubbleAlign(40, 1200)).toBe("start");
    expect(bubbleAlign(600, 1200)).toBe("center");
    expect(bubbleAlign(1150, 1200)).toBe("end");
  });
});
