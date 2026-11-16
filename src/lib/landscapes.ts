// Paysages 8 bits de fond (planche validée par Adrien), dessinés au pixel sur un canevas de 192 × 108.
export const LANDSCAPES = ["CASTLE", "BAMBOO", "MOUNTAINS", "PLAINS"] as const;
export type LandscapeId = (typeof LANDSCAPES)[number];

export const LANDSCAPE_NAMES: Record<LandscapeId, string> = {
  CASTLE: "Château de nuit",
  BAMBOO: "Forêt de bambous",
  MOUNTAINS: "Montagnes à l'aube",
  PLAINS: "Plaine au donjon",
};

export const LANDSCAPE_W = 192;
export const LANDSCAPE_H = 108;
const W = LANDSCAPE_W;
const H = LANDSCAPE_H;

type Ctx = CanvasRenderingContext2D;

function rng(seed: number): () => number {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function bands(c: Ctx, colors: string[], top: number, bottom: number): void {
  const h = (bottom - top) / colors.length;
  colors.forEach((col, i) => {
    c.fillStyle = col;
    c.fillRect(0, Math.round(top + i * h), W, Math.ceil(h) + 1);
  });
}

function ridge(c: Ctx, color: string, base: number, amp: number, f1: number, f2: number, seed: number): void {
  const r = rng(seed);
  const p1 = r() * 6;
  const p2 = r() * 6;
  c.fillStyle = color;
  for (let x = 0; x < W; x++) {
    const y = Math.round(base - amp * (0.6 * Math.sin(x * f1 + p1) + 0.4 * Math.sin(x * f2 + p2)) - r() * 1.5);
    c.fillRect(x, y, 1, H - y);
  }
}

function stars(c: Ctx, n: number, seed: number, maxY: number, colors: string[]): void {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    c.fillStyle = colors[i % colors.length];
    c.fillRect(Math.floor(r() * W), Math.floor(r() * maxY), 1, 1);
  }
}

function castle(c: Ctx): void {
  bands(c, ["#0f0c22", "#141030", "#1a1540", "#221b4f", "#2b2160", "#352870"], 0, 70);
  stars(c, 70, 7, 55, ["#fffbe0", "#a39dcc", "#ffffff"]);
  c.fillStyle = "#fffbe0";
  c.fillRect(150, 12, 10, 10);
  c.fillRect(149, 14, 12, 6);
  c.fillStyle = "#e9e1b8";
  c.fillRect(153, 15, 2, 2);
  c.fillRect(156, 18, 2, 1);
  ridge(c, "#2a2358", 72, 8, 0.03, 0.07, 3);
  ridge(c, "#1f1946", 82, 6, 0.05, 0.11, 9);
  c.fillStyle = "#120f26";
  c.fillRect(40, 48, 44, 40);
  c.fillRect(34, 38, 12, 50);
  c.fillRect(78, 38, 12, 50);
  c.fillRect(56, 30, 12, 20);
  for (let x = 34; x < 90; x += 4) c.fillRect(x, 36, 2, 2);
  for (const x of [56, 60, 64, 66]) c.fillRect(x, 28, 2, 2);
  c.fillRect(61, 20, 1, 8);
  c.fillStyle = "#ff7a45";
  c.fillRect(62, 20, 4, 3);
  c.fillStyle = "#f2c14e";
  for (const [x, y] of [[38, 46], [82, 46], [60, 36], [48, 58], [72, 58], [60, 58]]) c.fillRect(x, y, 2, 3);
  c.fillStyle = "#0b0918";
  c.fillRect(58, 74, 8, 14);
  ridge(c, "#16122f", 94, 3, 0.08, 0.2, 21);
  c.fillStyle = "#100d22";
  c.fillRect(0, 100, W, 8);
}

