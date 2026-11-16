// Pixel art en PNG côté serveur, sans dépendance : un canevas qui imite fillRect (pour réutiliser drawLandscape)
// et un encodeur PNG minimal (zlib de Node). Sert aux images des e-mails.
import { deflateSync } from "node:zlib";

export type Rgba = [number, number, number, number];

export function hexToRgba(hex: string): Rgba {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16), full.length === 8 ? parseInt(full.slice(6, 8), 16) : 255];
}

/** Canevas de pixels : sous-ensemble de CanvasRenderingContext2D (fillStyle, fillRect). */
export class PixelCanvas {
  readonly data: Uint8Array;
  fillStyle = "#000000";
  imageSmoothingEnabled = false;

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.data = new Uint8Array(width * height * 4);
  }

  fillRect(x: number, y: number, w: number, h: number): void {
    const color = hexToRgba(this.fillStyle);
    for (let j = Math.max(0, Math.floor(y)); j < Math.min(this.height, Math.floor(y + h)); j++) {
      for (let i = Math.max(0, Math.floor(x)); i < Math.min(this.width, Math.floor(x + w)); i++) this.set(i, j, color);
    }
  }

  set(x: number, y: number, [r, g, b, a]: Rgba): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height || a === 0) return;
    const o = (y * this.width + x) * 4;
    this.data.set([r, g, b, 255], o);
  }

  get(x: number, y: number): Rgba {
    const o = (y * this.width + x) * 4;
    return [this.data[o], this.data[o + 1], this.data[o + 2], this.data[o + 3]];
  }

  /** Copie une zone d'un autre canevas (recadrage). */
  blit(src: PixelCanvas, sx: number, sy: number, w: number, h: number, dx: number, dy: number): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(dx + i, dy + j, src.get(sx + i, sy + j));
  }
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, body: Uint8Array): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(body.length, 0);
  head.write(type, 4, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])), 0);
  return Buffer.concat([head, body, crc]);
}

/** PNG RGBA du canevas, chaque pixel agrandi `scale` fois (pixels nets). */
export function encodePng(canvas: PixelCanvas, scale = 1): Buffer {
  const w = canvas.width * scale;
  const h = canvas.height * scale;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    const row = y * (w * 4 + 1);
    raw[row] = 0; // filtre « aucun »
    for (let x = 0; x < w; x++) raw.set(canvas.get(Math.floor(x / scale), Math.floor(y / scale)), row + 1 + x * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // 8 bits par canal
  ihdr[9] = 6; // RGBA
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", new Uint8Array())]);
}

/** Police bitmap 5 × 7 réduite aux lettres du bandeau. */
const GLYPHS: Record<string, string[]> = {
  G: [".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".###."],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
};

/** Écrit un texte en majuscules (lettres de GLYPHS) ; rend la largeur dessinée. */
export function drawText(c: PixelCanvas, text: string, x: number, y: number, color: string, shadow?: string): number {
  let cx = x;
  for (const ch of text) {
    const glyph = GLYPHS[ch];
    if (!glyph) throw new Error(`Lettre absente de la police : ${ch}`);
    glyph.forEach((row, j) =>
      [...row].forEach((p, i) => {
        if (p !== "#") return;
        if (shadow) c.set(cx + i + 1, y + j + 1, hexToRgba(shadow));
        c.set(cx + i, y + j, hexToRgba(color));
      }),
    );
    cx += 6;
  }
  return cx - x - 1;
}
