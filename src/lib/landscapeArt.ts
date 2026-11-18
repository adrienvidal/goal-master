// Dessin des paysages vivants (navigateur seulement), porté de la maquette validée
// docs/maquettes/fonds-vivants.html : ses chiffres font foi.
//
// Une scène de référence de 320 × 180 est posée sur une toile à la forme de l'écran : le sol reste en bas,
// le ciel s'étend vers le haut, les collines sur les côtés ; l'élément principal se recentre s'il manque de
// place. Les couches fixes (ciel, décor) sont mises en cache par quart d'heure et par taille ; seuls les
// éléments vivants sont redessinés à chaque image.
//
// Le cadre courant (taille, partie visible, décalage du bâtiment) est tenu dans des variables du module,
// posées au début de chaque rendu : le dessin est synchrone, un rendu ne peut pas en croiser un autre.
import { heroShift, momentAt, SCENE_H as SH, SCENE_W as SW, type Grid, type LandscapeId, type Moment } from "./landscapes";

type Ctx = CanvasRenderingContext2D;
type Hs = Record<number, number>;

let W = SW;
let H = SH;
let VX0 = 0;
let VX1 = SW;
let TOP = 0;
let HX = 0;
let HERO0 = 0;
let HERO1 = 0;

const span = (): number => VX1 - VX0;
const LE = (x: number): number => VX0 + x;
const RI = (x: number): number => VX1 - x;
const inHero = (x: number, pad = 6): boolean => x >= HERO0 - pad && x <= HERO1 + pad;
const visible = (x: number, m = 0): boolean => x >= VX0 - m && x <= VX1 + m;
const tiled = (xs: number[]): number[] => xs.flatMap((x) => [x - SW, x, x + SW]).filter((x) => visible(x, 12));
const scaled = (n: number): number => Math.max(3, Math.round((n * span()) / SW));
/** Position d'origine (dans 0..320) d'un élément répété par tiled(). */
const home = (x: number): number => ((x % SW) + SW) % SW;

