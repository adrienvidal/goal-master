// Script du boss final (maquette docs/maquettes/boss-final-duo.html, cas validés le 19/11).
// Un impact = les coups d'un héros pour une semaine ; palier : 1-3 estocade, 4-8 uppercut, 9+ grand coup.
import type { Finale } from "@/game/finale";
import { Arena, easeIn, easeOut, GROUND, W, H, type Hero } from "./engine";

export type FinaleHud = { left: number; mine: number; theirs: number; weeks: ("" | "w" | "l" | "f")[] };

const TIER = (n: number): "small" | "medium" | "large" => (n >= 9 ? "large" : n >= 4 ? "medium" : "small");
const FEEL = {
  small: { shake: 2.5, stop: 0, parts: 6, slash: 14, size: 9, knock: 4, flash: 0.25 },
  medium: { shake: 5, stop: 60, parts: 12, slash: 20, size: 11, knock: 8, flash: 0.55 },
  large: { shake: 9, stop: 120, parts: 28, slash: 28, size: 15, knock: 14, flash: 1 },
};
const STRIKE_A = (A: Arena): number => A.b.x - 52;
const STRIKE_N = (A: Arena): number => A.b.x + 30;
const HOME_A = 90;
const HOME_N = 278;

const side = (A: Arena, w: Hero): number => (w.x + 16 < A.b.x ? 1 : -1);

function impact(A: Arena, w: Hero, n: number, y0?: number): void {
  const f = FEEL[TIER(n)];
  const b = A.b;
  const d = side(A, w);
  const x = b.x - d * 18;
  const y = y0 ?? b.y - 30;
  A.slash(x, y, f.slash, d > 0 ? -1.5 : 1.6, d > 0 ? 0.3 : 3.4, w.tint[0]);
  if (TIER(n) !== "small") A.slash(x, y, f.slash - 6, d > 0 ? -1.2 : 1.9, d > 0 ? 0.1 : 3.1, "#fff6c8");
  A.burst(x, y, f.parts, ["#fff6c8", w.tint[1], "#f2c14e"], 1.5 + f.knock / 4, 0.6);
  b.flash = f.flash;
  A.shake = Math.max(A.shake, f.shake);
  if (f.stop && A.freeze <= 0) A.freeze = f.stop;
  if (TIER(n) === "large") {
    A.ring(b.x, GROUND, "#f2c14e", 5, 22);
    A.dust(b.x - 18, 10);
    A.dust(b.x + 18, 10);
  }
  // Le chiffre au-dessus du boss, côté du frappeur, jamais sur un héros.
  A.text(`-${n}`, w === A.hero ? b.x - 26 : b.x + 26, b.y - b.img.h * b.sc - 10, w.tint[1], f.size);
  void A.tween(b, { ox: d * f.knock }, 60, easeOut).then(() => A.tween(b, { ox: 0 }, 260, easeOut)).catch(() => undefined);
}

async function windup(A: Arena, w: Hero, ms = 130): Promise<void> {
  const d = side(A, w);
  w.pose = "rest";
  await A.tween(w, { rot: -0.28 * d, sx: 1.12, sy: 0.86, x: w.x - 5 * d }, ms, easeIn);
}
function settle(A: Arena, w: Hero): void {
  void A.tween(w, { rot: 0, sx: 1, sy: 1 }, 160, easeOut).catch(() => undefined);
}
const knockUp = (A: Arena, height: number, ms: number, d: number): Promise<void> => A.tween(A.b, { y: GROUND - height, rot: 0.25 * d }, ms, easeOut);
async function slam(A: Arena, ms = 200): Promise<void> {
  const b = A.b;
  await A.tween(b, { y: GROUND, rot: 0 }, ms, easeIn);
  A.shake = Math.max(A.shake, 9);
  A.ring(b.x, GROUND, "#c9b8ff", 5, 20);
  A.dust(b.x - 18, 10);
  A.dust(b.x + 18, 10);
}

type Move = (A: Arena, w: Hero, n: number) => Promise<() => Promise<void>>;

