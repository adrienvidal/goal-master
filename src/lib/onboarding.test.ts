import { expect, test } from "vitest";
import { defaultDeadline, validateOnboarding } from "./onboarding";

const ok = { pseudo: " Adrien ", character: "KNIGHT", color: "BLUE", target: "100", deadline: "2027-01-31" };
const today = "2026-11-16";

test("valid input is normalised", () => {
  expect(validateOnboarding(ok, today, [])).toEqual({
    ok: true,
    value: { pseudo: "Adrien", character: "KNIGHT", color: "BLUE", target: 100, deadline: "2027-01-31" },
  });
});

test("rejects bad input", () => {
  expect(validateOnboarding({ ...ok, pseudo: "  " }, today, []).ok).toBe(false);
  expect(validateOnboarding({ ...ok, pseudo: "x".repeat(21) }, today, []).ok).toBe(false);
  expect(validateOnboarding({ ...ok, character: "NINJA" }, today, []).ok).toBe(false);
  expect(validateOnboarding({ ...ok, target: "0" }, today, []).ok).toBe(false);
  expect(validateOnboarding({ ...ok, target: "12.5" }, today, []).ok).toBe(false);
  expect(validateOnboarding({ ...ok, deadline: today }, today, []).ok).toBe(false);
});

test("colour already taken by the partner", () => {
  expect(validateOnboarding(ok, today, ["BLUE"])).toEqual({ ok: false, error: "Cette couleur est déjà prise par ton binôme." });
});

test("default deadline is 90 days ahead", () => {
  expect(defaultDeadline(today)).toBe("2027-02-14");
});