function rng(seed: number): () => number {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
function noise(x: number, seed: number): number {
  const v = Math.sin(x * 12.9898 + seed * 78.233) * 43758.5453;
  return v - Math.floor(v);
}
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const h2r = (h: string): number[] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const r2h = (a: number[]): string => "#" + a.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const mix = (a: string, b: string, t: number): string => { const A = h2r(a), B = h2r(b); return r2h(A.map((v, i) => v + (B[i] - v) * t)); };
const mul = (a: string, m: number): string => r2h(h2r(a).map((v) => v * m));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/* ---------- Lumière selon le moment ---------- */
type Light = { tint: string; amt: number; mult: number; rim: string; rimK: number; glow: number; stars: number };
const LIGHT: Record<Moment, Light> = {
  nuit: { tint: "#1c1c50", amt: 0.55, mult: 0.45, rim: "#9fb4ff", rimK: 0.35, glow: 1, stars: 1 },
  aube: { tint: "#7a5a9a", amt: 0.3, mult: 0.82, rim: "#ffc4a0", rimK: 0.55, glow: 0.35, stars: 0.25 },
  jour: { tint: "#ffffff", amt: 0, mult: 1, rim: "#fff6d0", rimK: 0.45, glow: 0, stars: 0 },
  crep: { tint: "#6a2a5a", amt: 0.4, mult: 0.68, rim: "#ffa055", rimK: 0.6, glow: 0.8, stars: 0.3 },
};

type Orb = { kind: "sun" | "moon"; u: number; x: number; y: number };
type Env = Light & { sky: string[]; orbs: Orb[]; L: 1 | -1; key: string };

function envFor(id: LandscapeId, hour: number): Env {
  const { hour: h, from, to, step: t } = momentAt(hour);
  const A = LIGHT[from], B = LIGHT[to], S = SCENES[id];
  const orbs = orbsFor(h, S.horizon);
  const glow = lerp(A.glow, B.glow, t);
  const main = orbs.find((o) => o.kind === (glow > 0.6 ? "moon" : "sun")) ?? orbs[0];
  return {
    sky: S.sky[from].map((c, k) => mix(c, S.sky[to][k], t)),
    tint: mix(A.tint, B.tint, t), amt: lerp(A.amt, B.amt, t), mult: lerp(A.mult, B.mult, t),
    rim: mix(A.rim, B.rim, t), rimK: lerp(A.rimK, B.rimK, t), glow, stars: lerp(A.stars, B.stars, t),
    orbs, L: main && main.x < SW / 2 ? -1 : 1,
    key: `${id}|${Math.round(h * 4)}|${W}x${H}`,
  };
}
const shade = (e: Env, base: string, depth = 0): string => { let c = mix(base, e.tint, e.amt); c = mul(c, e.mult); return depth ? mix(c, e.sky[3], depth) : c; };
const lit = (e: Env, base: string, depth = 0, k = 1): string => mix(shade(e, base, depth), e.rim, e.rimK * k * (1 - depth * 0.6));

function orbsFor(h: number, horizon: number): Orb[] {
  const out: Orb[] = [];
  const top = TOP + 24;
  const x = (u: number) => Math.round(VX0 + 20 + u * (span() - 40));
  if (h >= 6 && h <= 21) { const u = (h - 6) / 15; out.push({ kind: "sun", u, x: x(u), y: Math.round(horizon - Math.sin(Math.PI * u) * (horizon - top)) }); }
  const mh = (h - 20.5 + 24) % 24;
  if (mh <= 10) { const u = mh / 10; out.push({ kind: "moon", u, x: x(u), y: Math.round(horizon - Math.sin(Math.PI * u) * (horizon - top - 4)) }); }
  return out;
}

/* ---------- Primitives au pixel ---------- */
function disc(c: Ctx, cx: number, cy: number, r: number, col: string, maxDy = r): void {
  c.fillStyle = col;
  for (let dy = -r; dy <= Math.min(r, maxDy); dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy + r * 0.6)); c.fillRect(cx - w, cy + dy, w * 2 + 1, 1); }
}
function dither(c: Ctx, x0: number, y0: number, w: number, h: number, col: string, level: number): void {
  c.fillStyle = col;
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (BAYER[y & 3][x & 3] < level) c.fillRect(x, y, 1, 1);
}
function makeCanvas(): HTMLCanvasElement { const cv = document.createElement("canvas"); cv.width = W; cv.height = H; return cv; }
function skyImage(colors: string[], bottom: number): HTMLCanvasElement {
  const cv = makeCanvas(); const c = cv.getContext("2d")!; const img = c.createImageData(W, H); const d = img.data;
  const rgb = colors.map(h2r); const n = colors.length - 1;
  for (let y = 0; y < H; y++) {
    const p = Math.min(1, y / bottom) * n; const i = Math.min(n - 1, Math.floor(p)); const f = p - i;
    for (let x = 0; x < W; x++) {
      const col = f * 16 > BAYER[y & 3][x & 3] + 0.5 ? rgb[i + 1] : rgb[i]; const o = (y * W + x) * 4;
      d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
    }
  }
  c.putImageData(img, 0, 0);
  return cv;
}
function heights(base: number, amp: number, f1: number, f2: number, seed: number, jag = 0): Hs {
  const r = rng(seed), p1 = r() * 6, p2 = r() * 6, hs: Hs = {};
  for (let x = VX0 - 1; x <= VX1; x++) {
    let v = 0.6 * Math.sin(x * f1 + p1) + 0.4 * Math.sin(x * f2 + p2);
    if (jag) {
      const t1 = 1 - 2 * Math.abs((((x * f1 * 0.5 + p1) % 1) + 1) % 1 - 0.5);
      const t2 = 1 - 2 * Math.abs((((x * f2 * 0.5 + p2) % 1) + 1) % 1 - 0.5);
      v = lerp(v, (t1 * 0.65 + t2 * 0.35) * 2 - 1, jag);
    }
    hs[x] = Math.round(base - amp * v - noise(x, seed) * 1.2);
  }
  return hs;
}
/** Replat sous un bâtiment, raccordé en pente douce : il pose sur l'herbe au lieu de flotter. */
function plateau(hs: Hs, x0: number, x1: number, y: number, ramp = 14): Hs {
  for (let x = x0 - ramp; x < x1 + ramp; x++) {
    if (hs[x] === undefined) continue;
    const d = x < x0 ? (x0 - x) / ramp : x > x1 ? (x - x1) / ramp : 0; const w = 1 - d * d * (3 - 2 * d);
    hs[x] = Math.round(lerp(hs[x], y + ((((x % 5) + 5) % 5) === 0 ? 1 : 0), w));
  }
  return hs;
}
function ridge(c: Ctx, e: Env, hs: Hs, base: string, depth: number, rimK = 1): void {
  const body = shade(e, base, depth), rim = lit(e, base, depth, rimK);
  for (let x = VX0; x < VX1; x++) {
    c.fillStyle = body; c.fillRect(x, hs[x], 1, SH - hs[x]);
    const nb = hs[x + e.L] ?? hs[x];
    if (nb >= hs[x]) { c.fillStyle = rim; c.fillRect(x, hs[x], 1, nb - hs[x] > 1 ? 2 : 1); }
  }
}
const mist = (c: Ctx, e: Env, y: number, h: number, level = 6): void => dither(c, VX0, y, span(), h, e.sky[4], level);
const band = (c: Ctx, col: string, y: number, h: number): void => { c.fillStyle = col; c.fillRect(VX0, y, span(), h); };
function hero(c: Ctx, fn: () => void): void { c.save(); c.translate(HX, 0); fn(); c.restore(); }

/* ---------- Éléments animés partagés ---------- */
type Star = { fx: number; fy: number; p: number; big: boolean; c: string };
type Fly = { fx: number; y: number; p: number };
type Cloud = { x: number; y: number; v: number; s: number };

