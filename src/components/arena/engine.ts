// Moteur des combats en canvas (boss final, attaque ultime) : porté des maquettes
// docs/maquettes/boss-final-duo.html et boss-ultime-ko.html. Côté client uniquement.
// Règles de « game feel » : arrêt sur image en temps réel, secousse en sinus qui décroît,
// un seul flash franc par impact majeur.
import type { BossIndex } from "@/game/duel";
import type { Form } from "@/game/levels";
import { bossSprite } from "@/lib/bosses";
import type { CharacterId, ColorId } from "@/lib/onboarding";
import { sprite, type Pose } from "@/lib/sprites";

export const W = 384;
export const H = 216;
export const GROUND = 178;

export const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);
export const easeIn = (t: number): number => t * t;

/** Interrompu par « Passer » ou le démontage : le script s'arrête là. */
export class Cancelled extends Error {}

type Img = { c: HTMLCanvasElement; white: HTMLCanvasElement; w: number; h: number; rects: { x: number; y: number; w: number; fill: string }[] };

function render(data: { width: number; height: number; rects: { x: number; y: number; w: number; fill: string }[] }): Img {
  const c = document.createElement("canvas");
  c.width = data.width;
  c.height = data.height;
  const g = c.getContext("2d")!;
  for (const r of data.rects) {
    g.fillStyle = r.fill;
    g.fillRect(r.x, r.y, r.w, 1);
  }
  const white = document.createElement("canvas");
  white.width = data.width;
  white.height = data.height;
  const gw = white.getContext("2d")!;
  gw.drawImage(c, 0, 0);
  gw.globalCompositeOperation = "source-in";
  gw.fillStyle = "#fff";
  gw.fillRect(0, 0, data.width, data.height);
  return { c, white, w: data.width, h: data.height, rects: data.rects };
}

export type Tint = { light: string; text: string; bar: string };
const BLUE_TINT: Tint = { light: "#cfe0ff", text: "#9fc3ff", bar: "#3d7bd9" };
const RED_TINT: Tint = { light: "#ffd0d0", text: "#ff9f9f", bar: "#d94848" };
/** Les deux héros se distinguent toujours : bleu et rouge, le rouge pour qui porte une couleur chaude. */
export function pairTints(me: ColorId): [Tint, Tint] {
  return me === "RED" || me === "ORANGE" ? [RED_TINT, BLUE_TINT] : [BLUE_TINT, RED_TINT];
}

export type HeroPose ="rest" | "act" | "win" | "parry" | "ko" | "tired";
export type HeroLook = { character: CharacterId; color: ColorId; form: Form };
type HeroSet = Record<HeroPose, Img>;

function heroSet(look: HeroLook): HeroSet {
  const p = (pose: Pose, mood: "normal" | "tired" = "normal"): Img => render(sprite(look.character, look.color, look.form, mood, pose));
  return { rest: p("rest"), act: p("action"), win: p("victory"), parry: p("parry"), ko: p("ko"), tired: p("rest", "tired") };
}

export type Hero = {
  set: HeroSet;
  x: number;
  y: number;
  pose: HeroPose;
  flip: boolean;
  a: number;
  vis: boolean;
  trail: { x: number; y: number; a: number }[];
  aura: number;
  rot: number;
  sx: number;
  sy: number;
  hurt: boolean;
  /** Couleurs du héros pour ses coups et son chiffre. */
  tint: [string, string];
};

export type Boss = { img: Img; index: BossIndex; x: number; y: number; sc: number; a: number; rot: number; ox: number; vis: boolean; flash: number; dazed: number; split: number; cut: number; cut2: number };

type Particle = { x: number; y: number; vx: number; vy: number; gr: number; life: number; col: string; s: number; floor?: boolean; coin?: boolean; arc?: { r: number; a0: number; a1: number; max: number } };
type Text = { s: string; x: number; y: number; life: number; life0: number; col: string; size: number };
type Ring = { x: number; y: number; r: number; v: number; life: number; max: number; col: string };
type Fx = { t0: number; dur: number; keep?: boolean; draw: (g: CanvasRenderingContext2D, k: number) => void };
type Wait = { t: number; res: () => void; rej: (e: Error) => void };
type Tween = { set: (k: number) => void; t0: number; ms: number; res: () => void };