const estoc: Move = async (A, w, n) => {
  const d = side(A, w);
  await windup(A, w, 110);
  w.pose = "act";
  w.rot = 0.22 * d;
  w.sx = 0.85;
  w.sy = 1.12;
  await A.tween(w, { x: w.x + 14 * d }, 70, easeOut);
  impact(A, w, n);
  settle(A, w);
  return () => A.hop(w, w.x - 36 * d, 20, 280, -d * 0.5);
};
const uppercut: Move = async (A, w, n) => {
  const d = side(A, w);
  await windup(A, w, 150);
  w.pose = "act";
  w.rot = -0.35 * d;
  const x0 = w.x;
  await A.anim(160, (t) => { w.y = GROUND - Math.sin((t * Math.PI) / 2) * 30; w.x = x0 + 10 * d * t; w.sy = 1.2; w.sx = 0.85; }, easeOut);
  impact(A, w, n, GROUND - 36);
  void knockUp(A, 34, 200, d).catch(() => undefined);
  return async () => {
    await A.anim(200, (t) => { w.y = GROUND - 30 * (1 - t); }, easeIn);
    A.land(w);
    await slam(A, 160);
  };
};
const dive: Move = async (A, w, n) => {
  const d = side(A, w);
  const x0 = w.x;
  await windup(A, w, 160);
  w.pose = "act";
  await A.anim(260, (t) => { w.y = GROUND - Math.sin((t * Math.PI) / 2) * 80; w.x = x0 - 6 * d * t; w.rot = -0.5 * d * t; w.sy = 1.2; w.sx = 0.85; }, easeOut);
  await A.wait(90);
  for (let k = 0; k < 4; k++) w.trail.push({ x: w.x, y: w.y + k * 18, a: 1 - k * 0.2 });
  w.rot = 0.6 * d;
  await A.tween(w, { y: GROUND, x: x0 + 18 * d }, 110, easeIn);
  A.land(w);
  impact(A, w, n, GROUND - 20);
  return async () => { await A.wait(80); w.pose = "rest"; };
};
const tornado: Move = async (A, w, n) => {
  const d = side(A, w);
  const x0 = w.x;
  await windup(A, w, 120);
  w.pose = "act";
  await A.anim(360, (t) => {
    w.rot = d * t * Math.PI * 4;
    w.x = x0 + 16 * d * t;
    w.y = GROUND - Math.sin(t * Math.PI) * 14;
    if (Math.random() < 0.5) A.slash(w.x + 16, w.y - 18, 18, A.now / 30, A.now / 30 + 2.2, w.tint[0]);
  }, easeIn);
  w.rot = 0;
  w.y = GROUND;
  impact(A, w, n);
  return async () => { await A.wait(80); w.pose = "rest"; };
};
const leapover: Move = async (A, w, n) => {
  const d = side(A, w);
  const b = A.b;
  const home = w.flip;
  await windup(A, w, 140);
  w.pose = "act";
  await A.hop(w, d > 0 ? b.x + 22 : b.x - 54, 70, 380, d);
  w.flip = d > 0;
  await A.wait(60);
  w.rot = -0.22 * d;
  w.x += 6 * -d;
  impact(A, w, n);
  return async () => {
    await A.wait(120);
    await A.hop(w, d > 0 ? b.x - 52 : b.x + 20, 44, 360, -d);
    w.flip = home;
  };
};
const BIG = [dive, tornado, leapover];
const moveFor = (n: number, i: number): Move => (n >= 9 ? BIG[i % 3] : n >= 4 ? uppercut : estoc);