function bamboo(c: Ctx): void {
  bands(c, ["#2a1f4a", "#4a2c5c", "#7a3d5e", "#b5545a", "#e07a4e", "#f2a65a"], 0, 76);
  c.fillStyle = "#ffd27a";
  c.fillRect(88, 40, 18, 18);
  c.fillRect(86, 43, 22, 12);
  ridge(c, "#5c3a5a", 66, 5, 0.04, 0.09, 4);
  const layer = (color: string, node: string, count: number, seed: number, w: number, top: number) => {
    const r = rng(seed);
    for (let i = 0; i < count; i++) {
      const x = Math.floor(r() * W);
      c.fillStyle = color;
      c.fillRect(x, top + Math.floor(r() * 10), w, H);
      c.fillStyle = node;
      for (let y = top + 6; y < H; y += 9 + Math.floor(r() * 4)) c.fillRect(x, y, w, 1);
      c.fillStyle = color;
      c.fillRect(x + w, top + 10 + Math.floor(r() * 30), 4, 1);
    }
  };
  layer("#3b4a3a", "#2c382c", 18, 5, 2, 18);
  c.fillStyle = "rgba(242,166,90,.2)";
  c.fillRect(0, 70, W, 10);
  layer("#2e5a36", "#1f4026", 14, 11, 3, 6);
  layer("#1c3a22", "#132a18", 9, 17, 4, 0);
  c.fillStyle = "#132a18";
  c.fillRect(0, 98, W, 10);
}

function mountains(c: Ctx): void {
  bands(c, ["#1e2a5a", "#2e3f7a", "#4a5a9a", "#8a78b0", "#d39aa8", "#f4c39a"], 0, 64);
  stars(c, 20, 13, 20, ["#ffffff", "#c9c4ee"]);
  ridge(c, "#6a6aa4", 52, 14, 0.035, 0.09, 31);
  ridge(c, "#4a4a86", 66, 12, 0.05, 0.12, 37);
  ridge(c, "#33336a", 80, 9, 0.06, 0.15, 41);
  ridge(c, "#24244e", 92, 5, 0.09, 0.2, 43);
  c.fillStyle = "#c99a5b";
  let x = 96;
  for (let y = 107; y > 84; y--) {
    c.fillRect(x, y, 3, 1);
    x += y % 6 < 3 ? 1 : -1;
  }
}

function plains(c: Ctx): void {
  bands(c, ["#3d6fd0", "#4a80dc", "#5a92e6", "#6ea5ee", "#88b9f2", "#a8cff6"], 0, 72);
  c.fillStyle = "#ffffff";
  for (const [x, y] of [[20, 14], [110, 22], [160, 10]]) {
    c.fillRect(x, y, 22, 5);
    c.fillRect(x + 4, y - 3, 12, 3);
    c.fillRect(x + 2, y + 5, 18, 2);
  }
  ridge(c, "#7fb36a", 70, 6, 0.03, 0.08, 51);
  c.fillStyle = "#5d5a73";
  c.fillRect(140, 46, 10, 26);
  c.fillRect(138, 44, 14, 3);
  for (let x = 138; x < 152; x += 3) c.fillRect(x, 42, 2, 2);
  c.fillStyle = "#d94848";
  c.fillRect(145, 34, 1, 8);
  c.fillRect(146, 34, 5, 3);
  ridge(c, "#5d9a4e", 82, 6, 0.05, 0.1, 53);
  ridge(c, "#46803c", 94, 4, 0.07, 0.17, 59);
  const r = rng(61);
  c.fillStyle = "#f2c14e";
  for (let i = 0; i < 18; i++) c.fillRect(Math.floor(r() * W), 92 + Math.floor(r() * 14), 1, 1);
  c.fillStyle = "#3a6a30";
  c.fillRect(0, 102, W, 6);
}

const DRAW: Record<LandscapeId, (c: Ctx) => void> = { CASTLE: castle, BAMBOO: bamboo, MOUNTAINS: mountains, PLAINS: plains };

export function drawLandscape(c: Ctx, id: LandscapeId): void {
  c.imageSmoothingEnabled = false;
  DRAW[id](c);
}

export function isLandscape(value: unknown): value is LandscapeId {
  return typeof value === "string" && (LANDSCAPES as readonly string[]).includes(value);
}