/* ---------- Décor : château de nuit ---------- */
function backdrop(): { c: HTMLCanvasElement; stars: [number, number, number][] } {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  ["#0b0918", "#100d22", "#16122d", "#1d1838", "#251e45", "#2e2552"].forEach((col, i) => {
    g.fillStyle = col;
    g.fillRect(0, i * 26, W, 26);
  });
  g.fillStyle = "#2e2552";
  g.fillRect(0, 156, W, 60);
  g.fillStyle = "#f6efd0";
  g.beginPath();
  g.arc(300, 40, 16, 0, 7);
  g.fill();
  g.fillStyle = "#e3d9b0";
  g.fillRect(292, 34, 4, 4);
  g.fillRect(304, 44, 5, 3);
  g.fillStyle = "#231c40";
  for (let x = 0; x < W; x++) {
    const h = 40 + Math.sin(x / 31) * 14 + Math.sin(x / 9) * 4;
    g.fillRect(x, 150 - h, 1, h + 10);
  }
  g.fillStyle = "#1a1530";
  g.fillRect(40, 92, 80, 70);
  g.fillRect(30, 70, 18, 92);
  g.fillRect(112, 70, 18, 92);
  g.fillRect(70, 60, 20, 40);
  for (let x = 30; x < 130; x += 6) g.fillRect(x, 66, 3, 4);
  g.fillRect(74, 50, 12, 10);
  g.fillRect(79, 40, 2, 10);
  g.fillStyle = "#f2c14e";
  [[36, 82], [118, 82], [78, 72], [56, 110], [96, 110], [76, 124]].forEach(([x, y]) => g.fillRect(x, y, 3, 4));
  g.fillStyle = "#17122b";
  for (let x = 0; x < W; x++) {
    const h = 22 + Math.sin(x / 47 + 2) * 8;
    g.fillRect(x, GROUND - h, 1, h);
  }
  g.fillStyle = "#2a2346";
  g.fillRect(0, GROUND, W, H - GROUND);
  g.fillStyle = "#3a3160";
  g.fillRect(0, GROUND, W, 2);
  g.fillStyle = "#211b3a";
  for (let y = GROUND + 8; y < H; y += 9) for (let x = ((y / 9) % 2) * 10; x < W; x += 20) g.fillRect(x, y, 18, 1);
  let seed = 7;
  const rnd = (): number => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const stars = Array.from({ length: 70 }, (): [number, number, number] => [Math.floor(rnd() * W), Math.floor(rnd() * 120), rnd()]);
  return { c, stars };
}

export type ArenaSetup = { canvas: HTMLCanvasElement; me: HeroLook; partner: HeroLook | null; boss: BossIndex };

export class Arena {
  readonly g: CanvasRenderingContext2D;
  readonly hero: Hero;
  readonly mate: Hero;
  readonly b: Boss;
  now = 0;
  timeScale = 1;
  freeze = 0;
  shake = 0;
  flash = 0;
  flashCol = "#fff";
  dark = 0;
  gray = 0;
  bars = 0;
  rays = 0;
  cracks = 0;
  cracksAt = 0;
  zoom = 1;
  zx = W / 2;
  zy = H / 2;
  bossAura = 0;
  label = "";
  labelT = 0;
  banner: { s: string; sub: string; a: number; col: string } | null = null;
  parts: Particle[] = [];
  texts: Text[] = [];
  rings: Ring[] = [];
  fx: Fx[] = [];
  private waits: Wait[] = [];
  private tweens: Tween[] = [];
  private bg = backdrop();
  private rt = 0;
  private last = 0;
  private frame = 0;
  private stopped = false;
  readonly fontFamily: string;

