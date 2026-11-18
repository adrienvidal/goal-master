// Compagnons 8 bits (spec quetes), repris de la maquette validée (docs/maquettes/quetes.html).
// Chaque lettre est une couleur de COMPANION_PAL ; « . » est transparent. Indépendants du héros.
import type { CompanionId } from "@/game/quests";

export const COMPANION_PAL: Record<string, string> = {
  K: "#1a1626", E: "#1a1626", R: "#e8838a", L: "#fffbe0", Y: "#f2c14e", T: "#c99a5b", B: "#7a4a26", O: "#b9831c",
  a: "#e8873a", b: "#fbeedd", c: "#9aa0b5", d: "#6b4a2b", e: "#c98a4b", f: "#a8794a", h: "#ecd9b2", j: "#f0eef5", k: "#f3a6b5", m: "#5fbf7a", n: "#2f8a55", o: "#ffd84a",
};

export const COMPANION_GRIDS: Record<CompanionId, string[]> = {
  cat: ["..K....K......", "..KK..KK......", ".KcKKKKcK.....", ".KccccccK.....", "KcEccccEcK....", "KcccRRcccK..K.", ".KccccccK..KcK", "..KcbbcK...KcK", ".KccbbccK.KcK.", ".KccbbcccKcK..", ".KcKccKcccK...", "..KK.KK.KKK..."],
  dog: ["..KKK..KKK....", ".KdddKKdddK...", ".KddeeeeddK...", ".KdeEeeEedK...", "..KeeeeeeK....", "..KeeKKeeK..K.", "...KeRReK..KeK", "..KeeeeeeK.KeK", ".KeeebbeeeKeK.", ".KeeebbeeeeK..", ".KeeKeeKeeeK..", "..KK.KK.KKK..."],
  fox: [".K......K.....", "KaK....KaK....", "KaaKKKKaaK....", "KaaaaaaaaK....", "KaEaaaaEaK..KK", ".KbbaabbK..KaaK", "..KbbKbK..KaabK", "...KaaaK.KaabbK", "..KaabaaKaaabK.", "..KaabaaaaaaK..", "..KaaKaaKaaK...", "...KK.KK.KK...."],
  owl: [".K......K.", ".KK....KK.", "KffKKKKffK", "KfLLffLLfK", "KfLEffELfK", "KffffYffffK", "KfhhffhhfK", "KfhhhhhhfK", "KffhhhhffK", ".KffhhffK.", "..KYKKYK..", "..K....K.."],
  rabbit: ["..K...K...", ".KjK.KjK..", ".KkK.KkK..", ".KkK.KkK..", ".KjKKKjK..", "KjjjjjjjK.", "KjEjjjEjK.", "KjjjkjjjK.", ".KjjjjjK..", "KjjjjjjjKK", "KjjjjjjjKjK", ".KjKKKjKK.", "..K...K..."],
  dragon: ["...K....K.....", "..KmK..KmK....", "..KmmKKmmK....", "..KmmmmmmK....", "..KmEmmEmK....", "..KmmmmmmmK...", "...KmmRmmK....", "KK.KmooomK.KK.", "KnKmmoommmKnK.", "KnnmmoommnnK..", ".KKmmoommKK..K", "...KmmmmmKKKmK", "...KmKKmmmmmK.", "...KK.KKKKKK.."],
};

/** Coffre : fermé, puis ouvert avec sa lueur. */
export const CHEST_GRIDS: Record<"closed" | "open", string[]> = {
  closed: ["................", "................", "................", "..KKKKKKKKKKKK..", ".KBBBBBBBBBBBBK.", "KBTTTTTTTTTTTTBK", "KBTTTTTTTTTTTTBK", "KOOOOOOYYOOOOOOK", "KBBBBBKYYKBBBBBK", "KBTTTTTKKTTTTTBK", "KBTTTTTTTTTTTTBK", "KBTTTTTTTTTTTTBK", "KOOOOOOOOOOOOOOK", ".KKKKKKKKKKKKKK."],
  open: ["..KKKKKKKKKKKK..", ".KBTTTTTTTTTTBK.", "KBTTTTTTTTTTTTBK", "KOOOOOOOOOOOOOOK", ".KKKKKKKKKKKKKK.", "..L..L....L..L..", "...L..L..L..L...", "KKKKKKKKKKKKKKKK", "KLLLLLLLLLLLLLLK", "KOOOOOOYYOOOOOOK", "KBTTTTTKKTTTTTBK", "KBTTTTTTTTTTTTBK", "KOOOOOOOOOOOOOOK", ".KKKKKKKKKKKKKK."],
};

export type PixelRect = { x: number; y: number; w: number; fill: string };

/** Rectangles d'une grille, les pixels voisins de même couleur fusionnés par ligne. */
export function gridRects(grid: string[]): { width: number; height: number; rects: PixelRect[] } {
  const rects: PixelRect[] = [];
  grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let w = 1;
      while (row[x + w] === ch) w++;
      if (ch !== ".") rects.push({ x, y, w, fill: COMPANION_PAL[ch] });
      x += w;
    }
  });
  return { width: Math.max(...grid.map((r) => r.length)), height: grid.length, rects };
}