async function relay(A: Arena, up: Hero, down: Hero, nu: number, nd: number): Promise<void> {
  const d = side(A, up);
  const b = A.b;
  await windup(A, up, 140);
  up.pose = "act";
  up.rot = -0.35 * d;
  impact(A, up, nu, GROUND - 30);
  void knockUp(A, 66, 260, d).catch(() => undefined);
  A.text("RELAIS !", W / 2, 44, "#f2c14e", 10, 40);
  void A.hop(up, up.x, 26, 320).catch(() => undefined);
  const dd = side(A, down);
  const x0 = down.x;
  down.pose = "act";
  await A.anim(260, (t) => { down.y = GROUND - Math.sin((t * Math.PI) / 2) * 84; down.x = x0 + 14 * dd * t; down.rot = dd * t * Math.PI * 2; }, easeOut);
  down.rot = 0.6 * dd;
  await Promise.all([A.tween(down, { y: GROUND }, 120, easeIn), A.tween(b, { y: GROUND, rot: 0 }, 120, easeIn)]);
  A.land(down);
  impact(A, down, nd, GROUND - 20);
  A.ring(b.x, GROUND, "#f2c14e", 6, 26);
  await A.wait(100);
  up.pose = "rest";
  down.pose = "rest";
}

async function bossAttack(A: Arena, i: number, who: Hero[]): Promise<void> {
  const b = A.b;
  if (!who.length) return;
  if (i % 2 === 0) {
    await A.tween(b, { y: GROUND - 20 }, 150, easeOut);
    await A.tween(b, { y: GROUND }, 110, easeIn);
    A.shake = Math.max(A.shake, 9);
    A.ring(b.x, GROUND, "#ff6b6b", 4.5, 26);
    A.ring(b.x, GROUND, "#c9b8ff", 3.5, 26);
    A.dust(b.x, 16);
    await A.wait(90);
    await Promise.all(who.map((w) => A.hop(w, w.x - side(A, w) * 10, 28, 360)));
  } else {
    const t = who[0];
    const d = side(A, t);
    const x0 = b.x;
    const tx = t.x + 16 + d * 6;
    const pounce = A.anim(300, (k) => { b.x = x0 + (tx - x0) * k; b.y = GROUND - Math.sin(k * Math.PI) * 40; b.rot = -0.3 * d * Math.sin(k * Math.PI); });
    await A.wait(140);
    await A.hop(t, t.x - d * 46, 12, 300, -d);
    await pounce;
    A.shake = Math.max(A.shake, 9);
    A.dust(b.x, 14);
    await A.wait(60);
    await A.anim(240, (k) => { b.x = tx + (x0 - tx) * k; b.y = GROUND - Math.sin(k * Math.PI) * 26; b.rot = 0; });
    b.y = GROUND;
    b.x = x0;
  }
}

async function week(A: Arena, f: Finale, i: number): Promise<void> {
  const { a: na, n: nn } = f.weeks[i];
  const h = A.hero;
  const m = A.mate;
  const goA = na > 0;
  const goN = nn > 0 && f.duo;
  A.texts = A.texts.filter((t) => !t.s.startsWith("-"));
  await Promise.all([goA ? A.dash(h, STRIKE_A(A), 170) : null, goN ? A.dash(m, STRIKE_N(A), 170) : null]);
  h.pose = "rest";
  m.pose = "rest";
  if (goA && goN && na >= 4 && nn >= 4 && i % 4 === 0) {
    const aUp = Math.floor(i / 4) % 2 === 0;
    await relay(A, aUp ? h : m, aUp ? m : h, aUp ? na : nn, aUp ? nn : na);
    return;
  }
  // Le plus petit frappe d'abord, le plus gros conclut : chaque chiffre se lit seul.
  const order = ([goA ? [h, na] : null, goN ? [m, nn] : null].filter(Boolean) as [Hero, number][]).sort((x, y) => x[1] - y[1]);
  const recoveries: Promise<void>[] = [];
  for (const [w, n] of order) recoveries.push((await moveFor(n, i)(A, w, n))());
  await Promise.all(recoveries);
}