function drawOrbs(c: Ctx, e: Env): void {
  for (const o of e.orbs) {
    if (o.kind === "sun") {
      const col = mix("#fff3b8", "#ff8a4a", Math.min(1, (1 - Math.sin(Math.PI * o.u)) * 1.3));
      dither(c, o.x - 11, o.y - 11, 23, 23, mix(col, e.sky[2], 0.4), 3);
      disc(c, o.x, o.y, 7, col);
      disc(c, o.x - 2, o.y - 2, 3, mix(col, "#ffffff", 0.5));
    } else if (e.glow > 0.3) {
      disc(c, o.x, o.y, 6, "#f4f0d8");
      disc(c, o.x + 3, o.y - 2, 5, e.sky[1]);
      c.fillStyle = "#d8d2b0"; c.fillRect(o.x - 3, o.y + 1, 2, 2); c.fillRect(o.x - 1, o.y - 3, 1, 1);
    }
  }
}
/** Scintillement : éclat blanc, puis lavande, puis la couleur propre de l'étoile. */
function starColor(twinkle: number, own: string): string {
  if (twinkle < 3) return "#ffffff";
  if (twinkle < 8) return "#c9c4ee";
  return own;
}
function drawStars(c: Ctx, e: Env, f: number, S: Scene): void {
  if (e.stars <= 0.05) return;
  const n = Math.round(S.starList.length * e.stars);
  for (let i = 0; i < n; i++) {
    const s = S.starList[i]; const tw = (f + s.p) % 40;
    const x = Math.floor(VX0 + s.fx * span()), y = Math.round(TOP + s.fy * (S.starMaxY - TOP));
    c.fillStyle = starColor(tw, s.c);
    c.fillRect(x, y, 1, 1);
    if (s.big && tw < 3) { c.fillRect(x - 1, y, 3, 1); c.fillRect(x, y - 1, 1, 3); }
  }
  if (e.stars > 0.8) { // étoile filante
    const cyc = f % 260, k = Math.floor(f / 260);
    if (cyc < 7) {
      const r = rng(k * 7 + 3); const sx = Math.round(VX0 + 10 + r() * (span() - 50)), sy = Math.round(TOP + 8 + r() * 30);
      c.fillStyle = "#ffffff"; c.fillRect(sx + cyc * 4, sy + cyc * 2, 2, 1);
      c.fillStyle = "#a39dcc"; c.fillRect(sx + cyc * 4 - 4, sy + cyc * 2 - 2, 3, 1);
    }
  }
}
const CLOUD = [[0, 0, 6], [8, -3, 8], [17, 0, 6], [-7, 2, 4], [24, 2, 4]];
function drawClouds(c: Ctx, e: Env, f: number, S: Scene): void {
  const body = shade(e, "#eef2ff"), sh = shade(e, "#b4c0e0"), hi = mix(body, e.rim, 0.55);
  const sp = span() + 80;
  for (const cl of S.clouds) {
    const x = VX0 - 40 + Math.round(((((cl.x * span()) / SW + f * cl.v) % sp) + sp) % sp); const s = cl.s; const y = cl.y + Math.round(TOP * 0.45);
    for (const [dx, dy, r] of CLOUD) disc(c, x + dx * s, y + dy * s + 2, Math.round(r * s), sh, 3);
    for (const [dx, dy, r] of CLOUD) disc(c, x + dx * s, y + dy * s, Math.round(r * s) - 1, body, 2);
    for (const [dx, dy, r] of CLOUD) if (r > 5) disc(c, x + dx * s + e.L, y + dy * s - 2, Math.round(r * s) - 4, hi, 0);
  }
}
function flyer(c: Ctx, x: number, y: number, up: boolean, col: string): void {
  c.fillStyle = col; c.fillRect(x - 1, y, 3, 1);
  const d = up ? -1 : 1; c.fillRect(x - 2, y + d, 1, 1); c.fillRect(x + 2, y + d, 1, 1);
}
function drawBirds(c: Ctx, e: Env, f: number, y0: number): void {
  if (e.glow > 0.5) return;
  const dur = (span() + 40) / 1.1, t = f % Math.round(dur + 90); if (t > dur) return;
  const col = shade(e, "#2a2840"), y = y0 + Math.round(TOP * 0.4);
  for (let i = 0; i < 3; i++) flyer(c, Math.round(VX0 - 10 + t * 1.1 - i * 7), y + i * 3 + Math.round(Math.sin((t + i * 5) / 9) * 2), ((f >> 1) + i) % 2 === 0, col);
}
function drawBats(c: Ctx, e: Env, f: number, cx: number, cy: number): void {
  if (e.glow < 0.6) return;
  for (let i = 0; i < 3; i++) flyer(c, cx + Math.round(Math.cos(f / 14 + i * 2.1) * 30), cy + Math.round(Math.sin(f / 9 + i * 2.1) * 9), (f + i) % 2 === 0, "#0c0a18");
}
function drawFireflies(c: Ctx, e: Env, f: number, S: Scene): void {
  if (e.glow < 0.6) return;
  for (const p of S.flies) {
    if ((f + p.p) % 26 > 15) continue;
    const x = Math.round(VX0 + p.fx * span() + Math.sin(f / 11 + p.p) * 6), y = p.y + Math.round(Math.cos(f / 13 + p.p) * 4);
    c.fillStyle = "#e8ff7a"; c.fillRect(x, y, 1, 1);
    if ((f + p.p) % 26 < 4) { c.fillStyle = "#8fae3a"; c.fillRect(x - 1, y, 1, 1); c.fillRect(x + 1, y, 1, 1); c.fillRect(x, y - 1, 1, 1); c.fillRect(x, y + 1, 1, 1); }
  }
}
function drawFlag(c: Ctx, x: number, y: number, w: number, h: number, col: string, dk: string, f: number): void {
  for (let i = 0; i < w; i++) { const off = Math.round(Math.sin(i * 0.9 - f * 0.7) * (i / w) * 1.6); c.fillStyle = off < 0 ? dk : col; c.fillRect(x + i, y + off, 1, h - (i === w - 1 ? 1 : 0)); }
}
/** Fenêtres : chacune s'allume à son seuil de lumière, d'où un allumage une à une au crépuscule. */
function drawWindows(c: Ctx, e: Env, f: number, list: number[][]): void {
  list.forEach(([x, y, w, h, th], i) => {
    const on = e.glow >= th;
    const flicker = ((f >> 3) * 7 + i * 13) % 29 === 0;
    if (!on) c.fillStyle = shade(e, "#2a2a44");
    else c.fillStyle = flicker ? "#ff9f40" : "#ffd36a";
    c.fillRect(x, y, w, h);
    if (on && h > 2) { c.fillStyle = "#fff2b0"; c.fillRect(x, y, 1, 1); }
  });
}
function drawSmoke(c: Ctx, e: Env, f: number, x0: number, y0: number): void {
  for (let i = 0; i < 5; i++) {
    const age = (f * 0.5 + i * 8) % 40; const s = 1 + Math.floor(age / 13);
    c.fillStyle = mix(shade(e, "#d0d0e0"), e.sky[2], age / 40);
    c.fillRect(Math.round(x0 + Math.sin(age / 6) * 2 + age * 0.2), Math.round(y0 - age * 0.7), s, s);
  }
}
function bricks(c: Ctx, e: Env, x: number, y: number, w: number, h: number, base: string, depth: number): void {
  c.fillStyle = mix(shade(e, base, depth), "#000000", 0.18);
  for (let yy = y + 3; yy < y + h; yy += 4) for (let xx = x + ((yy >> 2) % 2) * 3; xx < x + w; xx += 7) c.fillRect(xx, yy, 2, 1);
}
/** Volume de pierre éclairé d'un côté. */
function block(c: Ctx, e: Env, x: number, y: number, w: number, h: number, base: string, depth = 0): void {
  c.fillStyle = shade(e, base, depth); c.fillRect(x, y, w, h);
  c.fillStyle = lit(e, base, depth); c.fillRect(e.L > 0 ? x + w - 2 : x, y, 2, h);
  c.fillStyle = mix(shade(e, base, depth), "#000000", 0.25); c.fillRect(e.L > 0 ? x : x + w - 1, y, 1, h);
  bricks(c, e, x, y, w, h, base, depth);
}
function crenel(c: Ctx, e: Env, x: number, y: number, w: number, base: string, depth = 0): void {
  c.fillStyle = shade(e, base, depth);
  for (let xx = x; xx < x + w; xx += 4) c.fillRect(xx, y - 3, 2, 3);
}
function cone(c: Ctx, e: Env, cx: number, y: number, r: number, h: number, col: string): void {
  for (let i = 0; i < h; i++) {
    const w = Math.round((i / h) * r);
    c.fillStyle = shade(e, col); c.fillRect(cx - w, y + i, w * 2 + 1, 1);
    c.fillStyle = lit(e, col); c.fillRect(e.L > 0 ? cx + Math.max(0, w - 1) : cx - w, y + i, Math.max(1, Math.ceil(w / 2)), 1);
  }
}
function pine(c: Ctx, e: Env, x: number, base: number, h: number, col: string, depth = 0): void {
  c.fillStyle = shade(e, "#3a2a20", depth); c.fillRect(x, base - 3, 1, 3);
  for (let i = 0; i < h; i++) {
    const w = Math.floor(((i % Math.ceil(h / 3)) + i / 3) * 0.55) + 1; const y = base - 3 - h + i;
    c.fillStyle = shade(e, col, depth); c.fillRect(x - w, y, w * 2 + 1, 1);
    c.fillStyle = lit(e, col, depth, 0.8); c.fillRect(e.L > 0 ? x + w : x - w, y, 1, 1);
  }
}
function tree(c: Ctx, e: Env, x: number, base: number, r: number, col: string): void {
  c.fillStyle = shade(e, "#5a3e28"); c.fillRect(x - 1, base - r, 2, r);
  disc(c, x, base - r - r + 2, r, shade(e, col));
  disc(c, x + e.L * Math.ceil(r / 3), base - 2 * r + 1, Math.ceil(r / 2), lit(e, col));
}
function path(c: Ctx, e: Env, x: number, y0: number, y1: number, col: string, wide = 3): void {
  let xx = x;
  for (let y = y1; y > y0; y--) {
    const w = Math.max(1, Math.round((wide * (y - y0)) / (y1 - y0)) + 1);
    c.fillStyle = shade(e, col); c.fillRect(Math.round(xx - w / 2), y, w, 1);
    xx += y % 9 < 4 ? 0.6 : -0.6;
  }
}
function stalk(c: Ctx, e: Env, x: number, top: number, w: number, base: string, depth: number, sway: ((y: number) => number) | null, seed: number): void {
  const body = shade(e, base, depth), rim = lit(e, base, depth), node = mix(body, "#000000", 0.3), leaf = shade(e, mix(base, "#6ac060", 0.3), depth);
  const r = rng(seed); const seg = 14 + Math.floor(r() * 6);
  for (let y = top; y < SH; y += 2) {
    const dx = sway ? sway(y) : 0;
    c.fillStyle = body; c.fillRect(x + dx, y, w, 2);
    if (w > 1) { c.fillStyle = rim; c.fillRect(e.L > 0 ? x + dx + w - 1 : x + dx, y, 1, 2); }
    if ((y - top) % seg === 0 && y > top) {
      c.fillStyle = node; c.fillRect(x + dx - 1, y, w + 2, 1);
      if (r() < 0.45) {
        const s = r() < 0.5 ? -1 : 1; const lx = s > 0 ? x + dx + w : x + dx - 1;
        c.fillStyle = leaf;
        for (let k = 0; k < 6; k++) c.fillRect(lx + s * k, y - Math.floor(k / 2), 1, 1 + (k > 1 && k < 4 ? 1 : 0));
      }
    }
  }
}

