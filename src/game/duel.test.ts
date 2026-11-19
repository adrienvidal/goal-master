import { describe, expect, test } from "vitest";
import { currentDuel, duelDayOf, isUrgent, isWounded, parisTime, pastDuels, type DuelInput } from "./duel";
import type { Application } from "./xp";

let seq = 0;
function app(userId: string, iso: string, cancelled = false): Application {
  return { id: `a${seq++}`, userId, company: "Acme", createdAt: new Date(iso), cancelledAt: cancelled ? new Date(iso) : null };
}
function many(userId: string, n: number, iso: string): Application[] {
  return Array.from({ length: n }, () => app(userId, iso));
}
const created = new Date("2026-11-01T10:00:00Z");
const deadline = "2027-02-12"; // 13 vendredis à partir du 20/11
const goals = [
  { playerId: "a", target: 100, createdAt: created, deadline },
  { playerId: "n", target: 100, createdAt: created, deadline },
];

describe("calendar of duels", () => {
  test("18 h in Paris, winter and summer", () => {
    expect(parisTime("2026-11-20", 18).toISOString()).toBe("2026-11-20T17:00:00.000Z");
    expect(parisTime("2027-06-04", 18).toISOString()).toBe("2027-06-04T16:00:00.000Z");
  });
  test("the week runs from Friday 18 h to Friday 18 h", () => {
    expect(duelDayOf(new Date("2026-11-18T10:00:00Z"))).toBe("2026-11-20");
    expect(duelDayOf(new Date("2026-11-20T16:59:00Z"))).toBe("2026-11-20");
    expect(duelDayOf(new Date("2026-11-20T17:00:00Z"))).toBe("2026-11-27");
    expect(duelDayOf(new Date("2026-11-22T10:00:00Z"))).toBe("2026-11-27");
  });
});