async function ultimate(A: Arena, f: Finale, report: (h: Partial<FinaleHud>) => void, marks: FinaleHud["weeks"]): Promise<void> {
  const win = f.outcome === "won";
  A.timeScale = 1.2;
  const h = A.hero;
  const m = A.mate;
  const b = A.b;
  const fin = f.finisher;
  const actors = fin === "both" ? [h, m] : fin === "me" ? [h] : [m];
  await Promise.all([A.tween(h, { x: HOME_A }, 250, easeOut), f.duo ? A.tween(m, { x: HOME_N }, 250, easeOut) : null]);
  const zx = fin === "both" ? b.x : fin === "me" ? h.x + 16 : m.x + 20;
  await Promise.all([A.tween(A, { bars: 1, dark: 0.85 }, 350), A.tween(A, { zoom: fin === "both" ? 1.2 : 1.5, zx, zy: GROUND - 20 }, 400, easeOut)]);
  actors.forEach((x) => (x.aura = win ? 0.9 : 0.35));
  A.cracksAt = actors[0].x;
  await A.tween(A, { cracks: win ? 1 : 0.4 }, 550);
  A.banner = { s: fin === "both" ? "COUP ULTIME À DEUX" : win ? "COUP ULTIME" : "COUP ULTIME…", sub: "", a: 1, col: "#f2c14e" };
  await A.wait(420);
  A.banner = null;
  await A.tween(A, { zoom: 1, zx: W / 2, zy: H / 2 }, 150);
  A.flash = 1;
  A.flashCol = "#fff";
  A.cracks = 0;
  for (const x of actors) {
    const left = x === h;
    const x0 = x.x;
    const x1 = left ? b.x + 46 : b.x - 86;
    x.pose = "act";
    for (let t = 0; t < 6; t++) x.trail.push({ x: x0 + ((x1 - x0) * t) / 6, y: GROUND, a: 1 - t * 0.12 });
    x.x = x1;
    x.flip = left;
    x.aura = 0;
  }
  A.slash(b.x, GROUND - 30, 40, -0.3, 0.3, "#fff");
  await A.wait(600);
  const last = f.weeks[f.weeks.length - 1];
  marks[marks.length - 1] = win ? "f" : last.won ? "w" : "l";
  if (win) {
    b.cut = 1;
    if (fin === "both") b.cut2 = 1;
    A.shake = 6;
    await A.wait(350);
    report({ left: 0, weeks: [...marks] });
    A.flash = 0.9;
    A.shake = 14;
    A.burst(b.x, GROUND - 30, 70, ["#fff6c8", "#f2c14e", "#ff7a45", h.tint[1], m.tint[1]], 5, 1.5);
    if (fin !== "both") await A.tween(b, { split: 1, cut: 0 }, 450, easeOut);
    A.shatter();
    void A.tween(A, { bars: 0, dark: 0, rays: 0.8 }, 600).catch(() => undefined);
    A.coins(60);
    h.flip = false;
    m.flip = true;
    h.pose = "win";
    m.pose = "win";
    await Promise.all([A.tween(h, { x: f.duo ? 140 : 170 }, 500, easeOut), f.duo ? A.tween(m, { x: 210 }, 500, easeOut) : null]);
    for (let j = 0; j < 2; j++) await Promise.all([A.hop(h, h.x, 14, 260), f.duo ? A.hop(m, m.x, 14, 260) : null]);
    await A.wait(300);
  } else {
    b.cut = 0.7;
    if (fin === "both") b.cut2 = 0.7;
    b.flash = 1;
    A.shake = 8;
    // La dernière semaine a aussi son chiffre, à l'entaille.
    if (last.a) A.text(`-${last.a}`, b.x - 26, b.y - b.img.h * b.sc - 10, h.tint[1], FEEL[TIER(last.a)].size);
    if (last.n && f.duo) A.text(`-${last.n}`, b.x + 26, b.y - b.img.h * b.sc - 10, m.tint[1], FEEL[TIER(last.n)].size);
    report({ left: f.totalHp - f.dealt, weeks: [...marks] });
    A.ring(b.x, GROUND, "#c9b8ff", 7, 26);
    await A.wait(300);
    b.dazed = 1;
    h.flip = false;
    m.flip = true;
    h.pose = "tired";
    m.pose = "rest";
    void A.tween(A, { bars: 0, dark: 0 }, 600).catch(() => undefined);
    void A.tween(b, { cut: 0, cut2: 0, a: 0.85 }, 900).catch(() => undefined);
    await Promise.all([A.tween(h, { x: 80 }, 500, easeOut), f.duo ? A.tween(m, { x: 300 }, 500, easeOut) : null]);
    await A.wait(900);
  }
}

