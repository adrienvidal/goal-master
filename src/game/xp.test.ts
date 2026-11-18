import { describe, expect, test } from "vitest";
import { nudgeSucceeded, totalXp, type Application, type Nudge } from "./xp";

let seq = 0;
function app(userId: string, iso: string, cancelled = false): Application {
  return { id: `a${seq++}`, userId, company: "Acme", createdAt: new Date(iso), cancelledAt: cancelled ? new Date(iso) : null };
}
function many(userId: string, dayIso: string, n: number): Application[] {
  return Array.from({ length: n }, (_, i) => app(userId, `${dayIso}T${String(8 + Math.floor(i / 6)).padStart(2, "0")}:${String((i % 6) * 10).padStart(2, "0")}:00Z`));
}

describe("totalXp", () => {
  test("10 XP per application", () => {
    expect(totalXp("a", many("a", "2026-11-16", 3), [])).toBe(30);
  });

  test("daily cap of 15 applications", () => {
    expect(totalXp("a", many("a", "2026-11-16", 17), [])).toBe(150);
    expect(totalXp("a", [...many("a", "2026-11-16", 15), ...many("a", "2026-11-17", 2)], [])).toBe(170);
  });

  test("cancelled applications free a slot under the cap", () => {
    const apps = many("a", "2026-11-16", 16);
    apps[2] = { ...apps[2], cancelledAt: new Date("2026-11-16T12:00:00Z") };
    expect(totalXp("a", apps, [])).toBe(150);
  });

  test("ignores other players' applications", () => {
    expect(totalXp("a", many("b", "2026-11-16", 2), [])).toBe(0);
  });
});

describe("nudges", () => {
  const nudge: Nudge = { id: "n1", senderId: "a", recipientId: "b", sentAt: new Date("2026-11-16T09:00:00Z") };

  test("success within 24 hours gives 15 XP to both", () => {
    const apps = [app("b", "2026-11-17T08:00:00Z")];
    expect(nudgeSucceeded(nudge, apps)).toBe(true);
    expect(totalXp("a", apps, [nudge])).toBe(15);
    expect(totalXp("b", apps, [nudge])).toBe(25);
  });

  test("no bonus after 24 hours", () => {
    const apps = [app("b", "2026-11-17T10:00:00Z")];
    expect(nudgeSucceeded(nudge, apps)).toBe(false);
    expect(totalXp("a", apps, [nudge])).toBe(0);
  });

  test("an application before the nudge does not count", () => {
    expect(nudgeSucceeded(nudge, [app("b", "2026-11-16T08:00:00Z")])).toBe(false);
  });

  test("a cancelled application does not count", () => {
    expect(nudgeSucceeded(nudge, [app("b", "2026-11-16T12:00:00Z", true)])).toBe(false);
  });
});

describe("XP des quêtes", () => {
  const q = { id: "q1", giverId: "a", receiverId: "b", text: "Poste sur LinkedIn", link: null, offer: [], companion: null, createdAt: new Date("2026-11-16T10:00:00Z"), doneAt: null, closedAt: null };
  test("une quête validée ajoute 20 à celui qui l'a faite et 5 à celui qui l'a donnée", () => {
    const done = { ...q, status: "VALIDATED" as const, validatedAt: new Date("2026-11-17T10:00:00Z") };
    expect(totalXp("b", [], [], [done])).toBe(20);
    expect(totalXp("a", [], [], [done])).toBe(5);
    expect(totalXp("b", [], [], [{ ...q, status: "DONE" as const, validatedAt: null }])).toBe(0);
  });
});
