import { describe, expect, it } from "vitest";
import { COLOR_HEX, crowned, sprite } from "./sprites";

describe("sprite", () => {
  it("dessine chaque forme des deux personnages", () => {
    for (const c of ["KNIGHT", "PANDA"] as const)
      for (const f of [1, 2, 3, 4, 5, 6] as const) expect(sprite(c, "BLUE", f, "normal").rects.length).toBeGreaterThan(10);
  });

  it("grandit avec la forme", () => {
    expect(sprite("KNIGHT", "BLUE", 6, "normal").height).toBeGreaterThan(sprite("KNIGHT", "BLUE", 1, "normal").height);
  });

  it("prend la couleur du joueur, délavée quand il est fatigué", () => {
    const fills = (m: "normal" | "tired") => sprite("KNIGHT", "RED", 4, m).rects.map((r) => r.fill);
    expect(fills("normal")).toContain(COLOR_HEX.RED);
    expect(fills("tired")).not.toContain(COLOR_HEX.RED);
  });

  it("relève la visière du chevalier fatigué", () => {
    const skin = (m: "normal" | "tired") => sprite("KNIGHT", "BLUE", 5, m).rects.some((r) => r.y < 8 && (r.fill === "#f4c7a1" || r.fill === "#dcc6b6"));
    expect(skin("normal")).toBe(false);
    expect(skin("tired")).toBe(true);
  });

  it("pointe l'arme en action et la lève en victoire", () => {
    const rest = sprite("KNIGHT", "BLUE", 5, "normal");
    expect(sprite("KNIGHT", "BLUE", 5, "normal", "action").width).toBeGreaterThan(rest.width);
    expect(sprite("PANDA", "BLUE", 5, "normal", "victory").height).toBeGreaterThan(sprite("PANDA", "BLUE", 5, "normal").height);
  });
});

describe("challenge crown", () => {
  it("sits on the head of every form, rust included", () => {
    for (const character of ["KNIGHT", "PANDA"] as const) {
      for (const form of [1, 2, 3, 4, 5, 6] as const) {
        const plain = sprite(character, "BLUE", form, "tired");
        const withCrown = sprite(character, "BLUE", form, "tired", "rest", true);
        expect(withCrown.rects.some((r) => r.fill === "#ffd84a")).toBe(true);
        expect(withCrown.height).toBeGreaterThanOrEqual(plain.height);
      }
    }
  });
  it("is placed above the first wide outline row", () => {
    const g = crowned(["..KKKK..", "..KSSK.."]);
    expect(g).toHaveLength(6);
    expect(g[4]).toBe("..KKKK..");
    expect(g[3]).toContain("QJXJXJQ");
  });
});