describe("boss of the week", () => {
  // 12 et 30 candidatures avant la semaine : il reste 88 et 70 sur 13 semaines.
  const before = [...many("a", 12, "2026-11-10T09:00:00Z"), ...many("n", 30, "2026-11-10T09:00:00Z")];

  test("hit points: the gentler of the starting pace and the pace left", () => {
    // Départ : ceil(100/15) = 7. Reste : ceil(88/13) = 7 et ceil(70/13) = 6.
    const input: DuelInput = { goals, apps: before, nudges: [] };
    const duel = currentDuel(input, new Date("2026-11-18T10:00:00Z"))!;
    expect(duel.fighters.map((f) => f.need)).toEqual([7, 6]);
    expect(duel.hp).toBe(13);
    expect(duel.hits).toBe(0);
    expect(duel.resolved).toBe(false);
  });

  test("each application of the week is a hit, cancelled ones are not, weekend counts for next Friday", () => {
    const apps = [...before, ...many("a", 4, "2026-11-17T09:00:00Z"), ...many("n", 3, "2026-11-18T09:00:00Z"), app("a", "2026-11-17T10:00:00Z", true), app("a", "2026-11-14T10:00:00Z")];
    const duel = currentDuel({ goals, apps, nudges: [] }, new Date("2026-11-18T12:00:00Z"))!;
    expect(duel.fighters.map((f) => f.hits)).toEqual([5, 3]);
  });

  test("the level adds a finishing blow per 5 levels", () => {
    // 40 candidatures étalées = 400 XP, sans plafond quotidien atteint.
    const apps = Array.from({ length: 40 }, (_, i) => app("a", `2026-11-0${2 + (i % 5)}T0${i % 8}:00:00Z`));
    const duel = currentDuel({ goals: [goals[0]], apps, nudges: [] }, new Date("2026-11-18T12:00:00Z"))!;
    expect(duel.fighters[0].bonus).toBe(2);
  });

  test("won when hits and finishing blows reach the hit points", () => {
    const apps = [...before, ...many("a", 6, "2026-11-17T09:00:00Z"), ...many("n", 6, "2026-11-18T09:00:00Z")];
    const duel = currentDuel({ goals, apps, nudges: [] }, new Date("2026-11-20T17:30:00Z"));
    expect(duel?.id).toBe("2026-11-27");
    const past = pastDuels({ goals, apps, nudges: [] }, new Date("2026-11-20T17:30:00Z"));
    expect(past[0]).toMatchObject({ id: "2026-11-20", hp: 13, hits: 12, resolved: true });
    expect(past[0].won).toBe(past[0].bonus >= 1);
  });

  test("being late does not grow the boss", () => {
    const input: DuelInput = { goals, apps: [], nudges: [] };
    expect(currentDuel(input, new Date("2026-11-18T10:00:00Z"))!.hp).toBe(14);
    expect(currentDuel(input, new Date("2027-01-20T10:00:00Z"))!.hp).toBe(14);
  });

  test("being ahead makes the boss smaller", () => {
    // Il reste 3 candidatures sur 13 vendredis.
    const duel = currentDuel({ goals: [goals[0]], apps: many("a", 97, "2026-11-10T09:00:00Z"), nudges: [] }, new Date("2026-11-18T10:00:00Z"))!;
    expect(duel.hp).toBe(1);
  });

  test("a successful nudge is a hit for the sender, once answered before the duel", () => {
    const nudges = [
      { id: "r1", senderId: "a", recipientId: "n", sentAt: new Date("2026-11-17T08:00:00Z") },
      { id: "r2", senderId: "n", recipientId: "a", sentAt: new Date("2026-11-18T08:00:00Z") },
      { id: "r3", senderId: "a", recipientId: "n", sentAt: new Date("2026-11-20T12:00:00Z") },
    ];
    const apps = [app("n", "2026-11-17T09:00:00Z"), app("n", "2026-11-20T18:00:00Z")];
    const past = pastDuels({ goals, apps, nudges }, new Date("2026-11-21T10:00:00Z"))[0];
    expect(past.id).toBe("2026-11-20");
    // r1 suivie d'effet ; r2 sans réponse ; r3 répondue après le duel.
    expect(past.fighters.map((f) => [f.hits, f.support])).toEqual([[1, 1], [1, 0]]);
  });

  test("a quest validated during the week is a hit for the one who did it", () => {
    const quest = { id: "q1", giverId: "a", receiverId: "n", text: "Relancer Acme", link: null, status: "VALIDATED" as const, offer: [], companion: null, companionName: null, createdAt: new Date("2026-11-16T08:00:00Z"), doneAt: new Date("2026-11-17T08:00:00Z"), validatedAt: new Date("2026-11-17T09:00:00Z"), closedAt: null };
    const duel = currentDuel({ goals, apps: [], nudges: [], quests: [quest] }, new Date("2026-11-18T10:00:00Z"))!;
    expect(duel.fighters.map((f) => [f.hits, f.support])).toEqual([[0, 0], [1, 1]]);
  });

  test("goal set mid-week: boss prorated to remaining workdays", () => {
    const thursday = [{ playerId: "a", target: 100, createdAt: new Date("2026-11-19T08:00:00Z"), deadline }];
    const duel = currentDuel({ goals: thursday, apps: [], nudges: [] }, new Date("2026-11-19T09:00:00Z"))!;
    expect(duel.hp).toBe(4); // ceil(100/13) = 8, × 2/5 jours ouvrés
  });

  test("no boss after the deadline or once the goal is reached", () => {
    const done = { goals: [goals[0]], apps: many("a", 100, "2026-11-10T09:00:00Z"), nudges: [] };
    expect(currentDuel(done, new Date("2026-11-18T10:00:00Z"))).toBeNull();
    expect(currentDuel({ goals, apps: [], nudges: [] }, new Date("2027-02-15T10:00:00Z"))).toBeNull();
  });
});

describe("after the duel", () => {
  test("wounded after a defeat, healed by the next victory", () => {
    const fresh = goals.map((g) => ({ ...g, createdAt: new Date("2026-11-16T08:00:00Z") }));
    const lost = { goals: fresh, apps: [], nudges: [] };
    expect(isWounded(lost, new Date("2026-11-18T10:00:00Z"))).toBe(false);
    expect(isWounded(lost, new Date("2026-11-21T10:00:00Z"))).toBe(true);
    const comeback = { goals: fresh, apps: [...many("a", 10, "2026-11-23T09:00:00Z"), ...many("n", 10, "2026-11-24T09:00:00Z")], nudges: [] };
    expect(isWounded(comeback, new Date("2026-11-28T10:00:00Z"))).toBe(false);
  });

  test("urgent in the last 24 hours while the boss stands", () => {
    const input = { goals, apps: [], nudges: [] };
    expect(isUrgent(currentDuel(input, new Date("2026-11-19T18:00:00Z"))!, new Date("2026-11-19T18:00:00Z"))).toBe(true);
    expect(isUrgent(currentDuel(input, new Date("2026-11-18T18:00:00Z"))!, new Date("2026-11-18T18:00:00Z"))).toBe(false);
  });
});