  constructor(setup: ArenaSetup) {
    this.g = setup.canvas.getContext("2d")!;
    this.g.imageSmoothingEnabled = false;
    const [tMe, tMate] = pairTints(setup.me.color);
    const mk = (look: HeroLook, x: number, flip: boolean, tint: Tint): Hero => ({ set: heroSet(look), x, y: GROUND, pose: "rest", flip, a: 1, vis: true, trail: [], aura: 0, rot: 0, sx: 1, sy: 1, hurt: false, tint: [tint.light, tint.text] });
    this.hero = mk(setup.me, 90, false, tMe);
    this.mate = mk(setup.partner ?? setup.me, 278, true, tMate);
    this.mate.vis = setup.partner !== null;
    this.b = { img: render(bossSprite(setup.boss)), index: setup.boss, x: 200, y: GROUND, sc: 4, a: 1, rot: 0, ox: 0, vis: true, flash: 0, dazed: 0, split: 0, cut: 0, cut2: 0 };
    const css = getComputedStyle(setup.canvas).getPropertyValue("--font-press-start").trim();
    this.fontFamily = `${css || "'Press Start 2P'"}, ui-monospace, monospace`;
    this.frame = requestAnimationFrame(this.loop);
  }

  /* ---------- temps ---------- */
  wait(ms: number): Promise<void> {
    if (this.stopped) return Promise.reject(new Cancelled());
    return new Promise((res, rej) => this.waits.push({ t: this.now + ms, res, rej }));
  }
  tween<T extends object>(o: T, props: Partial<Record<keyof T, number>>, ms: number, ease: (t: number) => number = (t) => t): Promise<void> {
    if (this.stopped) return Promise.reject(new Cancelled());
    const rec = o as Record<string, number>;
    const from: Record<string, number> = {};
    for (const k in props) from[k] = rec[k];
    return new Promise((res) =>
      this.tweens.push({
        t0: this.now,
        ms,
        res,
        set: (k) => {
          const e = ease(k);
          for (const p in props) rec[p] = from[p] + ((props as Record<string, number>)[p] - from[p]) * e;
        },
      }),
    );
  }
  anim(ms: number, fn: (t: number) => void, ease: (t: number) => number = (t) => t): Promise<void> {
    if (this.stopped) return Promise.reject(new Cancelled());
    return new Promise((res) => this.tweens.push({ t0: this.now, ms, res, set: (k) => fn(ease(k)) }));
  }
  /** Coupe le script en cours (« Passer », démontage) : ses attentes échouent, ses tweens s'arrêtent. */
  cancel(): void {
    this.stopped = true;
    const ws = this.waits;
    this.waits = [];
    this.tweens = [];
    ws.forEach((w) => w.rej(new Cancelled()));
  }
  destroy(): void {
    this.cancel();
    cancelAnimationFrame(this.frame);
  }

  private loop = (ts: number): void => {
    const dt = Math.min(50, ts - (this.last || ts));
    this.last = ts;
    this.rt += dt;
    if (this.freeze > 0) this.freeze = Math.max(0, this.freeze - dt);
    else {
      this.now += dt * this.timeScale;
      this.waits = this.waits.filter((w) => (this.now >= w.t ? (w.res(), false) : true));
      this.tweens = this.tweens.filter((tw) => {
        const k = Math.min(1, (this.now - tw.t0) / tw.ms);
        tw.set(k);
        if (k >= 1) {
          tw.res();
          return false;
        }
        return true;
      });
    }
    const f = dt / 16.7;
    if (this.freeze > 0) this.shake *= Math.pow(0.9, f);
    else this.step(f);
    this.draw();
    this.frame = requestAnimationFrame(this.loop);
  };

