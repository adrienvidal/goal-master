// Rendu des avatars 8 bits, porté du script des maquettes : grille de lettres → rectangles SVG.
// Humeurs (sommeil, fatigue, épuisement) et poses (repos, action, victoire) dérivées des grilles de base.
import type { Mood } from "@/game/avatar";
import type { Form } from "@/game/levels";
import type { CharacterId, ColorId } from "./onboarding";
import { ARMS, BABY, KID, KNIGHT, PAL, P_BABY, P_GAR, P_KID, P_LEG, P_NOV, P_VOY, SQUIRE } from "./spriteGrids";

export const COLOR_HEX: Record<ColorId, string> = { BLUE: "#3d7bd9", RED: "#d94848", GREEN: "#3fa55b", PURPLE: "#8a55d6", ORANGE: "#e8892e", BLACK: "#4a4a5e" };

export type Pose = "rest" | "action" | "victory" | "parry" | "potion" | "ko";
/** Poses de l'Arène : gardées même rouillé (le héros combat quand même). */
const COMBAT_POSES: Pose[] = ["parry", "potion", "ko"];
/** Couleurs propres à l'Arène : fiole rouge, contour cyan de la parade, feuille claire. */
const ARENA_PAL: Record<string, string> = { J: "#e8364a", Q: "#7fe3ff", M: "#a8e07a" };
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

/** Couronne du gagnant d'un défi (spec defi) : lettres à part, que la rouille ne touche pas. */
const CROWN_PAL: Record<string, string> = { Q: "#ffd84a", J: "#b9831c", X: "#d94848" };
const CROWN: Grid = ["Q..Q..Q", "QQ.Q.QQ", "QQQQQQQ", "QJXJXJQ"];

/** Pose la couronne juste au-dessus de la tête : la première ligne dont le contour fait au moins 4 pixels. */
export function crowned(g: Grid): Grid {
  const width = Math.max(...g.map((r) => r.length));
  let a = g.map((r) => r.padEnd(width, ".").split(""));
  let top = a.findIndex((r) => r.lastIndexOf("K") - r.indexOf("K") >= 3);
  if (top < 0) return g;
  const missing = Math.max(0, CROWN.length - top);
  if (missing > 0) {
    a = Array.from({ length: missing }, () => Array<string>(width).fill(".")).concat(a);
    top += missing;
  }
  const row = a[top];
  const center = Math.round((row.indexOf("K") + row.lastIndexOf("K")) / 2);
  const left = Math.max(0, Math.min(width - CROWN[0].length, center - Math.floor(CROWN[0].length / 2)));
  CROWN.forEach((line, dy) => [...line].forEach((c, dx) => { if (c !== ".") a[top - CROWN.length + dy][left + dx] = c; }));
  return a.map((r) => r.join(""));
}

const RUST: Record<string, string> = { P: "#7d5a45", W: "#b3a58c", G: "#7b6f5e", Y: "#a88a4a", O: "#7b6f5e" };

function colorOf(c: string, player: string, mood: Mood, x: number, y: number, character: CharacterId): string {
  if (CROWN_PAL[c]) return CROWN_PAL[c];
  const rusty = mood === "tired" || mood === "exhausted";
  if (c === "F" && mood === "tired") return "#cfcad6";
  if (c === "F" && mood === "exhausted") return "#b7b1bf";
  if (c === "V" && rusty) return "#9aa36a";
  if (c === "S" && mood === "tired") return "#dcc6b6";
  if (c === "S" && mood === "exhausted") return "#c7b0a2";
  if (c === "C" && mood === "exhausted") return "#4e3570";
  if (rusty && "PWGY".includes(c) && (x * 7 + y * 3) % 8 === 0) return character === "PANDA" ? "#2e261c" : "#a4501f";
  if (rusty && RUST[c]) return RUST[c];
  return c === "P" ? player : (PAL[c] ?? ARENA_PAL[c]);
}

const WEAPON = "WVYLB";
type Weapon = { col: number; hy: number; guard: string | null; grip: string | null; blade: string; len: number; cells: [number, number][] };

/**
 * Arme tenue à droite : colonne d'arme dans les 4 dernières colonnes, puis toute l'arme (lame, garde, poignée,
 * ornement) par remplissage depuis cette colonne. La main (`hy`) est la première case du corps collée à l'arme.
 */
