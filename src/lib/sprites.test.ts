import { describe, expect, it } from "vitest";
import { COLOR_HEX, crowned, poseGrid, sprite, spriteLayers } from "./sprites";

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

  const islands = (g: string[]) => {
    const seen = new Set<string>();
    let n = 0;
    g.forEach((row, y) => [...row].forEach((c, x) => {
      if (c === "." || seen.has(`${y},${x}`)) return;
      n++;
      const stack = [[y, x]];
      while (stack.length) {
        const [yy, xx] = stack.pop()!;
        if (seen.has(`${yy},${xx}`) || (g[yy]?.[xx] ?? ".") === ".") continue;
        seen.add(`${yy},${xx}`);
        stack.push([yy - 1, xx], [yy + 1, xx], [yy, xx - 1], [yy, xx + 1]);
      }
    }));
    return n;
  };
  const count = (g: string[], chars: string) => g.join("").split("").filter((c) => chars.includes(c)).length;

  it("garde l'arme dans le poing, sans pixel détaché, en action comme en victoire", () => {
    for (const c of ["KNIGHT", "PANDA"] as const)
      for (const f of [2, 3, 4, 5, 6] as const) {
        const rest = poseGrid(c, f, "rest");
        for (const pose of ["action", "victory"] as const) expect(islands(poseGrid(c, f, pose)), `${c} ${f} ${pose}`).toBeLessThanOrEqual(islands(rest));
      }
  });

  it("brandit l'arme en victoire sans l'allonger", () => {
    for (const c of ["KNIGHT", "PANDA"] as const)
      for (const f of [3, 5] as const) expect(count(poseGrid(c, f, "victory"), "WV")).toBe(count(poseGrid(c, f, "rest"), "WV"));
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

describe("arena poses", () => {
  it("draws parry, potion and knock-out for every form, rust included", () => {
    for (const c of ["KNIGHT", "PANDA"] as const)
      for (const f of [1, 2, 3, 4, 5, 6] as const)
        for (const pose of ["parry", "potion", "ko"] as const) expect(sprite(c, "BLUE", f, "tired", pose).rects.length, `${c} ${f} ${pose}`).toBeGreaterThan(10);
  });

  it("moves the knight's own shield to the front instead of adding one", () => {
    const parry = poseGrid("KNIGHT", 3, "parry");
    const rest = poseGrid("KNIGHT", 3, "rest");
    expect(parry.every((r) => r.slice(0, 4) === "...." || r.slice(0, 4).trim() !== "")).toBe(true);
    expect(rest.some((r) => r[0] !== ".")).toBe(true);
    expect(parry.some((r) => r[0] !== ".")).toBe(false);
  });

  it("lays the hero down on a knock-out: wider than tall", () => {
    const ko = poseGrid("KNIGHT", 5, "ko");
    expect(ko[0].length).toBeGreaterThan(ko.length);
  });
});

describe("spriteLayers (Bottes plein écran)", () => {
  const cells = (rects: { x: number; y: number; w: number; fill: string }[]) =>
    rects.flatMap((r) => Array.from({ length: r.w }, (_, i) => `${r.x + i},${r.y},${r.fill}`)).sort();

  it("corps et arme redonnent le sprite de repos, case pour case", () => {
    for (const character of ["KNIGHT", "PANDA"] as const)
      for (const form of [1, 2, 3, 4, 5, 6] as const) {
        const l = spriteLayers(character, "BLUE", form);
        expect(cells([...l.body, ...l.weapon])).toEqual(cells(sprite(character, "BLUE", form, "normal", "rest").rects));
      }
  });

  it("isole une arme tenue à droite, avec le poing comme pivot", () => {
    const l = spriteLayers("KNIGHT", "BLUE", 4);
    expect(l.weapon.length).toBeGreaterThan(0);
    expect(l.pivot).not.toBeNull();
    expect(l.pivot!.x).toBeGreaterThan(l.width / 2);
  });

  it("n'a pas d'arme à l'évolution 1", () => {
    expect(spriteLayers("KNIGHT", "RED", 1).weapon).toEqual([]);
    expect(spriteLayers("PANDA", "RED", 1).pivot).toBeNull();
  });
});
