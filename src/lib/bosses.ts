// Boss du duel, en pixels 8 bits (maquettes docs/maquettes/decor-et-duel.html). Un caractère = un pixel, « . » = vide.
import type { BossIndex } from "@/game/duel";
import type { Rect } from "./sprites";

type Grid = { rows: string[]; palette: Record<string, string> };

const GRIDS: Record<BossIndex, Grid> = {
  // Le Recruteur fantôme : un spectre en cravate.
  0: {
    rows: ["......WWWW......", "....WWWWWWWW....", "...WWWWWWWWWW...", "..WWWWWWWWWWWW..", "..WWEEWWWWEEWW..", ".WWWEEWWWWEEWWW.", ".WWWWWWWWWWWWWW.", ".WWWWWMMMMWWWWW.", ".WWWWWWRRWWWWWW.", ".WWWWWWRRWWWWWS.", ".WWWWWRRRRWWWWS.", ".SWWWWWRRWWWWWS.", ".SWWWWWWWWWWWSS.", ".SS.WWS..SWW.SS.", ".S...S....S...S."],
    palette: { W: "#e4defd", S: "#9a93d6", E: "#16132a", M: "#16132a", R: "#d94848" },
  },
  // Le Golem ATS : un bloc de pierre au visage d'écran.
  1: {
    rows: ["....SSSSSSSS....", "...SGGGGGGGGS...", "...SGKKKKKKGS...", "...SGKEKKEKGS...", "...SGKKKKKKGS...", "...SGKEEEEKGS...", "...SGGGGGGGGS...", ".SSSGGGGGGGGSSS.", "SGGSGGGRRGGGSGGS", "SGGSGGGRRGGGSGGS", "SGGSGGGGGGGGSGGS", "SSS.SGGGGGGS.SSS", "....SGGSSGGS....", "....SGGSSGGS....", "...SSSS..SSSS..."],
    palette: { G: "#8b8fa8", S: "#4b4e66", K: "#16132a", E: "#6fd49a", R: "#ff6b6b" },
  },
  // La Pile de refus : une liasse de lettres tamponnée d'une croix.
  2: {
    rows: ["....PPPPPPPP....", "...PWWWWWWWWP...", "..PWWWWWWWWWWP..", "..PWLLLLLLLLWP..", "..PWWWWWWWWWWP..", "..PWEEWWWWEEWP..", "..PWEEWWWWEEWP..", "..PWWWWWWWWWWP..", "..PWLLLLRWRLWP..", "..PWWWWWWRWWWP..", "..PWLLLLRWRLWP..", ".PPWWWWWWWWWWPP.", "PWWWWWWWWWWWWWWP", "PWLLLLLLLLLLLLWP", "PPPPPPPPPPPPPPPP"],
    palette: { W: "#f4f0e6", P: "#9a8f78", L: "#c9c2b0", E: "#16132a", R: "#d94848" },
  },
  // Le Silence radio : une chauve-souris qui ne répond jamais.
  3: {
    rows: ["S..............S", "SS....S..S....SS", "SBS...SBBS...SBS", "SBBS..SBBS..SBBS", "SBBBSSBBBBSSBBBS", "SBBBBBBBBBBBBBBS", "SBBBBBYBBYBBBBBS", ".SBBBBBBBBBBBBS.", ".SBBBBWBBWBBBBS.", "..SBBSBBBBSBBS..", "...SS.SBBS.SS...", "......SBBS......", ".......SS......."],
    palette: { B: "#5b5394", S: "#2a2550", Y: "#f2c14e", W: "#f4f0e6" },
  },
};

export function bossSprite(boss: BossIndex): { width: number; height: number; rects: Rect[] } {
  const { rows, palette } = GRIDS[boss];
  const rects: Rect[] = [];
  rows.forEach((row, y) => {
    [...row].forEach((c, x) => {
      if (palette[c]) rects.push({ x, y, w: 1, fill: palette[c] });
    });
  });
  return { width: rows[0].length, height: rows.length, rects };
}