  private step(f: number): void {
    this.shake *= Math.pow(0.86, f);
    this.flash *= Math.pow(0.85, f);
    this.b.flash *= Math.pow(0.8, f);
    if (this.labelT > 0) this.labelT -= f;
    for (const p of this.parts) {
      p.x += p.vx * f;
      p.y += p.vy * f;
      p.vy += p.gr * f;
      p.life -= f;
      if (p.floor && p.y > GROUND) {
        p.y = GROUND;
        p.vy *= -0.4;
        p.vx *= 0.7;
      }
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const t of this.texts) {
      t.y -= 0.5 * f;
      t.life -= f;
    }
    this.texts = this.texts.filter((t) => t.life > 0);
    for (const r of this.rings) {
      r.r += r.v * f;
      r.life -= f;
    }
    this.rings = this.rings.filter((r) => r.life > 0);
    for (const h of [this.hero, this.mate]) {
      h.trail.forEach((t) => (t.a -= 0.06 * f));
      h.trail = h.trail.filter((t) => t.a > 0);
      if (h.aura > 0 && Math.random() < h.aura * f) this.parts.push({ x: h.x + Math.random() * 30, y: GROUND - Math.random() * 6, vx: 0, vy: -1 - Math.random() * 1.5, gr: 0, life: 40, col: Math.random() < 0.5 ? "#f2c14e" : "#fff6c8", s: 2 });
    }
    if (this.bossAura > 0 && this.b.vis && Math.random() < this.bossAura * 0.8) this.parts.push({ x: this.b.x + (Math.random() - 0.5) * 60, y: GROUND - 4, vx: (Math.random() - 0.5) * 0.4, vy: -1.2 - Math.random() * 1.6, gr: 0, life: 26, col: Math.random() < 0.5 ? "#ff3b3b" : "#ff7a45", s: 2 });
  }