function weaponOf(a: string[][]): Weapon | null {
  const w = a[0].length;
  let col = -1;
  for (let x = w - 1; x >= w - 4 && col < 0; x--) if (a.filter((r) => WEAPON.includes(r[x])).length >= 4) col = x;
  if (col < 0) return null;
  const seen = new Set<string>();
  const cells: [number, number][] = [];
  const stack: [number, number][] = [];
  a.forEach((r, y) => { if (WEAPON.includes(r[col])) stack.push([y, col]); });
  while (stack.length) {
    const [y, x] = stack.pop()!;
    const k = `${y},${x}`;
    if (seen.has(k) || y < 0 || y >= a.length || x < col - 1 || x > col + 1 || !WEAPON.includes(a[y][x])) continue;
    seen.add(k);
    cells.push([y, x]);
    stack.push([y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]);
  }
  const inWeapon = (y: number, x: number) => seen.has(`${y},${x}`);
  const colRows = cells.filter(([, x]) => x === col).map(([y]) => y).sort((p, q) => p - q);
  const hy = colRows.find((y) => a[y][col - 1] !== "." && a[y][col - 1] !== "K" && !inWeapon(y, col - 1)) ?? colRows[colRows.length - 1];
  const guardRow = colRows.find((y) => inWeapon(y, col - 1) && inWeapon(y, col + 1));
  const guard = guardRow !== undefined ? a[guardRow][col - 1] : null;
  const grip = a[hy][col] === "B" ? "B" : null;
  const bladeRows = colRows.filter((y) => y < (guardRow ?? hy) && "WVY".includes(a[y][col]));
  const counts = new Map<string, number>();
  bladeRows.forEach((y) => counts.set(a[y][col], (counts.get(a[y][col]) ?? 0) + 1));
  const blade = [...counts.entries()].sort((p, q) => q[1] - p[1])[0]?.[0] ?? (a[hy][col] || "W");
  const len = Math.max(5, Math.min(7, bladeRows.length || 6));
  return { col, hy, guard, grip, blade, len, cells };
}

/** Action : l'arme pivote autour du poing. Poignée dans la main, garde à la verticale, lame à l'horizontale. */
function pointWeapon(a: string[][], i: Weapon): Grid {
  i.cells.forEach(([y, x]) => { a[y][x] = "."; });
  let x = i.col;
  a.forEach((r) => { while (r.length < x + i.len + 3) r.push("."); });
  if (i.grip) a[i.hy][x++] = i.grip;
  if (i.guard) {
    for (const y of [i.hy - 1, i.hy, i.hy + 1]) if (a[y]) a[y][x] = i.guard;
    x++;
  }
  for (let k = 0; k < i.len; k++) a[i.hy][x + k] = i.blade;
  return a.map((r) => r.join(""));
}

/** Victoire : l'arme garde sa taille, le bras monte et la porte 4 cases plus haut. */
function raiseWeapon(a: string[][], i: Weapon): Grid {
  const lift = 4;
  const o = Array.from({ length: lift }, () => Array<string>(a[0].length).fill(".")).concat(a);
  const moved = i.cells.map(([y, x]) => [y + lift, x, a[y][x]] as const);
  moved.forEach(([y, x]) => { o[y][x] = "."; });
  moved.forEach(([y, x, c]) => { o[y - lift][x] = c; });
  const hand = i.col - 1;
  const hy = i.hy + lift;
  const fist = o[hy][hand] === "N" ? "N" : "S";
  const sleeve = fist === "N" ? "N" : "P";
  if (o[i.hy][hand] === ".") o[i.hy][hand] = fist;
  for (let y = i.hy + 1; y < hy; y++) if (o[y][hand] === ".") o[y][hand] = sleeve;
  for (let y = hy; y < hy + 2; y++) if (o[y][hand] === "S") o[y][hand] = sleeve;
  return o.map((r) => r.join(""));
}

const blankRow = (w: number): string[] => Array<string>(w).fill(".");
const widen = (a: string[][], n: number): void => a.forEach((r) => { while (r.length < n) r.push("."); });

/** Contour cyan de la Parade autour d'un ensemble de cases. */
function glow(a: string[][], cells: [number, number][]): void {
  const set = new Set(cells.map(([y, x]) => `${y},${x}`));
  for (const [y, x] of cells)
    for (const [yy, xx] of [[y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]])
      if (a[yy]?.[xx] === "." && !set.has(`${yy},${xx}`)) a[yy][xx] = "Q";
}

/** Bouclier du Chevalier : bloc à gauche du corps, jusqu'à la première colonne de contour commune. */
function shieldOf(a: string[][]): { y0: number; y1: number; sw: number; block: string[][] } | null {
  const core = a.map((r, y) => (r[0] !== "." ? y : -1)).filter((y) => y >= 0);
  if (core.length < 2) return null;
  let sw = -1;
  for (let x = 3; x <= 6 && sw < 0; x++) if (core.every((y) => a[y][x] === "K")) sw = x;
  if (sw < 0) return null;
  const has = (y: number) => (a[y] ?? []).slice(0, sw).some((c) => c !== ".");
  let y0 = core[0];
  let y1 = core[core.length - 1];
  if (has(y0 - 1)) y0--;
  if (has(y1 + 1)) y1++;
  const block: string[][] = [];
  for (let y = y0; y <= y1; y++) block.push(a[y].slice(0, sw));
  return { y0, y1, sw, block };
}

