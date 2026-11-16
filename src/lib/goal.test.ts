import { describe, expect, it } from "vitest";
import { extendedDeadline, goalOutcome, validateNewGoal } from "./goal";

describe("goalOutcome", () => {
  it("victoire dès la cible atteinte, même après la date", () => {
    expect(goalOutcome(100, 100, "2026-11-10", "2026-11-16")).toBe("won");
  });
  it("temps écoulé le lendemain de la date limite seulement", () => {
    expect(goalOutcome(87, 100, "2026-11-16", "2026-11-16")).toBe("active");
    expect(goalOutcome(87, 100, "2026-11-16", "2026-11-17")).toBe("expired");
  });
});

describe("validateNewGoal", () => {
  it("accepte un objectif valide et refuse une date passée", () => {
    expect(validateNewGoal({ target: "50", deadline: "2027-01-31", character: "PANDA" }, "2026-11-16").ok).toBe(true);
    expect(validateNewGoal({ target: "50", deadline: "2026-11-16", character: "PANDA" }, "2026-11-16").ok).toBe(false);
    expect(validateNewGoal({ target: "0", deadline: "2027-01-31", character: "KNIGHT" }, "2026-11-16").ok).toBe(false);
  });
});

it("prolonge de 4 semaines", () => {
  expect(extendedDeadline("2026-11-16")).toBe("2026-12-14");
});
