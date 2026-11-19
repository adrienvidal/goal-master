import { describe, expect, test } from "vitest";
import type { Application } from "@/game/xp";
import type { PlayerView } from "./playerView";
import type { Duel } from "@/game/duel";
import { widgetBoss, widgetFriend, widgetState } from "./widgetState";

const view = {
  id: "adrien", pseudo: "Adrien", character: "KNIGHT", color: "BLUE", level: 7, xpInLevel: 62, xpForNext: 100,
  levelForm: 2, displayedForm: 2, mood: "normal", idleWorkdays: 0, streak: 4,
  today: { count: 2, items: [] },
} as unknown as PlayerView;

const at = (h: number) => new Date(Date.UTC(2026, 10, 19, h, 0));

function app(id: string, h: number, extra: Partial<Application> = {}): Application {
  return { id, userId: "adrien", company: `Entreprise ${id}`, createdAt: at(h), cancelledAt: null, source: "job-finder", externalRef: id, ...extra };
}

describe("widgetState", () => {
  test("reprend niveau, XP, forme et série de la vue", () => {
    const s = widgetState(view, [], "adrien");
    expect(s).toMatchObject({ pseudo: "Adrien", level: 7, xpInLevel: 62, xpForNext: 100, displayedForm: 2, streak: 4, today: 2, capReached: false, recent: [] });
  });

  test("nom de la forme affichée et compagnons choisis", () => {
    const s = widgetState({ ...view, levelForm: 3, displayedForm: 3 } as PlayerView, [], "adrien", 2, [{ id: "cat", name: "Biscotte" }]);
    expect(s.formName).toBe("Gamin");
    expect(s.companions).toEqual([{ id: "cat", name: "Biscotte" }]);
    expect(widgetState(view, [], "adrien").companions).toEqual([]);
  });

  test("forme plafonnée à la dernière scène vue, niveau et victoire inchangés", () => {
    const s = widgetState({ ...view, levelForm: 3, displayedForm: 3 } as PlayerView, [], "adrien", 2);
    expect(s).toMatchObject({ displayedForm: 2, levelForm: 3, evolutionPending: true });
  });

  test("rien en attente quand la scène a été vue, ou pour un joueur d'avant la forme vue", () => {
    const evolved = { ...view, levelForm: 3, displayedForm: 3 } as PlayerView;
    expect(widgetState(evolved, [], "adrien", 3).evolutionPending).toBe(false);
    expect(widgetState(evolved, [], "adrien", null).evolutionPending).toBe(false);
  });

  test("plafond atteint à 15 candidatures du jour", () => {
    const s = widgetState({ ...view, today: { count: 15, items: [] } } as PlayerView, [], "adrien");
    expect(s.capReached).toBe(true);
  });

  test("la 16e candidature du jour rapporte 0 XP", () => {
    const apps = Array.from({ length: 16 }, (_, i) => app(`a${i}`, 0, { createdAt: new Date(at(8).getTime() + i * 60_000) }));
    const s = widgetState(view, apps, "adrien");
    expect(s.recent[0]).toMatchObject({ id: "a15", xp: 0 });
    expect(s.recent[1]).toMatchObject({ id: "a14", xp: 10 });
    expect(s.recent).toHaveLength(5);
  });

  test("seules les candidatures venues de job-finder, du joueur, non annulées", () => {
    const apps = [
      app("j1", 9),
      app("m1", 10, { source: null, externalRef: null }),
      app("n1", 11, { userId: "nicolas" }),
      app("c1", 12, { cancelledAt: at(13) }),
    ];
    expect(widgetState(view, apps, "adrien").recent.map((r) => r.id)).toEqual(["j1"]);
  });

  test("une saisie à la main compte dans le plafond du jour", () => {
    const manual = Array.from({ length: 15 }, (_, i) => app(`m${i}`, 8, { source: null, externalRef: null }));
    const s = widgetState(view, [...manual, app("j1", 9)], "adrien");
    expect(s.recent[0]).toMatchObject({ id: "j1", xp: 0 });
  });
});

describe("widgetFriend", () => {
  const nico = { ...view, id: "nicolas", pseudo: "Nicolas", character: "PANDA", level: 6, levelForm: 3, displayedForm: 3, mood: "tired", idleWorkdays: 3, streak: 0, today: { count: 0, items: [] } } as unknown as PlayerView;

  test("héros, journée et dernière candidature active de l'ami", () => {
    const apps = [app("n1", 8, { userId: "nicolas", company: "Qonto - Dev" }), app("n2", 9, { userId: "nicolas", cancelledAt: at(10) }), app("a1", 11)];
    const f = widgetFriend(nico, apps, 3);
    expect(f).toMatchObject({ pseudo: "Nicolas", character: "PANDA", displayedForm: 3, formName: "Novice", mood: "tired", level: 6, today: 0, streak: 0, idleWorkdays: 3 });
    expect(f.last).toEqual({ company: "Qonto", at: at(8).toISOString() });
  });

  test("jamais une forme qu'il n'a pas encore vue", () => {
    expect(widgetFriend(nico, [], 2)).toMatchObject({ displayedForm: 2, last: null });
  });
});

describe("widgetBoss", () => {
  const duel = { hp: 12, hits: 4, bonus: 2, won: false } as Duel;
  test("coups restants : PV moins coups et coups de grâce", () => {
    expect(widgetBoss(duel)).toEqual({ left: 6, won: false });
  });
  test("gagné : plus rien à frapper", () => {
    expect(widgetBoss({ ...duel, hits: 11, won: true })).toEqual({ left: 0, won: true });
  });
  test("pas de duel cette semaine", () => {
    expect(widgetBoss(null)).toBeNull();
  });
});

test("sans extras : ni ami, ni boss, ni relance", () => {
  expect(widgetState(view, [], "adrien")).toMatchObject({ friend: null, boss: null, canNudge: false });
});
