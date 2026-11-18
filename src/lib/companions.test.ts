import { expect, test } from "vitest";
import { COMPANION_IDS, COMPANION_NAMES } from "@/game/quests";
import { CHEST_GRIDS, COMPANION_GRIDS, COMPANION_PAL, gridRects } from "./companions";

test("chaque compagnon a une grille aux couleurs connues et un nom", () => {
  for (const id of COMPANION_IDS) {
    expect(COMPANION_NAMES[id].name).toBeTruthy();
    for (const row of COMPANION_GRIDS[id]) for (const ch of row) expect(ch === "." || ch in COMPANION_PAL).toBe(true);
  }
  for (const grid of Object.values(CHEST_GRIDS)) for (const row of grid) for (const ch of row) expect(ch === "." || ch in COMPANION_PAL).toBe(true);
});

test("gridRects fusionne les pixels voisins et ignore le transparent", () => {
  expect(gridRects(["KK.a"]).rects).toEqual([
    { x: 0, y: 0, w: 2, fill: COMPANION_PAL.K },
    { x: 3, y: 0, w: 1, fill: COMPANION_PAL.a },
  ]);
  expect(gridRects(["K", "KKK"]).width).toBe(3);
});
