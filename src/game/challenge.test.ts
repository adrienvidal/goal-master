import { describe, expect, test } from "vitest";
import {
  bestWinStreak,
  canLaunch,
  challengeScore,
  crownHolder,
  deadlineFor,
  lastFinished,
  openChallenge,
  phaseOf,
  reachedTarget,
  type ChallengeRow,
} from "./challenge";
import type { Application } from "./xp";

let seq = 0;
function app(userId: string, iso: string, cancelledIso: string | null = null): Application {
  return { id: `a${seq++}`, userId, company: "Acme", createdAt: new Date(iso), cancelledAt: cancelledIso ? new Date(cancelledIso) : null };
}
function ch(over: Partial<ChallengeRow> = {}): ChallengeRow {
  return {
    id: `c${seq++}`,
    challengerId: "a",
    opponentId: "n",
    target: 3,
    deadline: new Date("2026-11-16T23:00:00Z"), // minuit à Paris
    status: "ACCEPTED",
    createdAt: new Date("2026-11-16T09:00:00Z"),
    acceptedAt: new Date("2026-11-16T10:00:00Z"),
    closedAt: null,
    winnerId: null,
    wonAt: null,
    ...over,
  };
}

describe("deadlines", () => {
  test("tonight is the next Paris midnight", () => {
    expect(deadlineFor("tonight", new Date("2026-11-16T15:00:00Z"))?.toISOString()).toBe("2026-11-16T23:00:00.000Z");
  });
  test("tonight is no longer offered from 21 h in Paris", () => {
    expect(deadlineFor("tonight", new Date("2026-11-16T19:59:00Z"))).not.toBeNull();
    expect(deadlineFor("tonight", new Date("2026-11-16T20:00:00Z"))).toBeNull();
  });
  test("friday is the next Friday 18 h, never the one just past", () => {
    expect(deadlineFor("friday", new Date("2026-11-16T15:00:00Z"))?.toISOString()).toBe("2026-11-20T17:00:00.000Z");
    expect(deadlineFor("friday", new Date("2026-11-20T17:30:00Z"))?.toISOString()).toBe("2026-11-27T17:00:00.000Z");
  });
});

describe("phases", () => {
  const before = new Date("2026-11-16T12:00:00Z");
  const after = new Date("2026-11-17T08:00:00Z");
  test("pending, then expired at the deadline", () => {
    const c = ch({ status: "PENDING", acceptedAt: null });
    expect(phaseOf(c, before)).toBe("pending");
    expect(phaseOf(c, after)).toBe("expired");
  });
  test("running, then draw without a winner", () => {
    expect(phaseOf(ch(), before)).toBe("running");
    expect(phaseOf(ch(), after)).toBe("draw");
  });
  test("a winner is final", () => {
    expect(phaseOf(ch({ winnerId: "a", wonAt: before }), before)).toBe("won");
  });
  test("declined and cancelled", () => {
    expect(phaseOf(ch({ status: "DECLINED" }), before)).toBe("declined");
    expect(phaseOf(ch({ status: "CANCELLED" }), before)).toBe("cancelled");
  });
});

describe("who may launch", () => {
  const now = new Date("2026-11-16T12:00:00Z");
  test("one open challenge at a time, for both players", () => {
    expect(canLaunch("n", [ch()], now)).toEqual({ ok: false, reason: "open" });
    expect(openChallenge([ch({ status: "DECLINED" })], now)).toBeNull();
  });
  test("one launch a day; declined and expired do not count, cancelled does", () => {
    const morning = new Date("2026-11-16T07:00:00Z");
    expect(canLaunch("a", [ch({ status: "DECLINED", createdAt: morning })], now)).toEqual({ ok: true });
    expect(canLaunch("a", [ch({ status: "CANCELLED", createdAt: morning })], now)).toEqual({ ok: false, reason: "today" });
    const expired = ch({ status: "PENDING", acceptedAt: null, createdAt: morning, deadline: new Date("2026-11-16T11:00:00Z") });
    expect(canLaunch("a", [expired], now)).toEqual({ ok: true });
    expect(canLaunch("a", [ch({ status: "CANCELLED", createdAt: new Date("2026-11-15T09:00:00Z") })], now)).toEqual({ ok: true });
  });
  test("the other player may still launch the same day", () => {
    expect(canLaunch("n", [ch({ status: "CANCELLED" })], now)).toEqual({ ok: true });
  });
});

