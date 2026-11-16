// Images des e-mails en pixel art : bandeau « GOAL MASTER » et scène de l'événement (sprites de l'app).
import type { BossIndex } from "@/game/duel";
import type { Form } from "@/game/levels";
import { bossSprite } from "./bosses";
import { drawLandscape, LANDSCAPE_W } from "./landscapes";
import { CHARACTERS, COLORS, type CharacterId, type ColorId } from "./onboarding";
import { drawText, encodePng, hexToRgba, PixelCanvas, type Rgba } from "./pixelPng";
import { sprite, type Pose } from "./sprites";
import { SWORD_ICON, SWORD_PALETTE } from "./swordIcon";

/** Agrandissement des PNG : l'e-mail les affiche à mi-taille pour des pixels nets sur écran dense. */
export const EMAIL_PNG_SCALE = 4;

const STONE = "#221e40";
const GROUND = "#2e2958";
const HEADER_H = 40;

export function headerPng(): Buffer {
  const land = new PixelCanvas(LANDSCAPE_W, 108);
  // Dans l'app, le bas du ciel laissé vide montre le fond de page : on le peint en nuit.
  land.fillStyle = "#16132a";
  land.fillRect(0, 0, LANDSCAPE_W, 108);
  drawLandscape(land as unknown as CanvasRenderingContext2D, "CASTLE");
  const c = new PixelCanvas(LANDSCAPE_W, HEADER_H);
  // Haut du paysage : tours et drapeau à gauche, lune à droite ; épée et titre sous la lune.
  c.blit(land, 0, 8, LANDSCAPE_W, HEADER_H, 0, 0);
  SWORD_ICON.forEach((row, y) => [...row].forEach((ch, x) => ch !== "." && c.set(99 + x, 13 + y, hexToRgba(SWORD_PALETTE[ch]))));
  drawText(c, "GOAL MASTER", 119, 19, "#f2c14e", "#0c0a1a");
  return encodePng(c, EMAIL_PNG_SCALE);
}

export type Actor =
  | { type: "hero"; character: CharacterId; color: ColorId; form: Form; pose: Pose; effect: "none" | "rust" | "hurt" }
  | { type: "boss"; boss: BossIndex; down: boolean };

const POSES = ["rest", "action", "victory"] as const;

/** Jetons d'URL : `hero.PANDA.GREEN.4.victory[.rust|.hurt]`, `boss.1[.down]`, séparés par des virgules (3 au plus). */
export function parseScene(param: string | null): Actor[] | null {
  if (!param) return null;
  const tokens = param.split(",");
  if (tokens.length === 0 || tokens.length > 3) return null;
  const actors: Actor[] = [];
  for (const t of tokens) {
    const [type, ...rest] = t.split(".");
    if (type === "hero") {
      const [character, color, form, pose, effect = "none"] = rest;
      const f = Number(form);
      if (!(CHARACTERS as readonly string[]).includes(character) || !(COLORS as readonly string[]).includes(color)) return null;
      if (!Number.isInteger(f) || f < 1 || f > 6 || !(POSES as readonly string[]).includes(pose) || !["none", "rust", "hurt"].includes(effect) || rest.length > 5) return null;
      actors.push({ type: "hero", character: character as CharacterId, color: color as ColorId, form: f as Form, pose: pose as Pose, effect: effect as "none" | "rust" | "hurt" });
    } else if (type === "boss") {
      const [n, down] = rest;
      const b = Number(n);
      if (!Number.isInteger(b) || b < 0 || b > 3 || (down !== undefined && down !== "down") || rest.length > 2) return null;
      actors.push({ type: "boss", boss: b as BossIndex, down: down === "down" });
    } else return null;
  }
  return actors;
}

export function sceneToken(a: Actor): string {
  if (a.type === "boss") return `boss.${a.boss}${a.down ? ".down" : ""}`;
  return `hero.${a.character}.${a.color}.${a.form}.${a.pose}${a.effect === "none" ? "" : `.${a.effect}`}`;
}

type Pixels = { width: number; height: number; pixels: { x: number; y: number; color: Rgba }[] };

/** Blessé : comme le filtre CSS `.hurt` (saturation 0,5, luminosité 0,9). Vaincu : en gris. */
function tint([r, g, b, a]: Rgba, mode: "hurt" | "down"): Rgba {
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const k = mode === "down" ? 0 : 0.5;
  const f = mode === "down" ? 0.8 : 0.9;
  const mix = (v: number) => Math.round(Math.min(255, (l + (v - l) * k) * f));
  return [mix(r), mix(g), mix(b), a];
}

/** Pixels d'image par case de sprite (le chevalier) ; l'e-mail affiche l'image à mi-taille. */
const CELL = 4;

function block(out: Pixels["pixels"], x: number, y: number, w: number, h: number, color: Rgba): void {
  for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) out.push({ x: x + i, y: y + j, color });
}

function actorPixels(a: Actor): Pixels {
  const pixels: Pixels["pixels"] = [];
  if (a.type === "boss") {
    const s = bossSprite(a.boss);
    for (const r of s.rects) block(pixels, r.x * CELL, r.y * CELL, CELL, CELL, a.down ? tint(hexToRgba(r.fill), "down") : hexToRgba(r.fill));
    return { width: s.width * CELL, height: s.height * CELL, pixels };
  }
  // La rouille est la palette « fatiguée » des sprites, celle que l'app affiche.
  const s = sprite(a.character, a.color, a.form, a.effect === "rust" ? "tired" : "normal", a.effect === "rust" ? "rest" : a.pose);
  // Le panda a une échelle fractionnaire (même taille que le chevalier) : une case = un bloc entier arrondi.
  const k = Math.max(1, Math.round(CELL * s.scale));
  for (const r of s.rects) block(pixels, r.x * k, r.y * k, r.w * k, k, a.effect === "hurt" ? tint(hexToRgba(r.fill), "hurt") : hexToRgba(r.fill));
  return { width: s.width * k, height: s.height * k, pixels };
}

/** Scène : les acteurs côte à côte, posés sur une bande de sol, fond pierre. */
export function scenePng(actors: Actor[]): Buffer {
  const parts = actors.map(actorPixels);
  const gap = 6 * CELL;
  const pad = 6 * CELL;
  const width = parts.reduce((s, p) => s + p.width, 0) + gap * (parts.length - 1) + pad * 2;
  const height = Math.max(...parts.map((p) => p.height)) + pad * 2;
  const c = new PixelCanvas(width, height);
  c.fillStyle = STONE;
  c.fillRect(0, 0, width, height);
  c.fillStyle = GROUND;
  c.fillRect(0, height - pad + CELL, width, pad);
  let x = pad;
  for (const p of parts) {
    const top = height - pad - p.height + CELL;
    for (const px of p.pixels) c.set(x + px.x, top + px.y, px.color);
    x += p.width + gap;
  }
  return encodePng(c);
}

/** Taille d'affichage (moitié de l'image) d'un PNG produit ici. */
export function pngDisplaySize(png: Buffer): { width: number; height: number } {
  return { width: png.readUInt32BE(16) / 2, height: png.readUInt32BE(20) / 2 };
}
