import { describe, expect, test } from "vitest";
import { addDays, dayRange, isWorkday, parisDay } from "./calendar";

describe("parisDay", () => {
  test("late evening in Paris stays on the same day", () => {
    expect(parisDay(new Date("2026-11-16T22:30:00Z"))).toBe("2026-11-16");
    expect(parisDay(new Date("2026-11-16T23:30:00Z"))).toBe("2026-11-17");
  });
  test("summer time", () => {
    expect(parisDay(new Date("2026-07-01T22:30:00Z"))).toBe("2026-07-02");
  });
});

describe("addDays", () => {
  test("crosses the October clock change", () => {
    expect(addDays("2026-10-24", 1)).toBe("2026-10-25");
    expect(addDays("2026-10-25", 1)).toBe("2026-10-26");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("isWorkday", () => {
  test("weekends are not workdays", () => {
    expect(isWorkday("2026-11-14")).toBe(false);
    expect(isWorkday("2026-11-15")).toBe(false);
    expect(isWorkday("2026-11-16")).toBe(true);
  });
});

describe("dayRange", () => {
  test("inclusive and ordered", () => {
    expect(dayRange("2026-11-14", "2026-11-16")).toEqual(["2026-11-14", "2026-11-15", "2026-11-16"]);
    expect(dayRange("2026-11-17", "2026-11-16")).toEqual([]);
  });
});
