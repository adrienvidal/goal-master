import { expect, test } from "vitest";
import type { Application } from "@/game/xp";
import { buildPlayerView, findDuplicate, removalImpact, splitCompany } from "./playerView";

const player = { id: "a", pseudo: "Adrien", character: "KNIGHT" as const, color: "BLUE" as const };
let seq = 0;
function app(iso: string, company = "Acme", userId = "a", cancelled = false): Application {
  return { id: `x${seq++}`, userId, company, createdAt: new Date(iso), cancelledAt: cancelled ? new Date(iso) : null };
}
const now = new Date("2026-11-16T15:00:00Z");
const goal = { target: 100, deadline: new Date("2027-01-31T12:00:00Z"), createdAt: new Date("2026-11-01T00:00:00Z") };

test("fresh player", () => {
  const v = buildPlayerView(player, [], [], goal, now);
  expect(v).toMatchObject({ level: 1, xpInLevel: 0, xpForNext: 22, title: "Bébé", mood: "normal", streak: 0 });
  expect(v.goal).toEqual({ target: 100, done: 0, deadline: "2027-01-31", daysLeft: 76 });
});

test("counts today's applications and recent feed, ignoring cancelled ones", () => {
  const apps = [app("2026-11-16T09:00:00Z", "Doctolib"), app("2026-11-16T10:00:00Z", "Qonto"), app("2026-11-16T11:00:00Z", "Alan", "a", true), app("2026-11-15T09:00:00Z", "Malt")];
  const v = buildPlayerView(player, apps, [], goal, now);
  expect(v.today.count).toBe(2);
  expect(v.today.items.map((i) => i.company)).toEqual(["Qonto", "Doctolib"]);
  expect(v.feed.map((r) => r.kind === "application" && r.company)).toEqual(["Qonto", "Doctolib", "Malt"]);
  expect(v.goal?.done).toBe(3);
  expect(v.streak).toBe(2);
});

test("fallen title keeps the level form name", () => {
  const apps = Array.from({ length: 30 }, (_, i) => app(`2026-10-${String(10 + (i % 5)).padStart(2, "0")}T09:00:00Z`));
  const v = buildPlayerView(player, apps, [], goal, now);
  expect(v.mood).toBe("exhausted");
  expect(v.title).toBe(`${["Bébé", "Gamin", "Écuyer", "Homme d'armes"][v.levelForm - 1]} déchu`);
});

test("duplicate detection is case and space insensitive", () => {
  const apps = [app("2026-11-12T09:00:00Z", "Alan"), app("2026-11-13T09:00:00Z", "Doctolib")];
  expect(findDuplicate("  alan ", "a", apps)?.app.company).toBe("Alan");
  expect(findDuplicate("Qonto", "a", apps)).toBeNull();
  expect(findDuplicate("Alan", "b", apps)).toBeNull();
});

test("duplicate ignores case, accents and punctuation (Nicolas's double entry)", () => {
  const apps = [app("2026-11-16T16:00:58Z", "Licorn society - Delibia - Développeur Front-End React & Design System")];
  expect(findDuplicate("Licorn Society / Delibia - Developpeur Front-End React & Design System", "a", apps)?.sure).toBe(true);
});

test("duplicate catches the same company with or without the job title", () => {
  const apps = [app("2026-11-16T10:00:00Z", "Qonto - Développeur Front-End")];
  expect(findDuplicate("qonto", "a", apps)?.sure).toBe(false);
  expect(findDuplicate("Qonto · Développeur Frontend Senior", "a", apps)?.sure).toBe(false);
});

test("duplicate stays quiet for different companies sharing a job title", () => {
  const apps = [app("2026-11-16T10:00:00Z", "Whub - Développeur Front-End Senior React")];
  expect(findDuplicate("Alan - Développeur Front-End Senior React", "a", apps)).toBeNull();
  expect(findDuplicate("Qonto", "a", [app("2026-11-16T10:00:00Z", "Qontom")])).toBeNull();
});

test("splitCompany separates the company from the job title", () => {
  expect(splitCompany("Licorn Society / Delibia - Développeur Front-End")).toEqual({ name: "Licorn Society", detail: "Delibia - Développeur Front-End" });
  expect(splitCompany("Whub - Développeur Front-End Senior React")).toEqual({ name: "Whub", detail: "Développeur Front-End Senior React" });
  expect(splitCompany("Alan")).toEqual({ name: "Alan", detail: "" });
});

test("removalImpact tells the XP lost and whether a nudge bonus goes with it", () => {
  const first = app("2026-11-16T09:00:00Z", "Alan");
  const second = app("2026-11-16T11:00:00Z", "Qonto");
  const nudge = { id: "n", senderId: "b", recipientId: "a", message: 0, sentAt: new Date("2026-11-16T10:00:00Z") };
  expect(removalImpact(first.id, "a", [first, second], [nudge])).toEqual({ xp: 10, nudgeLost: false });
  expect(removalImpact(second.id, "a", [first, second], [nudge])).toEqual({ xp: 25, nudgeLost: true });
});

test("feed shows when the player reached a new form, among recent applications", () => {
  const apps = [
    ...Array.from({ length: 7 }, (_, i) => app(`2026-11-13T0${i}:00:00Z`, `Boite ${i}`)),
    app("2026-11-14T09:00:00Z", "Alan"),
    app("2026-11-15T09:00:00Z", "Malt"),
  ];
  const v = buildPlayerView(player, apps, [], goal, now);
  expect(v.feed.slice(0, 3)).toEqual([
    { kind: "application", company: "Malt", day: "2026-11-15" },
    { kind: "evolution", formName: "Gamin", day: "2026-11-14" },
    { kind: "application", company: "Alan", day: "2026-11-14" },
  ]);
  expect(v.feed).toHaveLength(5);
});
