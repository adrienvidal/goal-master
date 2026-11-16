import { describe, expect, test } from "vitest";
import { avatarState, bestStreak, countsByDay, currentStreak } from "./avatar";
import type { Application } from "./xp";

function counts(entries: Record<string, number>): Map<string, number> {
  return new Map(Object.entries(entries));
}

describe("streak", () => {
  const c = counts({ "2026-11-14": 1, "2026-11-15": 2, "2026-11-16": 1 });
  test("current streak", () => {
    expect(currentStreak(c, "2026-11-16")).toBe(3);
    expect(currentStreak(c, "2026-11-17")).toBe(3);
    expect(currentStreak(c, "2026-11-18")).toBe(0);
  });
  test("best streak", () => {
    expect(bestStreak(counts({ "2026-11-01": 1, "2026-11-02": 1, "2026-11-03": 1, "2026-11-10": 1, "2026-11-11": 1 }))).toBe(3);
    expect(bestStreak(new Map())).toBe(0);
  });
});

describe("countsByDay", () => {
  test("uses Paris days and skips cancelled applications", () => {
    const apps: Application[] = [
      { id: "1", userId: "a", company: "A", createdAt: new Date("2026-11-16T22:30:00Z"), cancelledAt: null },
      { id: "2", userId: "a", company: "B", createdAt: new Date("2026-11-16T23:30:00Z"), cancelledAt: null },
      { id: "3", userId: "a", company: "C", createdAt: new Date("2026-11-16T10:00:00Z"), cancelledAt: new Date() },
    ];
    expect(countsByDay(apps)).toEqual(counts({ "2026-11-16": 1, "2026-11-17": 1 }));
  });
});

describe("avatarState", () => {
  test("no applications yet: normal", () => {
    expect(avatarState(new Map(), 1, "2026-11-16")).toMatchObject({ mood: "normal", idleWorkdays: 0, displayedForm: 1 });
  });

  test("weekend does not count", () => {
    expect(avatarState(counts({ "2026-11-13": 1 }), 3, "2026-11-16")).toMatchObject({ mood: "normal", idleWorkdays: 1 });
  });

  test("sleep then tired", () => {
    const c = counts({ "2026-11-09": 1 });
    expect(avatarState(c, 3, "2026-11-12")).toMatchObject({ mood: "sleep", idleWorkdays: 3 });
    expect(avatarState(c, 3, "2026-11-13")).toMatchObject({ mood: "tired", idleWorkdays: 4 });
  });

  test("exhausted and fallen after 7 workdays", () => {
    expect(avatarState(counts({ "2026-11-02": 1 }), 4, "2026-11-11")).toMatchObject({
      mood: "exhausted",
      idleWorkdays: 7,
      lostForms: 1,
      displayedForm: 3,
      fallen: true,
    });
  });

  test("one more form lost every 5 workdays, never below form 1", () => {
    const c = counts({ "2026-11-02": 1 });
    expect(avatarState(c, 4, "2026-11-18")).toMatchObject({ idleWorkdays: 12, lostForms: 2, displayedForm: 2 });
    expect(avatarState(c, 1, "2026-11-18").displayedForm).toBe(1);
  });

  test("one application does not lift the fall", () => {
    const s = avatarState(counts({ "2026-11-02": 1, "2026-11-12": 1 }), 4, "2026-11-12");
    expect(s).toMatchObject({ fallen: true, mood: "exhausted", lostForms: 1, idleWorkdays: 0 });
  });

  test("3 applications over 2 consecutive days reconquer", () => {
    const s = avatarState(counts({ "2026-11-02": 1, "2026-11-12": 1, "2026-11-13": 2 }), 4, "2026-11-13");
    expect(s).toMatchObject({ fallen: false, lostForms: 0, displayedForm: 4, mood: "normal", reconquests: 1 });
  });

  test("2 applications over 2 days do not reconquer", () => {
    const s = avatarState(counts({ "2026-11-02": 1, "2026-11-12": 1, "2026-11-13": 1 }), 4, "2026-11-13");
    expect(s).toMatchObject({ fallen: true, lostForms: 1 });
  });

  test("fallen player who applies once then stops does not lose forms twice", () => {
    const s = avatarState(counts({ "2026-11-02": 1, "2026-11-12": 1 }), 4, "2026-11-16");
    expect(s).toMatchObject({ fallen: true, lostForms: 1 });
  });
});
