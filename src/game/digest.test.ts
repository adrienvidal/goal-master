import { describe, expect, it } from "vitest";
import { digestOf, digestDate, xpGainedSince, applicationsOn, type DigestRow } from "./digest";
import type { NotificationEvent } from "./notifications";
import type { QuestRow } from "./quests";
import type { Application } from "./xp";

// 18/11/2026 18:01 à Paris = 17:01 UTC.
const now = new Date("2026-11-18T17:01:00Z");
let n = 0;
const row = (event: NotificationEvent, at: string): DigestRow => ({ id: `r${++n}`, event, sentAt: new Date(at) });
const quest: NotificationEvent = { kind: "quest", questId: "q1", from: "Adrien", text: "Relancer 3 recruteurs" };
const nudge: NotificationEvent = { kind: "nudge", nudgeId: "n1", from: "Adrien", message: 1 };
const rust: NotificationEvent = { kind: "rust", lastDay: "2026-11-13", idle: 3, hero: "chevalier" };
const duel: NotificationEvent = { kind: "duel", friday: "2026-11-20", won: true, boss: 1, total: 18, hp: 16 };
const turn: NotificationEvent = { kind: "arena-turn", arenaId: "a1", turn: 2, partner: "Adrien", summary: "Adrien frappe.", hp: 8 };

describe("digestOf", () => {
  it("returns null when nothing is pending", () => {
    expect(digestOf([], [], now)).toBeNull();
    expect(digestOf([row(turn, "2026-11-18T10:00:00Z")], [], now)).toBeNull();
  });
  it("lists events in arrival order with Paris times, and leads the subject with the most important", () => {
    const d = digestOf([row(quest, "2026-11-18T09:40:00Z"), row(nudge, "2026-11-18T08:12:00Z"), row(turn, "2026-11-18T12:00:00Z")], [], now);
    expect(d?.lines.map((l) => [l.time, l.event.kind])).toEqual([["09:12", "nudge"], ["10:40", "quest"]]);
    expect(d?.top.kind).toBe("quest");
    expect(d?.subject).toBe("Ta journée : Adrien te lance une quête, et 1 autre nouvelle");
  });
  it("marks older events with yesterday or their date", () => {
    const d = digestOf([row(rust, "2026-11-17T18:30:00Z"), row(nudge, "2026-11-15T08:00:00Z")], [], now);
    expect(d?.lines.map((l) => l.time)).toEqual(["15/11 09:00", "hier 19:30"]);
  });
  it("drops muted categories", () => {
    expect(digestOf([row(nudge, "2026-11-18T08:00:00Z")], ["nudges"], now)).toBeNull();
  });
  it("takes the duel result out of the list and puts it first", () => {
    const d = digestOf([row(quest, "2026-11-20T09:00:00Z"), row(duel, "2026-11-20T17:01:00Z"), row(rust, "2026-11-20T17:01:00Z")], [], new Date("2026-11-20T17:01:30Z"));
    expect(d?.duel?.kind).toBe("duel");
    expect(d?.lines.map((l) => l.event.kind)).toEqual(["quest", "rust"]);
    expect(d?.subject).toBe("Ta journée : Boss vaincu ! et 2 autres nouvelles");
    expect(d?.count).toBe(3);
  });
  it("has no tail for a single event", () => {
    expect(digestOf([row(rust, "2026-11-18T17:01:00Z")], [], now)?.subject).toBe("Ta journée : Ton chevalier commence à rouiller");
  });
});

describe("digestDate", () => {
  it("names the Paris day", () => {
    expect(digestDate(now)).toBe("Mercredi 18 novembre");
  });
});

const app = (userId: string, at: string): Application => ({ id: `${userId}${at}`, userId, company: "Alan", createdAt: new Date(at), cancelledAt: null });
const q = (over: Partial<QuestRow>): QuestRow => ({ id: "q", giverId: "a", receiverId: "b", text: "x", link: null, status: "VALIDATED", offer: [], companion: null, companionName: null, createdAt: new Date("2026-11-10"), doneAt: new Date("2026-11-10"), validatedAt: new Date("2026-11-10"), closedAt: null, ...over });

describe("compte du jour", () => {
  const apps = [app("b", "2026-11-17T10:00:00Z"), app("b", "2026-11-18T08:00:00Z"), app("b", "2026-11-18T09:00:00Z"), app("a", "2026-11-18T09:00:00Z")];
  it("counts today's applications of the player", () => {
    expect(applicationsOn("b", apps, "2026-11-18")).toBe(2);
  });
  it("counts XP earned since midnight, quests included", () => {
    const since = new Date("2026-11-17T23:00:00Z");
    expect(xpGainedSince("b", { apps, nudges: [], quests: [] }, since)).toBe(20);
    expect(xpGainedSince("b", { apps, nudges: [], quests: [q({ validatedAt: new Date("2026-11-18T12:00:00Z") })] }, since)).toBe(40);
    expect(xpGainedSince("b", { apps, nudges: [], quests: [q({})] }, since)).toBe(20);
  });
  it("never goes below zero", () => {
    const cancelled = apps.map((a) => (a.createdAt < new Date("2026-11-18") ? { ...a, cancelledAt: new Date("2026-11-18T10:00:00Z") } : a));
    expect(xpGainedSince("b", { apps: cancelled, nudges: [], quests: [] }, new Date("2026-11-17T23:00:00Z"))).toBeGreaterThanOrEqual(0);
  });
});
