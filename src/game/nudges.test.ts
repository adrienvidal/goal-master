import { describe, expect, it } from "vitest";
import { justWonNudge, pendingNudge, sentToday, type NudgeRow } from "./nudges";
import type { Application } from "./xp";

const nudge = (sentAt: string, id = "n1"): NudgeRow => ({ id, senderId: "a", recipientId: "b", message: 0, sentAt: new Date(sentAt) });
const app = (at: string): Application => ({ id: at, userId: "b", company: "Alan", createdAt: new Date(at), cancelledAt: null });

describe("sentToday", () => {
  it("compte le jour à l'heure de Paris", () => {
    expect(sentToday("a", [nudge("2026-11-16T23:30:00Z")], "2026-11-16")).toBe(false);
    expect(sentToday("a", [nudge("2026-11-16T23:30:00Z")], "2026-11-17")).toBe(true);
    expect(sentToday("b", [nudge("2026-11-16T10:00:00Z")], "2026-11-16")).toBe(false);
  });
});

describe("pendingNudge", () => {
  const now = new Date("2026-11-16T12:00:00Z");
  it("garde la relance fraîche sans réponse", () => {
    expect(pendingNudge("b", [nudge("2026-11-16T09:00:00Z")], [], now)?.id).toBe("n1");
  });
  it("disparaît une fois qu'on a candidaté", () => {
    expect(pendingNudge("b", [nudge("2026-11-16T09:00:00Z")], [app("2026-11-16T10:00:00Z")], now)).toBeNull();
  });
  it("disparaît après 24 h", () => {
    expect(pendingNudge("b", [nudge("2026-11-15T09:00:00Z")], [], now)).toBeNull();
  });
});

describe("justWonNudge", () => {
  const n = nudge("2026-11-16T09:00:00Z");
  it("rend la relance validée il y a moins de 2 minutes", () => {
    expect(justWonNudge("b", [n], [app("2026-11-16T10:00:00Z")], new Date("2026-11-16T10:01:00Z"))?.id).toBe("n1");
  });
  it("rend la plus récente quand plusieurs relances viennent d'être validées", () => {
    const older = { ...nudge("2026-11-16T09:58:00Z"), id: "n0" };
    const apps = [app("2026-11-16T09:59:00Z"), app("2026-11-16T10:00:30Z")];
    expect(justWonNudge("b", [older, { ...nudge("2026-11-16T10:00:00Z"), id: "n2" }], apps, new Date("2026-11-16T10:01:00Z"))?.id).toBe("n2");
  });
  it("oublie une réussite plus ancienne", () => {
    expect(justWonNudge("b", [n], [app("2026-11-16T10:00:00Z")], new Date("2026-11-16T10:05:00Z"))).toBeNull();
  });
});