/* ---------- Les quatre paysages ---------- */
type Scene = {
  horizon: number;
  hero: readonly [number, number];
  sky: Record<Moment, string[]>;
  starList: Star[];
  starMaxY: number;
  flies: Fly[];
  clouds: Cloud[];
  build(c: Ctx, e: Env): void;
  anim(c: Ctx, e: Env, f: number): void;
  back(c: Ctx, e: Env, f: number): void;
};
const stars = (seed: number, n: number): Star[] => { const r = rng(seed); return Array.from({ length: n }, () => ({ fx: r(), fy: r(), p: Math.floor(r() * 40), big: r() < 0.08, c: r() < 0.5 ? "#a39dcc" : "#fffbe0" })); };
const flies = (seed: number, n: number, y0: number, y1: number): Fly[] => { const r = rng(seed); return Array.from({ length: n }, () => ({ fx: r(), y: y0 + Math.floor(r() * (y1 - y0)), p: Math.floor(r() * 26) })); };

const CASTLE: Scene = {
  horizon: 118, hero: [66, 178],
  sky: {
    nuit: ["#0b0a1f", "#12102e", "#1b1742", "#262059", "#33296e"],
    aube: ["#2a2a5e", "#5a4a86", "#a0679a", "#e08f8f", "#f6c49a"],
    jour: ["#2f5fc4", "#3f74d6", "#5a8fe4", "#7eaaee", "#b2d2f6"],
    crep: ["#1d1a4a", "#3d2a66", "#7a3a6e", "#d0595a", "#f59a52"],
  },
  starList: stars(7, 110), starMaxY: 100, flies: flies(5, 10, 140, 172),
  clouds: [{ x: 20, y: 30, v: 0.12, s: 1 }, { x: 170, y: 52, v: 0.08, s: 0.8 }, { x: 260, y: 22, v: 0.15, s: 1.2 }],
  build(c, e) {
    ridge(c, e, heights(116, 10, 0.03, 0.07, 3), "#3a5a8a", 0.6);
    mist(c, e, 112, 10, 5);
    const g = "#8a86a6";
    hero(c, () => {
      block(c, e, 84, 86, 76, 46, g, 0.1); crenel(c, e, 84, 86, 76, g, 0.1);
      block(c, e, 70, 64, 18, 68, g, 0.05); block(c, e, 156, 64, 18, 68, g, 0.05);
      cone(c, e, 78, 46, 10, 18, "#5a3a8a"); cone(c, e, 164, 46, 10, 18, "#5a3a8a");
      block(c, e, 110, 52, 24, 36, g, 0.05); crenel(c, e, 110, 52, 24, g, 0.05);
      c.fillStyle = shade(e, "#5a4a3a"); c.fillRect(121, 30, 1, 22);
      c.fillStyle = shade(e, "#14101f"); c.fillRect(114, 112, 16, 20); c.fillRect(116, 110, 12, 2);
      c.fillStyle = shade(e, "#3a3040");
      for (let x = 116; x < 128; x += 3) c.fillRect(x, 112, 1, 20);
      for (let y = 114; y < 132; y += 4) c.fillRect(114, y, 16, 1);
    });
    ridge(c, e, plateau(heights(134, 7, 0.025, 0.06, 9), 66 + HX, 178 + HX, 128), "#33603e", 0.3);
    hero(c, () => { c.fillStyle = shade(e, "#14101f"); c.fillRect(114, 127, 16, 2); path(c, e, 122, 128, 180, "#a88a60", 22); });
    const near = heights(150, 4, 0.06, 0.15, 21);
    ridge(c, e, near, "#24452c", 0);
    for (const [x, d, h] of [[LE(14), 6, 26], [LE(30), 10, 20], [LE(44), 14, 14], [RI(28), 4, 28], [RI(14), 12, 18]]) if (!inHero(x, 2)) pine(c, e, x, near[x] + d, h, "#1f4a30");
    const r = rng(77); c.fillStyle = lit(e, "#3a6a3a", 0, 0.6);
    for (let i = 0, n = scaled(40); i < n; i++) c.fillRect(Math.floor(VX0 + r() * span()), 154 + Math.floor(r() * 24), 1, 2);
    band(c, shade(e, "#162a1c"), 174, 6);
  },
  anim(c, e, f) {
    hero(c, () => {
      drawWindows(c, e, f, [[74, 72, 3, 5, 0.3], [160, 72, 3, 5, 0.5], [74, 92, 3, 5, 0.75], [160, 92, 3, 5, 0.4], [94, 98, 3, 5, 0.6], [104, 98, 3, 5, 0.9], [140, 98, 3, 5, 0.55], [150, 98, 3, 5, 0.85], [119, 62, 5, 7, 0.2], [96, 116, 3, 4, 0.95], [146, 116, 3, 4, 0.7]]);
      drawFlag(c, 122, 30, 11, 6, shade(e, "#ff7a45"), shade(e, "#c04a28"), f);
      drawSmoke(c, e, f, 150, 82);
      drawBats(c, e, f, 120, 40);
    });
    drawFireflies(c, e, f, CASTLE);
  },
  back(c, e, f) { drawBirds(c, e, f, 40); },
};