/** Parade : le Chevalier passe son propre bouclier devant lui ; le Panda moine tient son bambou en travers. */
function parryPose(a: string[][], i: Weapon, character: CharacterId): Grid {
  if (character === "PANDA") {
    i.cells.forEach(([y, x]) => { a[y][x] = "."; });
    const y = Math.min(a.length - 4, i.hy + 1);
    widen(a, i.col + 2);
    a.forEach((r) => r.unshift(".", "."));
    const w = a[0].length;
    for (let x = 0; x < w; x++) a[y][x] = i.blade;
    for (const x of [1, w - 3]) { a[y - 1][x] = "N"; a[y + 1][x] = "N"; }
    const ends: [number, number][] = [[y, 0], [y, 1], [y, w - 2], [y, w - 1]];
    glow(a, ends);
    return a.map((r) => r.join(""));
  }
  const s = shieldOf(a);
  if (!s) return a.map((r) => r.join(""));
  for (let y = s.y0; y <= s.y1; y++) {
    for (let x = 0; x < s.sw; x++) a[y][x] = ".";
    if (a[y][s.sw] !== ".") a[y][s.sw] = "K";
  }
  const top = Math.max(0, i.hy - Math.floor((s.y1 - s.y0 + 1) / 2)) + 1;
  const x0 = i.col - 1;
  widen(a, x0 + s.sw + 2);
  a.unshift(blankRow(a[0].length));
  const cells: [number, number][] = [];
  s.block.forEach((row, dy) => [...row].reverse().forEach((c, dx) => {
    if (c === ".") return;
    a[top + dy][x0 + dx] = c;
    cells.push([top + dy, x0 + dx]);
  }));
  glow(a, cells);
  return a.map((r) => r.join(""));
}

/** Potion : une fiole (bouchon, goulot, panse rouge, reflet) portée à la bouche, deux bulles au-dessus. */
const FLASK = ["..B..", ".KLK.", ".KLK.", "KJJJK", "KJLJK", "KJJJK", ".KKK."];
function potionPose(a: string[][], i: Weapon): Grid {
  i.cells.forEach(([y, x]) => { a[y][x] = "."; });
  for (let k = 0; k < 3; k++) a.unshift(blankRow(a[0].length));
  const eye = a.findIndex((r) => r.includes("E") || r.includes("I"));
  const top = Math.max(3, (eye >= 0 ? eye + 1 : Math.round(a.length * 0.3)) - 2);
  const x0 = i.col - 2;
  widen(a, x0 + 6);
  FLASK.forEach((row, dy) => [...row].forEach((c, dx) => { if (c !== ".") a[top + dy][x0 + dx] = c; }));
  for (let y = top + FLASK.length; y < i.hy + 3 && y < a.length; y++) if (a[y][x0 + 2] === ".") a[y][x0 + 2] = "P";
  a[top - 2][x0 + 3] = "Q";
  a[top - 3][x0 + 1] = "Q";
  a[top - 1][x0 + 4] = "M";
  return a.map((r) => r.join(""));
}

/** K.O. : le héros couché, yeux fermés, l'arme posée au sol. */
function koPose(a: string[][], i: Weapon | null): Grid {
  if (i) i.cells.forEach(([y, x]) => { a[y][x] = "."; });
  const h = a.length;
  const w = a[0].length;
  const lying = Array.from({ length: w }, (_, y) => Array.from({ length: h }, (_, x) => a[h - 1 - x][y])).filter((r) => r.some((c) => c !== "."));
  const ground = blankRow(h);
  if (i) {
    let x = 1;
    if (i.grip) ground[x++] = i.grip;
    if (i.guard) ground[x++] = i.guard;
    for (let k = 0; k < i.len && x < h; k++) ground[x++] = i.blade;
  }
  lying.push(ground);
  return lying.map((r) => r.join("").replace(/I/g, "N").replace(/E/g, "S"));
}

function posed(g: Grid, pose: Pose, character: CharacterId = "KNIGHT"): Grid {
  if (pose === "rest") return g;
  const width = Math.max(...g.map((r) => r.length));
  const a = g.map((r) => r.padEnd(width, ".").split(""));
  const i = weaponOf(a);
  if (pose === "ko") return koPose(a, i);
  if (!i) return g;
  switch (pose) {
    case "action":
      return pointWeapon(a, i);
    case "victory":
      return raiseWeapon(a, i);
    case "parry":
      return parryPose(a, i, character);
    case "potion":
      return potionPose(a, i);
  }
}

/** Grille d'une pose, pour les tests. */
export function poseGrid(character: CharacterId, form: Form, pose: Pose): Grid {
  return posed(GRIDS[character][form], pose, character);
}

export function sprite(character: CharacterId, color: ColorId, form: Form, mood: Mood, pose: Pose = "rest", crown = false): SpriteData {
  const tired = mood === "tired" || mood === "exhausted";
  const base = character === "KNIGHT" && tired && OPEN_HELMET[form] ? OPEN_HELMET[form]! : GRIDS[character][form];
  const faced = character === "PANDA" ? pandaFace(base, mood) : knightFace(base, mood);
  const posedGrid = posed(faced, mood === "normal" || COMBAT_POSES.includes(pose) ? pose : "rest", character);
  const g = crown ? crowned(posedGrid) : posedGrid;
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