const markOf = (w: Finale["weeks"][number]): "" | "w" | "l" => (w.a + w.n === 0 ? "" : w.won ? "w" : "l");

/** Joue le combat ; « Passer » le coupe et l'image finale prend le relais. */
export async function playFinale(A: Arena, f: Finale, report: (h: Partial<FinaleHud>) => void): Promise<void> {
  const h = A.hero;
  const m = A.mate;
  const b = A.b;
  A.timeScale = 1.5;
  b.y = -80;
  h.x = -40;
  m.vis = f.duo;
  m.x = W + 30;
  A.bars = 1;
  A.banner = { s: "BOSS FINAL", sub: "", a: 0, col: "#ff6b6b" };
  await A.tween(A.banner, { a: 1 }, 250);
  await A.tween(b, { y: GROUND }, 380, easeIn);
  A.shake = 10;
  A.ring(b.x, GROUND, "#c9b8ff", 6, 26);
  A.dust(b.x - 20, 14);
  A.dust(b.x + 20, 14);
  await A.wait(450);
  void A.tween(A.banner, { a: 0 }, 200).catch(() => undefined);
  void A.tween(A, { bars: 0 }, 300).catch(() => undefined);
  await Promise.all([A.run(h, HOME_A, 450), f.duo ? A.run(m, HOME_N, 450) : null]);
  let dealt = 0;
  let mine = 0;
  let theirs = 0;
  const marks: FinaleHud["weeks"] = f.weeks.map(() => "");
  for (let i = 0; i < f.weeks.length - 1; i++) {
    const w = f.weeks[i];
    A.label = `SEMAINE ${i + 1}`;
    A.labelT = 60;
    if (!w.a && !(w.n && f.duo)) {
      await A.wait(250);
      continue;
    }
    await week(A, f, i);
    mine += w.a;
    theirs += w.n;
    dealt += w.dealt;
    marks[i] = markOf(w);
    report({ left: f.totalHp - dealt, mine, theirs, weeks: [...marks] });
    if (!w.won) await bossAttack(A, i, [w.a ? h : null, w.n && f.duo ? m : null].filter((x): x is Hero => x !== null));
    await A.wait(60);
    h.pose = "rest";
    m.pose = "rest";
  }
  A.label = "";
  report({ mine: f.mine, theirs: f.theirs });
  await ultimate(A, f, report, marks);
}

/** Image finale : au repos, après « Passer », ou d'office si l'appareil demande moins d'animations. */
export function finaleRest(A: Arena, f: Finale): FinaleHud {
  const win = f.outcome === "won";
  Object.assign(A, { parts: [], texts: [], rings: [], fx: [], bars: 0, dark: 0, zoom: 1, zx: W / 2, zy: H / 2, banner: null, cracks: 0, label: "", timeScale: 1 });
  Object.assign(A.hero, { x: win ? (f.duo ? 140 : 170) : 80, y: GROUND, pose: win ? "win" : "tired", flip: false, aura: 0, a: 1, trail: [], rot: 0, sx: 1, sy: 1 });
  Object.assign(A.mate, { x: win ? 210 : 300, y: GROUND, pose: win ? "win" : "rest", vis: f.duo, flip: true, aura: 0, a: 1, trail: [], rot: 0, sx: 1, sy: 1 });
  if (win) {
    A.b.vis = false;
    A.rays = 0.6;
    A.coins(30);
  } else Object.assign(A.b, { vis: true, x: 200, y: GROUND, dazed: 1, a: 0.85, split: 0, cut: 0, cut2: 0, rot: 0, ox: 0, sc: 4 });
  const weeks = f.weeks.map(markOf) as FinaleHud["weeks"];
  if (win) weeks[weeks.length - 1] = "f";
  return { left: win ? 0 : f.totalHp - f.dealt, mine: f.mine, theirs: f.theirs, weeks };
}
