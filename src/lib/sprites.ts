// Rendu des avatars 8 bits, porté du script des maquettes : grille de lettres → rectangles SVG.
// Humeurs (sommeil, fatigue, épuisement) et poses (repos, action, victoire) dérivées des grilles de base.
import type { Mood } from "@/game/avatar";
import type { Form } from "@/game/levels";
import type { CharacterId, ColorId } from "./onboarding";
import { ARMS, BABY, KID, KNIGHT, PAL, P_BABY, P_GAR, P_KID, P_LEG, P_NOV, P_VOY, SQUIRE } from "./spriteGrids";

export const COLOR_HEX: Record<ColorId, string> = { BLUE: "#3d7bd9", RED: "#d94848", GREEN: "#3fa55b", PURPLE: "#8a55d6", ORANGE: "#e8892e", BLACK: "#4a4a5e" };

export type Pose = "rest" | "action" | "victory";
export type Rect = { x: number; y: number; w: number; fill: string };
export type SpriteData = { width: number; height: number; scale: number; rects: Rect[] };

type Grid = string[];

function legend(src: Grid, droop: boolean): Grid {
  const plume = droop
    ? ["......................", "..........KPPP........", "........PPPPK........."]
    : ["............PPP.......", "...........PPPPK......", "..........KPPK........"];
  const g = plume.concat(src.map((r) => ".." + r + "..")).map((r) => r.split("").map((c) => (c === "W" ? "Y" : c === "G" ? "O" : c)));
  for (let y = 0; y <= 11; y++) g[y][18] = "L";
  return g.map((r) => r.join(""));
}

const padLeg = (g: Grid): Grid => ["......................", "...Y..............Y...", "........Y......Y......"].concat(g.map((r) => "." + r + "."));

const KNIGHT_OPEN: Grid = KNIGHT.slice(0, 2).concat(
  ["....KKKKKKKKKK..W.", "....KWSSSSSSGK..W.", "....KWSESSESGK..W.", "....KGSSSSSSGK..W.", "....KGSSKKSSGK..W."],
  KNIGHT.slice(7),
);

const GRIDS: Record<CharacterId, Record<Form, Grid>> = {
  KNIGHT: { 1: BABY, 2: KID, 3: SQUIRE, 4: ARMS, 5: KNIGHT, 6: legend(KNIGHT, false) },
  PANDA: { 1: P_BABY, 2: P_KID, 3: P_NOV, 4: P_VOY, 5: P_GAR, 6: padLeg(P_LEG) },
};
/** Casques fermés : la visière se relève dès la fatigue pour montrer le visage (cadrage §6.3 bis). */
const OPEN_HELMET: Partial<Record<Form, Grid>> = { 5: KNIGHT_OPEN, 6: legend(KNIGHT_OPEN, true) };
const PANDA_SCALE: Record<Form, number> = { 1: 1, 2: 1, 3: 0.8, 4: 0.92, 5: 1.06, 6: 1.2 };

function knightFace(g: Grid, mood: Mood): Grid {
  if (mood === "normal") return g;
  const a = g.map((r) => r.split(""));
  const ey = a.findIndex((r) => r.includes("E"));
  if (ey < 0) return g;
  if (mood === "sleep") {
    a[ey].forEach((c, x) => {
      if (c === "E" && a[ey][x + 1] === "S") a[ey][x + 1] = "K";
    });
    return a.map((r) => r.join(""));
  }
  a.forEach((r) => r.forEach((c, x) => { if (c === "R") r[x] = "S"; }));
  a[ey].forEach((c, x) => {
    const b = a[ey + 1];
    if (c === "E" && b && b[x] === "S") b[x] = "C";
  });
  if (mood === "exhausted") {
    for (const y of [ey + 1, ey + 2]) {
      const r = a[y];
      if (!r) continue;
      const i = r.indexOf("S");
      const j = r.lastIndexOf("S");
      if (i >= 0) r[i] = "H";
      if (j > i) r[j] = "H";
    }
  }
  return a.map((r) => r.join(""));
}

