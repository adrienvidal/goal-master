import { describe, expect, test } from "vitest";
import type { Application } from "@/game/xp";
import type { PlayerView } from "./playerView";
import { widgetState } from "./widgetState";

const view = {
  id: "adrien", pseudo: "Adrien", character: "knight", color: "BLUE", level: 7, xpInLevel: 62, xpForNext: 100,
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

  test("forme plafonnée à la dernière scène vue, niveau et victoire inchangés", () => {
    const s = widgetState({ ...view, levelForm: 3, displayedForm: 3 } as PlayerView, [], "adrien", 2);
    expect(s).toMatchObject({ displayedForm: 2, levelForm: 3 });
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
