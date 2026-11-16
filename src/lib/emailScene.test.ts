import { describe, expect, it } from "vitest";
import { sceneToken } from "./emailArt";
import { sceneFor, type Hero } from "./emailScene";

const me: Hero = { character: "KNIGHT", color: "BLUE", form: 2 };
const nico: Hero = { character: "PANDA", color: "GREEN", form: 3 };
const tokens = (a: ReturnType<typeof sceneFor>) => a.map(sceneToken).join(",");

describe("sceneFor", () => {
  it("montre le binôme à sa nouvelle forme", () => {
    expect(tokens(sceneFor({ kind: "evo", partnerId: "n", partner: "Nicolas", form: 4, formName: "Moine voyageur" }, me, nico))).toBe("hero.PANDA.GREEN.4.victory");
  });
  it("met les deux héros autour du boss au duel", () => {
    expect(tokens(sceneFor({ kind: "duel", friday: "2026-11-20", won: true, boss: 1, total: 18, hp: 16 }, me, nico))).toBe("hero.KNIGHT.BLUE.2.victory,boss.1.down,hero.PANDA.GREEN.3.victory");
    expect(tokens(sceneFor({ kind: "duel", friday: "2026-11-20", won: false, boss: 1, total: 9, hp: 16 }, me, nico))).toBe("hero.KNIGHT.BLUE.2.rest.hurt,boss.1,hero.PANDA.GREEN.3.rest.hurt");
  });
  it("rouille son propre avatar", () => {
    expect(tokens(sceneFor({ kind: "rust", lastDay: "2026-11-12", idle: 3, hero: "chevalier" }, me, nico))).toBe("hero.KNIGHT.BLUE.2.rest.rust");
  });
  it("se passe du binôme absent", () => {
    expect(sceneFor({ kind: "news", step: 6, title: "x" }, me, null)).toHaveLength(1);
  });
});