const BAMBOO: Scene = {
  horizon: 112, hero: [198, 276],
  sky: {
    nuit: ["#0c1020", "#121a30", "#18263f", "#1f3148", "#2a3e52"],
    aube: ["#2e3358", "#5b5880", "#9b7d98", "#d9a8a0", "#f5d6b0"],
    jour: ["#3d74b8", "#5a8fc8", "#86b0d6", "#b6d2dc", "#e6ecc8"],
    crep: ["#2a1f4a", "#4a2c5c", "#7a3d5e", "#b5545a", "#f2a65a"],
  },
  starList: stars(13, 80), starMaxY: 80, flies: flies(9, 14, 90, 170),
  clouds: [{ x: 60, y: 26, v: 0.07, s: 0.8 }, { x: 220, y: 40, v: 0.05, s: 0.7 }],
  build(c, e) {
    ridge(c, e, heights(104, 8, 0.02, 0.05, 4), "#5a6a8a", 0.65);
    hero(c, () => { // pagode au loin
      c.fillStyle = shade(e, "#4a3a4a", 0.5); c.fillRect(242, 78, 12, 26); c.fillRect(240, 70, 16, 4);
      for (const [y, w] of [[66, 26], [80, 30], [94, 34]]) {
        c.fillStyle = shade(e, "#3a2a3a", 0.45);
        c.fillRect(248 - w / 2, y, w, 3); c.fillRect(248 - w / 2 - 2, y - 1, 3, 2); c.fillRect(248 + w / 2 - 1, y - 1, 3, 2);
      }
      c.fillRect(247, 56, 2, 10);
    });
    mist(c, e, 100, 14, 7);
    const r = rng(5);
    for (let i = 0, n = scaled(26); i < n; i++) stalk(c, e, Math.floor(VX0 + r() * span()), 20 + Math.floor(r() * 30), 2, "#5a8a5a", 0.5, null, 100 + i);
    mist(c, e, 140, 20, 4);
    band(c, shade(e, "#2c4a2c"), 168, 12);
    c.fillStyle = shade(e, "#6a6a72");
    for (const [fx, y, w] of [[0.12, 170, 6], [0.4, 172, 4], [0.78, 169, 7]]) c.fillRect(Math.round(VX0 + fx * span()), y, w, 2);
    hero(c, () => { // lanterne de pierre
      c.fillStyle = shade(e, "#8a8690");
      c.fillRect(203, 150, 10, 3); c.fillRect(206, 153, 4, 16); c.fillRect(204, 140, 8, 10); c.fillRect(201, 136, 14, 4); c.fillRect(205, 133, 6, 3);
      c.fillStyle = lit(e, "#8a8690"); c.fillRect(e.L > 0 ? 213 : 201, 136, 2, 4);
    });
  },
  anim(c, e, f) {
    hero(c, () => drawWindows(c, e, f, [[206, 143, 4, 4, 0.3], [246, 84, 2, 3, 0.5], [250, 84, 2, 3, 0.8]]));
    const sw = (ph: number, amp: number) => { const s = Math.round(Math.sin(f / 11 + ph) * 2) / 2; return (y: number) => Math.round(s * amp * Math.pow((SH - y) / SH, 2)); };
    const r = rng(11);
    for (let i = 0, n = scaled(14); i < n; i++) { const x = Math.floor(VX0 + r() * span()), t = 6 + Math.floor(r() * 18); stalk(c, e, x, t, 3, "#3f7a46", 0.15, sw(i * 0.7, 3), 200 + i); }
    const r2 = rng(17);
    for (let i = 0, n = scaled(9); i < n; i++) {
      const x = Math.floor(VX0 + r2() * span()), t = Math.floor(r2() * 8) - 4;
      if (x > HERO0 - 6 && x < HERO0 + 20) continue; // laisse voir la lanterne
      stalk(c, e, x, t, 6, "#2a5a32", 0, sw(i * 1.3 + 2, 5), 300 + i);
    }
    c.fillStyle = shade(e, "#8ab85a");
    for (let i = 0; i < 6; i++) {
      const t = (f + i * 47) % 200; const x = Math.round(VX0 + ((i * 61) % span()) + Math.sin(t / 8) * 5 - t * 0.3);
      c.fillRect(x, TOP - 4 + Math.round((t * 0.95 * (SH - TOP)) / SH), (t >> 3) % 2 ? 2 : 1, (t >> 3) % 2 ? 1 : 2);
    }
    drawFireflies(c, e, f, BAMBOO);
  },
  back(c, e, f) { drawBirds(c, e, f, 34); },
};

