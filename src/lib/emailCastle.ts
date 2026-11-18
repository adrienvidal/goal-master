// L'ancien Château de nuit (192 × 108, fixe), gardé pour l'en-tête des e-mails : un e-mail ne s'anime pas
// et n'a pas d'heure. Dessiné avec fillRect seulement, pour le PixelCanvas du serveur.
export const EMAIL_CASTLE_W = 192;
export const EMAIL_CASTLE_H = 108;
const W = EMAIL_CASTLE_W;
const H = EMAIL_CASTLE_H;

type Ctx = { fillStyle: string; fillRect(x: number, y: number, w: number, h: number): void };

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

export function drawEmailCastle(c: Ctx): void {
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