describe("scores", () => {
  test("only applications between acceptance and the end count", () => {
    const c = ch();
    const apps = [app("a", "2026-11-16T09:30:00Z"), app("a", "2026-11-16T11:00:00Z"), app("a", "2026-11-17T08:00:00Z"), app("n", "2026-11-16T12:00:00Z")];
    expect(challengeScore("a", c, apps)).toBe(1);
    expect(challengeScore("n", c, apps)).toBe(1);
  });
  test("a removal after the win does not change the score", () => {
    const c = ch({ winnerId: "a", wonAt: new Date("2026-11-16T13:00:00Z") });
    const apps = [app("a", "2026-11-16T11:00:00Z", "2026-11-16T14:00:00Z"), app("a", "2026-11-16T12:00:00Z"), app("a", "2026-11-16T13:00:00Z"), app("a", "2026-11-16T15:00:00Z")];
    expect(challengeScore("a", c, apps)).toBe(3);
  });
  test("a removal before the end does", () => {
    const apps = [app("a", "2026-11-16T11:00:00Z", "2026-11-16T11:30:00Z"), app("a", "2026-11-16T12:00:00Z")];
    expect(challengeScore("a", ch(), apps)).toBe(1);
  });
  test("target reached while running", () => {
    const apps = [1, 2, 3].map((h) => app("n", `2026-11-16T1${h}:00:00Z`));
    expect(reachedTarget(ch(), "n", apps, new Date("2026-11-16T14:00:00Z"))).toBe(true);
    expect(reachedTarget(ch(), "a", apps, new Date("2026-11-16T14:00:00Z"))).toBe(false);
    expect(reachedTarget(ch(), "n", apps, new Date("2026-11-17T01:00:00Z"))).toBe(false);
  });
});

describe("crown and history", () => {
  const won = ch({ winnerId: "a", wonAt: new Date("2026-11-16T15:00:00Z") });
  test("the crown lasts until the end of the next Paris day", () => {
    expect(crownHolder([won], new Date("2026-11-17T22:59:00Z"))).toBe("a");
    expect(crownHolder([won], new Date("2026-11-17T23:00:00Z"))).toBeNull();
  });
  test("the latest finished challenge, won or drawn", () => {
    const now = new Date("2026-11-18T10:00:00Z");
    const draw = ch({ createdAt: new Date("2026-11-17T09:00:00Z"), acceptedAt: new Date("2026-11-17T09:10:00Z"), deadline: new Date("2026-11-17T23:00:00Z") });
    expect(lastFinished([won, draw], now)?.id).toBe(draw.id);
    expect(lastFinished([ch({ status: "DECLINED" })], now)).toBeNull();
  });
  test("best win streak breaks on a draw or a loss", () => {
    const now = new Date("2026-12-01T10:00:00Z");
    const at = (d: number, winnerId: string | null) =>
      ch({ createdAt: new Date(`2026-11-${d}T09:00:00Z`), acceptedAt: new Date(`2026-11-${d}T09:10:00Z`), deadline: new Date(`2026-11-${d}T23:00:00Z`), winnerId, wonAt: winnerId ? new Date(`2026-11-${d}T12:00:00Z`) : null });
    const history = [at(10, "a"), at(11, "a"), at(12, null), at(13, "a"), at(14, "a"), at(15, "a"), at(16, "n")];
    expect(bestWinStreak("a", history, now)).toBe(3);
    expect(bestWinStreak("n", history, now)).toBe(1);
  });
});