const MOUNTAINS: Scene = {
  horizon: 96, hero: [208, 236],
  sky: {
    nuit: ["#0a0d24", "#10163a", "#18204f", "#222c64", "#2e3a78"],
    aube: ["#1e2a5a", "#3a4a8a", "#8a78b0", "#d39aa8", "#f4c39a"],
    jour: ["#2a64c8", "#3c7ad8", "#5c96e6", "#86b6f0", "#c4def8"],
    crep: ["#241c4c", "#4a2a6a", "#8c3c6c", "#d6605a", "#f8a860"],
  },
  starList: stars(19, 100), starMaxY: 70, flies: flies(23, 8, 150, 176),
  clouds: [{ x: 40, y: 34, v: 0.1, s: 0.9 }, { x: 200, y: 46, v: 0.07, s: 1.1 }],
  build(c, e) {
    const peaks = (hs: Hs, base: string, depth: number, snowLine: number) => {
      ridge(c, e, hs, base, depth);
      const snow = lit(e, "#eef2ff", depth, 0.8), snowSh = shade(e, "#b8c4e8", depth);
      for (let x = VX0; x < VX1; x++) {
        if (hs[x] >= snowLine) continue;
        const nb = hs[x + e.L] ?? hs[x]; const d = snowLine - hs[x];
        c.fillStyle = nb >= hs[x] ? snow : snowSh;
        c.fillRect(x, hs[x], 1, Math.min(d, 3 + ((((x * 7) % 5) + 5) % 5) + Math.floor(d / 3)));
      }
    };
    peaks(heights(78, 30, 0.035, 0.09, 31, 0.8), "#8a9ac4", 0.55, 66);
    mist(c, e, 92, 10, 5);
    peaks(heights(104, 24, 0.05, 0.12, 37, 0.7), "#6a78ac", 0.38, 90);
    mist(c, e, 118, 10, 4);
    const mid = plateau(heights(132, 12, 0.04, 0.1, 41, 0.3), 212 + HX, 234 + HX, 128, 10);
    const sizes: Record<number, number> = { 96: 11, 120: 10, 134: 8, 180: 9 };
    for (const x of tiled([96, 120, 134, 180])) if (!inHero(x, 4) && mid[x] !== undefined) pine(c, e, x, mid[x] + 3, sizes[home(x)], "#24404a", 0.18);
    hero(c, () => { // chalet posé sur son replat (y 128)
      c.fillStyle = shade(e, "#6a4a32"); c.fillRect(214, 117, 18, 13);
      for (let i = 0; i < 6; i++) { c.fillStyle = shade(e, "#7a3a2a"); c.fillRect(212 + i, 117 - i, 22 - 2 * i, 1); }
      c.fillStyle = lit(e, "#eef2ff", 0, 0.6); c.fillRect(213, 116, 20, 1);
      c.fillStyle = shade(e, "#4a3a32"); c.fillRect(226, 107, 3, 6);
    });
    ridge(c, e, mid, "#4a5a7a", 0.18);
    const near = heights(156, 5, 0.07, 0.17, 43);
    ridge(c, e, near, "#2e3a52", 0);
    for (const [x, h] of [[LE(20), 24], [LE(38), 18], [RI(50), 26], [RI(32), 20], [RI(16), 24]]) pine(c, e, x, near[x] + 4, h, "#24404a", 0);
    path(c, e, 160, near[160], 180, "#c99a5b", 14);
  },
  anim(c, e, f) {
    hero(c, () => { drawWindows(c, e, f, [[218, 121, 3, 4, 0.35], [225, 121, 3, 4, 0.7]]); drawSmoke(c, e, f, 227, 105); });
    if (e.glow < 0.5) { // aigle qui plane
      const a = f / 40;
      flyer(c, 150 + Math.round(Math.cos(a) * Math.min(40, span() / 3)), 50 + Math.round(TOP * 0.4) + Math.round(Math.sin(a) * 10), (f >> 2) % 3 === 0, shade(e, "#2a2030"));
    }
    drawFireflies(c, e, f, MOUNTAINS);
  },
  back(c, e, f) { drawBirds(c, e, f, 58); },
};

