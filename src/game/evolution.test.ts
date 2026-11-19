import { describe, expect, test } from "vitest";
import { nextSeenForm, sceneDue, shownForm } from "./evolution";

describe("sceneDue", () => {
  test("forme affichée au-delà de la forme vue : scène", () => expect(sceneDue(3, 2)).toBe(true));
  test("déjà vue : pas de scène", () => expect(sceneDue(3, 3)).toBe(false));
  test("joueur d'avant la forme vue (null) : pas de scène", () => expect(sceneDue(3, null)).toBe(false));
  test("rouillé sous la forme vue : pas de scène", () => expect(sceneDue(2, 3)).toBe(false));
});

describe("shownForm (encart)", () => {
  test("plafonnée à la forme vue, pour garder la surprise", () => expect(shownForm(3, 3, 2)).toBe(2));
  test("la rouille peut descendre plus bas", () => expect(shownForm(1, 3, 2)).toBe(1));
  test("sans forme vue : la forme affichée", () => expect(shownForm(3, 3, null)).toBe(3));
});

describe("nextSeenForm", () => {
  test("monte jusqu'à la forme du niveau", () => expect(nextSeenForm(2, 3)).toBe(3));
  test("ne redescend jamais", () => expect(nextSeenForm(4, 3)).toBe(4));
  test("première fois", () => expect(nextSeenForm(null, 2)).toBe(2));
});
