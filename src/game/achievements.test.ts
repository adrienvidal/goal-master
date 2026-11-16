import { describe, expect, test } from "vitest";
import { ACHIEVEMENTS, earnedAchievements } from "./achievements";
import type { Application, Nudge } from "./xp";

let seq = 0;
function app(userId: string, iso: string): Application {
  return { id: `a${seq++}`, userId, company: "Acme", createdAt: new Date(iso), cancelledAt: null };
}
function daily(userId: string, firstDay: string, days: number, perDay = 1): Application[] {
  const start = new Date(`${firstDay}T09:00:00Z`).getTime();
  return Array.from({ length: days * perDay }, (_, i) =>
    app(userId, new Date(start + Math.floor(i / perDay) * 86_400_000 + (i % perDay) * 60_000).toISOString()),
  );
}
const base = { userId: "a", partnerId: "b", nudges: [] as Nudge[], goalsReached: 0, today: "2026-11-30", levelForm: 1 as const };

describe("earnedAchievements", () => {
  test("16 achievements are defined", () => {
    expect(Object.keys(ACHIEVEMENTS)).toHaveLength(16);
    expect(ACHIEVEMENTS.centurion.title).toBe("Centurion");
  });

  test("nothing without applications", () => {
    expect(earnedAchievements({ ...base, apps: [] }).size).toBe(0);
  });

  test("application milestones", () => {
    const got = earnedAchievements({ ...base, apps: daily("a", "2026-11-02", 1, 10) });
    expect(got).toEqual(new Set(["first_step", "on_the_way"]));
  });

  test("streak milestones", () => {
    const got = earnedAchievements({ ...base, apps: daily("a", "2026-11-02", 7) });
    expect(got.has("warm_up")).toBe(true);
    expect(got.has("week_on_fire")).toBe(true);
    expect(got.has("machine")).toBe(false);
  });

  test("duo when both apply the same day", () => {
    const got = earnedAchievements({ ...base, apps: [app("a", "2026-11-16T09:00:00Z"), app("b", "2026-11-16T18:00:00Z")] });
    expect(got.has("duo")).toBe(true);
  });

  test("coach after 5 successful nudges sent", () => {
    const nudges: Nudge[] = Array.from({ length: 5 }, (_, i) => ({
      id: `n${i}`,
      senderId: "a",
      recipientId: "b",
      sentAt: new Date(`2026-11-1${i}T08:00:00Z`),
    }));
    const apps = nudges.map((n) => app("b", new Date(n.sentAt.getTime() + 3_600_000).toISOString()));
    expect(earnedAchievements({ ...base, apps, nudges }).has("coach")).toBe(true);
    expect(earnedAchievements({ ...base, apps, nudges: nudges.slice(1) }).has("coach")).toBe(false);
  });

  test("phoenix after applying following a nudge received", () => {
    const nudge: Nudge = { id: "n", senderId: "b", recipientId: "a", sentAt: new Date("2026-11-16T08:00:00Z") };
    const got = earnedAchievements({ ...base, apps: [app("a", "2026-11-16T10:00:00Z")], nudges: [nudge] });
    expect(got.has("phoenix")).toBe(true);
  });

  test("mission when a goal is reached", () => {
    expect(earnedAchievements({ ...base, apps: [], goalsReached: 1 }).has("mission")).toBe(true);
  });

  test("revenant after a reconquest", () => {
    const apps = [
      app("a", "2026-11-02T09:00:00Z"),
      app("a", "2026-11-12T09:00:00Z"),
      app("a", "2026-11-13T09:00:00Z"),
      app("a", "2026-11-13T10:00:00Z"),
    ];
    expect(earnedAchievements({ ...base, apps, today: "2026-11-13", levelForm: 4 as never }).has("revenant")).toBe(true);
  });
});

test("first boss beaten", () => {
  const base = { userId: "a", partnerId: "b", apps: [], nudges: [], goalsReached: 0, today: "2026-11-16", levelForm: 1 as const };
  expect(earnedAchievements(base).has("first_boss")).toBe(false);
  expect(earnedAchievements({ ...base, bossesBeaten: 1 }).has("first_boss")).toBe(true);
});

test("challenge wins: duelist, then unbeaten after 3 in a row", () => {
  const base = { userId: "a", partnerId: "b", apps: [], nudges: [], goalsReached: 0, today: "2026-11-16", levelForm: 1 as const };
  expect(earnedAchievements(base).has("duelist")).toBe(false);
  expect(earnedAchievements({ ...base, challengeWinStreak: 1 }).has("duelist")).toBe(true);
  expect(earnedAchievements({ ...base, challengeWinStreak: 2 }).has("unbeaten")).toBe(false);
  expect(earnedAchievements({ ...base, challengeWinStreak: 3 }).has("unbeaten")).toBe(true);
});