const PLAINS: Scene = {
  horizon: 120, hero: [218, 266],
  sky: {
    nuit: ["#0c0f26", "#131a3c", "#1c2752", "#263466", "#33447a"],
    aube: ["#34407a", "#6a5a92", "#b47a9a", "#ec9e8e", "#fbd2a0"],
    jour: ["#3d6fd0", "#4f85de", "#66a0ea", "#88b9f2", "#b8daf8"],
    crep: ["#22204e", "#50306c", "#9a4068", "#e46a52", "#fbb058"],
  },
  starList: stars(29, 110), starMaxY: 100, flies: flies(31, 16, 130, 176),
  clouds: [{ x: 10, y: 24, v: 0.14, s: 1.3 }, { x: 130, y: 44, v: 0.1, s: 1 }, { x: 240, y: 18, v: 0.18, s: 1.5 }, { x: 330, y: 60, v: 0.09, s: 0.8 }],
  build(c, e) {
    ridge(c, e, heights(116, 8, 0.03, 0.08, 51), "#5a8a8a", 0.6);
    mist(c, e, 112, 8, 4);
    const s = "#8a8496";
    hero(c, () => {
      block(c, e, 224, 70, 22, 58, s, 0.15); crenel(c, e, 222, 70, 26, s, 0.15);
      c.fillStyle = shade(e, s, 0.15); c.fillRect(222, 66, 26, 4);
      block(c, e, 246, 98, 16, 30, s, 0.2); crenel(c, e, 246, 98, 16, s, 0.2);
      c.fillStyle = shade(e, "#4a3a2a", 0.15); c.fillRect(234, 52, 1, 14);
      c.fillStyle = shade(e, "#1a1424", 0.15); c.fillRect(231, 116, 8, 12);
    });
    const mid = plateau(heights(130, 7, 0.022, 0.05, 53), 220 + HX, 264 + HX, 125);
    ridge(c, e, mid, "#5d9a4e", 0.25);
    hero(c, () => { c.fillStyle = shade(e, "#1a1424", 0.15); c.fillRect(231, 124, 8, 2); path(c, e, 235, 125, 180, "#c8a870", 26); });
    const radius: Record<number, number> = { 40: 7, 56: 9, 74: 6, 150: 5, 290: 8 };
    for (const x of tiled([40, 56, 74, 150, 290])) if (!inHero(x, 10) && mid[x] !== undefined) tree(c, e, x, mid[x] + 2, radius[home(x)], "#3f8a3a");
    ridge(c, e, heights(152, 4, 0.05, 0.12, 59), "#46803c", 0);
    const r = rng(61);
    for (let i = 0, n = scaled(46); i < n; i++) { c.fillStyle = shade(e, ["#f2c14e", "#ffffff", "#ff8aa0"][i % 3]); c.fillRect(Math.floor(VX0 + r() * span()), 156 + Math.floor(r() * 22), 1, 1); }
    band(c, shade(e, "#3a6a30"), 174, 6);
  },
  anim(c, e, f) {
    hero(c, () => {
      drawWindows(c, e, f, [[233, 80, 3, 5, 0.25], [233, 96, 3, 5, 0.6], [252, 106, 3, 4, 0.8]]);
      drawFlag(c, 235, 52, 10, 6, shade(e, "#d94848"), shade(e, "#902a30"), f);
    });
    const r = rng(71), col = shade(e, "#5aa04a"), hi = lit(e, "#5aa04a");
    for (let i = 0, n = scaled(34); i < n; i++) { // herbe au vent
      const x = Math.floor(VX0 + r() * span()), y = 160 + Math.floor(r() * 18), o = ((f >> 2) + i) % 3 === 0 ? 1 : 0;
      c.fillStyle = col; c.fillRect(x, y - 2, 1, 3); c.fillRect(x - 2, y - 1, 1, 2);
      c.fillStyle = hi; c.fillRect(x + o, y - 3, 1, 1); c.fillRect(x + 2, y - 1 - o, 1, 2);
    }
    drawFireflies(c, e, f, PLAINS);
  },
  back(c, e, f) { drawBirds(c, e, f, 50); },
};