function pandaFace(g: Grid, mood: Mood): Grid {
  if (mood === "normal") return g;
  const a = g.map((r) => r.split(""));
  const eyes: [number, number][] = [];
  a.forEach((r, y) => r.forEach((c, x) => { if (c === "I") eyes.push([x, y]); }));
  if (!eyes.length) return g;
  if (mood === "sleep") {
    eyes.forEach(([x, y]) => (a[y][x] = "N"));
    return a.map((r) => r.join(""));
  }
  eyes.forEach(([x, y]) => {
    if (a[y + 1]?.[x] === "F") a[y + 1][x] = "N";
    if (mood === "exhausted" && a[y + 2]?.[x] === "F") a[y + 2][x] = "N";
  });
  if (mood === "exhausted") {
    const ey = eyes[0][1];
    for (const y of [ey + 1, ey + 2]) {
      const r = a[y];
      if (!r) continue;
      const i = r.indexOf("F");
      const j = r.lastIndexOf("F");
      if (i > 0 && r[i - 1] === "K") { r[i - 1] = "."; r[i] = "K"; }
      if (j > i && r[j + 1] === "K") { r[j + 1] = "."; r[j] = "K"; }
    }
  }
  return a.map((r) => r.join(""));
}

const RUST: Record<string, string> = { P: "#7d5a45", W: "#b3a58c", G: "#7b6f5e", Y: "#a88a4a", O: "#7b6f5e" };

function colorOf(c: string, player: string, mood: Mood, x: number, y: number, character: CharacterId): string {
  const rusty = mood === "tired" || mood === "exhausted";
  if (c === "F" && mood === "tired") return "#cfcad6";
  if (c === "F" && mood === "exhausted") return "#b7b1bf";
  if (c === "V" && rusty) return "#9aa36a";
  if (c === "S" && mood === "tired") return "#dcc6b6";
  if (c === "S" && mood === "exhausted") return "#c7b0a2";
  if (c === "C" && mood === "exhausted") return "#4e3570";
  if (rusty && "PWGY".includes(c) && (x * 7 + y * 3) % 8 === 0) return character === "PANDA" ? "#2e261c" : "#a4501f";
  if (rusty && RUST[c]) return RUST[c];
  return c === "P" ? player : PAL[c];
}

/** Colonne de l'arme tenue à droite : on la retire pour la redessiner pointée ou levée. */
function weaponColumn(g: string[][]): number {
  const w = Math.max(...g.map((r) => r.length));
  for (let x = w - 1; x >= w - 4; x--) {
    const n = g.filter((r) => "WVY".includes(r[x] ?? ".")).length;
    if (n >= 4) return x;
  }
  return -1;
}

/** Poses Action (arme pointée) et Victoire (arme levée), dérivées de la pose Repos (cadrage §6.3 sexies). */
function posed(g: Grid, pose: Pose): Grid {
  if (pose === "rest") return g;
  const a = g.map((r) => r.split(""));
  const width = Math.max(...a.map((r) => r.length));
  a.forEach((r) => { while (r.length < width) r.push("."); });
  const col = weaponColumn(a);
  if (col < 0) return g;
  const blade = a.find((r) => "WV".includes(r[col]))?.[col] ?? "W";
  const rows = a.map((r, y) => ("WVYL".includes(r[col]) ? y : -1)).filter((y) => y >= 0);
  const [top, bottom] = [rows[0], rows[rows.length - 1]];
  for (const y of rows) a[y][col] = ".";
  if (pose === "action") {
    const y = Math.min(bottom, top + Math.floor((bottom - top) / 2) + 1);
    a.forEach((r) => r.push(".", ".", ".", ".", ".", "."));
    a[y][col] = "Y";
    for (let x = col + 1; x < col + 7; x++) a[y][x] = blade;
    return a.map((r) => r.join(""));
  }
  const lift = 4;
  const out = Array.from({ length: lift }, () => Array<string>(width).fill(".")).concat(a);
  for (let y = 0; y < bottom - top + 1; y++) out[y][col] = blade;
  out[bottom - top + 1][col] = "Y";
  return out.map((r) => r.join(""));
}

export function sprite(character: CharacterId, color: ColorId, form: Form, mood: Mood, pose: Pose = "rest"): SpriteData {
  const tired = mood === "tired" || mood === "exhausted";
  const base = character === "KNIGHT" && tired && OPEN_HELMET[form] ? OPEN_HELMET[form]! : GRIDS[character][form];
  const faced = character === "PANDA" ? pandaFace(base, mood) : knightFace(base, mood);
  const g = posed(faced, mood === "normal" ? pose : "rest");
  const player = COLOR_HEX[color];
  const rects: Rect[] = [];
  g.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (row[x] === ".") { x++; continue; }
      const fill = colorOf(row[x], player, mood, x, y, character);
      let e = x + 1;
      while (e < row.length && row[e] !== "." && colorOf(row[e], player, mood, e, y, character) === fill) e++;
      rects.push({ x, y, w: e - x, fill });
      x = e;
    }
  });
  return {
    width: Math.max(...g.map((r) => r.length)),
    height: g.length,
    scale: character === "PANDA" ? PANDA_SCALE[form] : 1,
    rects,
  };
}