  /* ---------- effets ---------- */
  burst(x: number, y: number, n: number, cols: string[], sp = 3, up = 0): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = Math.random() * sp;
      this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - up, gr: 0.15, life: 20 + Math.random() * 25, col: cols[i % cols.length], s: 2 });
    }
  }
  dust(x: number, n = 10): void {
    for (let i = 0; i < n; i++) this.parts.push({ x: x + Math.random() * 16 - 8, y: GROUND - 1, vx: (Math.random() - 0.5) * 2.5, vy: -Math.random() * 1.2, gr: 0.03, life: 25, col: "#5b5288", s: 3 });
  }
  slash(x: number, y: number, r: number, a0: number, a1: number, col = "#fff"): void {
    this.parts.push({ x, y, vx: 0, vy: 0, gr: 0, life: 10, col, s: 0, arc: { r, a0, a1, max: 10 } });
  }
  ring(x: number, y: number, col: string, v = 4, life = 22): void {
    this.rings.push({ x, y, r: 4, v, life, max: life, col });
  }
  text(s: string, x: number, y: number, col: string, size: number, life = 46): void {
    this.texts.push({ s, x, y, life, life0: life, col, size });
  }
  shatter(): void {
    const b = this.b;
    const sc = b.sc;
    const bx = b.x - (b.img.w * sc) / 2;
    const by = b.y - b.img.h * sc;
    for (const r of b.img.rects)
      for (let i = 0; i < r.w; i++) {
        const px = bx + (r.x + i) * sc;
        const py = by + r.y * sc;
        const a = Math.atan2(py - (by + (b.img.h * sc) / 2), px - b.x);
        this.parts.push({ x: px, y: py, vx: Math.cos(a) * (2 + Math.random() * 4), vy: Math.sin(a) * (2 + Math.random() * 4) - 2, gr: 0.18, life: 60 + Math.random() * 40, col: r.fill, s: sc, floor: true });
      }
    b.vis = false;
  }
  coins(n = 60): void {
    for (let i = 0; i < n; i++) this.parts.push({ x: Math.random() * W, y: -Math.random() * 120, vx: 0, vy: 1 + Math.random() * 2, gr: 0.05, life: 160, col: i % 3 ? "#f2c14e" : "#fff6c8", s: 3, floor: true, coin: true });
  }
  /** Héros posé au sol : écrasement puis retour (squash and stretch). */
  land(h: Hero): void {
    h.y = GROUND;
    h.rot = 0;
    h.sy = 0.72;
    h.sx = 1.25;
    this.dust(h.x + 16, 6);
    void this.tween(h, { sy: 1, sx: 1 }, 170, easeOut).catch(() => undefined);
  }
  async hop(h: Hero, x: number, peak: number, ms: number, spin = 0): Promise<void> {
    const x0 = h.x;
    this.dust(h.x + 16, 5);
    await this.anim(ms, (t) => {
      h.x = x0 + (x - x0) * t;
      h.y = GROUND - Math.sin(t * Math.PI) * peak;
      h.rot = spin * t * Math.PI * 2;
      h.sy = 1 + 0.2 * (1 - t);
      h.sx = 1 - 0.15 * (1 - t);
    });
    this.land(h);
  }
  async dash(h: Hero, x: number, ms: number): Promise<void> {
    h.pose = "act";
    const x0 = h.x;
    let n = 0;
    await this.anim(
      ms,
      (t) => {
        h.x = x0 + (x - x0) * t;
        if (n++ % 2 === 0) h.trail.push({ x: h.x, y: h.y, a: 1 });
      },
      easeOut,
    );
    this.dust(h.x + 8, 6);
  }
  async run(h: Hero, x: number, ms: number): Promise<void> {
    const x0 = h.x;
    await this.anim(ms, (t) => {
      h.x = x0 + (x - x0) * t;
      h.y = GROUND - (Math.floor(t * 10) % 2 ? 2 : 0);
    });
    h.y = GROUND;
  }

  /* ---------- dessin ---------- */
  private drawHero(h: Hero): void {
    if (!h.vis) return;
    const g = this.g;
    const im = h.set[h.pose];
    const sc = 2;
    const bw = h.set.rest.w * sc;
    const ih = im.h * sc;
    const draw = (x: number, y: number, a: number, white: boolean, rot: number, sx: number, sy: number): void => {
      g.save();
      g.globalAlpha = a;
      g.translate(Math.round(x + bw / 2), Math.round(y));
      g.scale(sx, sy);
      g.translate(0, -ih / 2);
      g.rotate(rot);
      if (h.flip) g.scale(-1, 1);
      if (h.hurt && !white) g.filter = "saturate(.5) brightness(.9)";
      g.drawImage(white ? im.white : im.c, -bw / 2, -ih / 2, im.w * sc, ih);
      if (h.hurt && !white && h.pose !== "ko") {
        g.filter = "none";
        g.fillStyle = "#f1ecff";
        g.fillRect(-bw / 2 + 6, -ih / 2 + 5, bw - 12, 3);
        g.fillStyle = "#d94848";
        g.fillRect(bw / 2 - 9, -ih / 2 + 5, 2, 3);
      }
      g.restore();
    };
    for (const t of h.trail) draw(t.x, t.y, t.a * 0.5, true, 0, 1, 1);
    if (h.aura > 0) {
      g.save();
      g.globalAlpha = Math.min(1, h.aura * 2) * (0.5 + Math.sin(this.now / 60) * 0.2);
      g.fillStyle = "#f2c14e";
      g.beginPath();
      g.ellipse(h.x + bw / 2, h.y - 18, 22 + Math.sin(this.now / 40) * 2, 28, 0, 0, 7);
      g.fill();
      g.restore();
    }
    draw(h.x, h.y, h.a, false, h.rot, h.sx, h.sy);
  }

  private drawBoss(): void {
    const b = this.b;
    if (!b.vis) return;
    const g = this.g;
    const w = b.img.w * b.sc;
    const h = b.img.h * b.sc;
    if (this.bossAura > 0) {
      const cy = b.y - 30;
      for (let i = 0; i < 3; i++) {
        const ph = (this.now / 420 + i / 3) % 1;
        const r = 26 + ph * 34;
        g.save();
        g.globalAlpha = this.bossAura * (1 - ph) * 0.8;
        g.strokeStyle = i % 2 ? "#ff7a45" : "#ff3b3b";
        g.lineWidth = 3;
        g.beginPath();
        g.ellipse(b.x, cy, r, r * 1.1, 0, 0, 7);
        g.stroke();
        g.restore();
      }
    }
    const bob = b.dazed ? Math.sin(this.now / 120) * 3 : Math.sin(this.now / 300) * 2;
    g.save();
    g.globalAlpha = b.a;
    g.translate(Math.round(b.x + b.ox), Math.round(b.y + bob));
    g.rotate(b.rot + (b.dazed ? Math.sin(this.now / 200) * 0.06 : 0));
    const img = b.flash > 0.3 ? b.img.white : b.img.c;
    if (b.split > 0) {
      const off = b.split * 14;
      for (const side of [-1, 1]) {
        g.save();
        g.beginPath();
        if (side < 0) {
          g.moveTo(-w, -h * 1.2);
          g.lineTo(w, -h * 1.2);
          g.lineTo(-w, 0);
        } else {
          g.moveTo(w, -h * 1.2);
          g.lineTo(w, 0);
          g.lineTo(-w, 0);
        }
        g.closePath();
        g.clip();
        g.translate(side * off, side * off * 0.6);
        g.rotate(side * b.split * 0.15);
        g.drawImage(img, -w / 2, -h, w, h);
        g.restore();
      }
    } else g.drawImage(img, -w / 2, -h, w, h);
    g.strokeStyle = "#fff6c8";
    g.lineWidth = 2;
    if (b.cut > 0) {
      g.globalAlpha = b.cut;
      g.beginPath();
      g.moveTo(-w / 2 - 4, -h + 2);
      g.lineTo(w / 2 + 4, -4);
      g.stroke();
    }
    if (b.cut2 > 0) {
      g.globalAlpha = b.cut2;
      g.beginPath();
      g.moveTo(w / 2 + 4, -h + 2);
      g.lineTo(-w / 2 - 4, -4);
      g.stroke();
    }
    g.restore();
    if (b.dazed) {
      g.save();
      g.fillStyle = "#f2c14e";
      g.font = `8px ${this.fontFamily}`;
      for (let i = 0; i < 3; i++) {
        const a = this.now / 300 + i * 2.1;
        g.fillText("*", b.x + Math.cos(a) * 22 - 4, b.y - h - 10 + Math.sin(a) * 5);
      }
      g.restore();
    }
  }

  draw(): void {
    const g = this.g;
    g.save();
    g.filter = this.gray ? `grayscale(${this.gray})` : "none";
    g.fillStyle = "#0b0918";
    g.fillRect(0, 0, W, H);
    const sx = this.shake * Math.sin(this.rt * 0.051);
    const sy = this.shake * 0.7 * Math.sin(this.rt * 0.069);
    g.translate(this.zx, this.zy);
    g.scale(this.zoom, this.zoom);
    g.translate(-this.zx + sx, -this.zy + sy);
    g.drawImage(this.bg.c, 0, 0);
    for (const [x, y, p] of this.bg.stars) {
      g.fillStyle = Math.sin(this.now / 400 + p * 20) > 0.6 ? "#fff6c8" : "#7d74b8";
      g.fillRect(x, y, 1, 1);
    }
    if (this.dark > 0) {
      g.fillStyle = `rgba(5,3,14,${this.dark * 0.75})`;
      g.fillRect(-20, -20, W + 40, H + 40);
    }
    if (this.rays > 0) {
      g.save();
      g.translate(this.b.x, GROUND - 40);
      g.globalAlpha = this.rays * 0.35;
      g.fillStyle = "#fff6c8";
      for (let i = 0; i < 12; i++) {
        g.rotate(Math.PI / 6 + this.now / 4000);
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(300, -18);
        g.lineTo(300, 18);
        g.fill();
      }
      g.restore();
    }
    if (this.cracks > 0) {
      g.save();
      g.globalAlpha = this.cracks;
      g.strokeStyle = "#f2c14e";
      g.lineWidth = 1;
      const cx = this.cracksAt + 16;
      for (let i = -3; i <= 3; i++) {
        g.beginPath();
        g.moveTo(cx, GROUND + 1);
        g.lineTo(cx + i * 14 * this.cracks, GROUND + 8 + Math.abs(i) * 3);
        g.lineTo(cx + i * 26 * this.cracks, GROUND + 14 + Math.abs(i) * 4);
        g.stroke();
      }
      g.restore();
    }
    g.fillStyle = "rgba(0,0,0,.35)";
    for (const h of [this.hero, this.mate])
      if (h.vis) {
        const k = Math.max(0.3, 1 - (GROUND - h.y) / 80);
        g.beginPath();
        g.ellipse(h.x + 16, GROUND + 2, 12 * k, 3 * k, 0, 0, 7);
        g.fill();
      }
    if (this.b.vis) {
      g.beginPath();
      g.ellipse(this.b.x, GROUND + 2, 30, 5, 0, 0, 7);
      g.fill();
    }
    for (const r of this.rings) {
      g.save();
      g.globalAlpha = r.life / r.max;
      g.strokeStyle = r.col;
      g.lineWidth = 3;
      g.beginPath();
      g.ellipse(r.x, r.y, r.r, r.r * 0.3, 0, 0, 7);
      g.stroke();
      g.restore();
    }
    this.drawBoss();
    this.drawHero(this.mate);
    this.drawHero(this.hero);
    for (const p of this.parts) {
      if (p.arc) {
        g.save();
        g.globalAlpha = p.life / p.arc.max;
        g.strokeStyle = p.col;
        g.lineWidth = (4 * p.life) / p.arc.max + 1;
        g.beginPath();
        g.arc(p.x, p.y, p.arc.r, p.arc.a0, p.arc.a1);
        g.stroke();
        g.restore();
        continue;
      }
      g.globalAlpha = Math.min(1, p.life / 15);
      g.fillStyle = p.col;
      g.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.coin ? p.s + (Math.sin(this.now / 60 + p.x) > 0 ? 0 : -1) : p.s);
    }
    g.globalAlpha = 1;
    this.fx = this.fx.filter((f) => {
      const k = Math.max(0, (this.now - f.t0) / f.dur);
      if (k > 1 && !f.keep) return false;
      if (k > 0 || f.keep) {
        g.save();
        f.draw(g, Math.min(1, k));
        g.restore();
      }
      return true;
    });
    g.textAlign = "center";
    for (const t of this.texts) {
      const age = t.life0 - t.life;
      const pop = 1 + 0.8 * Math.max(0, 1 - age / 7);
      g.globalAlpha = Math.min(1, t.life / 15);
      g.font = `${Math.round(t.size * pop)}px ${this.fontFamily}`;
      g.fillStyle = "#000";
      g.fillText(t.s, t.x + 1, t.y + 1);
      g.fillStyle = t.col;
      g.fillText(t.s, t.x, t.y);
    }
    g.restore();
    g.globalAlpha = 1;
    if (this.bars > 0) {
      g.fillStyle = "#000";
      g.fillRect(0, 0, W, 24 * this.bars);
      g.fillRect(0, H - 24 * this.bars, W, 24 * this.bars);
    }
    if (this.label && this.labelT > 0) {
      g.textAlign = "left";
      g.font = `10px ${this.fontFamily}`;
      g.fillStyle = "#000";
      g.fillText(this.label, 11, 21);
      g.fillStyle = "#f2c14e";
      g.fillText(this.label, 10, 20);
    }
    if (this.banner) {
      const bn = this.banner;
      g.globalAlpha = bn.a;
      g.fillStyle = "rgba(0,0,0,.6)";
      g.fillRect(0, H / 2 - 22, W, 34);
      g.textAlign = "center";
      g.font = `14px ${this.fontFamily}`;
      g.fillStyle = bn.col;
      g.fillText(bn.s, W / 2, H / 2);
      g.font = `7px ${this.fontFamily}`;
      g.fillStyle = "#c9b8ff";
      g.fillText(bn.sub, W / 2, H / 2 + 8);
      g.globalAlpha = 1;
    }
    if (this.flash > 0.02) {
      g.globalAlpha = Math.min(1, this.flash);
      g.fillStyle = this.flashCol;
      g.fillRect(0, 0, W, H);
      g.globalAlpha = 1;
    }
  }
}