const SCENES: Record<LandscapeId, Scene> = { CASTLE, BAMBOO, MOUNTAINS, PLAINS };

/* ---------- Rendu ---------- */
const cache = new Map<string, { sky: HTMLCanvasElement; fg: HTMLCanvasElement }>();

/**
 * Dessine le paysage `id` à l'heure de Paris `hour` (décimale), image `frame` de l'animation (8 par
 * seconde ; 0 pour une image figée), sur `canvas` redimensionné à `grid`.
 */
export function renderLandscape(canvas: HTMLCanvasElement, id: LandscapeId, hour: number, frame: number, grid: Pick<Grid, "w" | "h">): void {
  if (canvas.width !== grid.w) canvas.width = grid.w;
  if (canvas.height !== grid.h) canvas.height = grid.h;
  W = grid.w; H = grid.h;
  const ox = Math.round((W - SW) / 2), oy = H - SH;
  VX0 = -ox; VX1 = W - ox; TOP = -oy;
  const S = SCENES[id];
  HX = heroShift(S.hero, VX0, VX1); HERO0 = S.hero[0] + HX; HERO1 = S.hero[1] + HX;
  const e = envFor(id, hour);
  let layers = cache.get(e.key);
  if (!layers) {
    if (cache.size > 24) cache.clear();
    const fg = makeCanvas(); const fc = fg.getContext("2d")!; fc.translate(ox, oy); S.build(fc, e);
    layers = { sky: skyImage(e.sky, S.horizon + oy), fg };
    cache.set(e.key, layers);
  }
  const c = canvas.getContext("2d");
  if (!c) return;
  c.imageSmoothingEnabled = false;
  c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(layers.sky, 0, 0);
  c.setTransform(1, 0, 0, 1, ox, oy); drawOrbs(c, e); drawStars(c, e, frame, S); S.back(c, e, frame); drawClouds(c, e, frame, S);
  c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(layers.fg, 0, 0);
  c.setTransform(1, 0, 0, 1, ox, oy); S.anim(c, e, frame);
  c.setTransform(1, 0, 0, 1, 0, 0);
}
