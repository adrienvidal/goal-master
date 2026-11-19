// Attaque ultime du boss quand le duel du vendredi est perdu (maquette docs/maquettes/boss-ultime-ko.html).
// Purement visuel : la défaite ne coûte rien, les héros restent seulement blessés jusqu'à la prochaine victoire.
import type { BossIndex } from "@/game/duel";
import { Arena, easeIn, easeOut, GROUND, H, W, type Hero } from "./engine";

export const ATTACK_NAMES: Record<BossIndex, string> = { 0: "HURLEMENT SPECTRAL", 1: "REJET AUTOMATIQUE", 2: "AVALANCHE DE REFUS", 3: "SILENCE RADIO" };
const CHARGE_COL: Record<BossIndex, string> = { 0: "#e4defd", 1: "#6fd49a", 2: "#ffffff", 3: "#c9b8ff" };
const A_X = 58;
const N_X = 104;
const BOSS_X = 285;

const ATTACKS: Record<BossIndex, (A: Arena) => Promise<void>> = {
  // Le Recruteur fantôme : trois ondes de hurlement qui balaient l'écran.
  0: async (A) => {
    const b = A.b;
    for (let w = 0; w < 3; w++) {
      A.fx.push({
        t0: A.now,
        dur: 520,
        draw: (g, k) => {
          const x = b.x - 40 - k * 300;
          for (let i = 0; i < 3; i++) {
            g.globalAlpha = Math.max(0, 0.85 - k * 0.5 - i * 0.22);
            g.strokeStyle = i ? "#c9b8ff" : "#ffffff";
            g.lineWidth = 5 - i;
            g.beginPath();
            g.arc(x + i * 12, GROUND - 40, 46 + i * 8, Math.PI * 0.62, Math.PI * 1.38);
            g.stroke();
          }
        },
      });
      A.shake = Math.max(A.shake, 4);
      b.sc = 5.4;
      void A.tween(b, { sc: 5 }, 160).catch(() => undefined);
      await A.wait(150);
    }
    await A.wait(250);
  },
  // Le Golem ATS : rayon de rejet, puis tampon « REJETÉ ».
  1: async (A) => {
    const b = A.b;
    const ex = b.x - 18;
    const ey = b.y - 46;
    A.fx.push({ t0: A.now, dur: 260, draw: (g, k) => { g.globalAlpha = k; g.fillStyle = "#6fd49a"; g.beginPath(); g.arc(ex, ey, 3 + k * 6, 0, 7); g.fill(); } });
    await A.wait(260);
    A.fx.push({
      t0: A.now,
      dur: 560,
      draw: (g, k) => {
        const ty = GROUND - 44 + k * 30;
        const w = 9 * (1 - Math.abs(k - 0.5));
        g.globalAlpha = 0.9;
        g.strokeStyle = "#6fd49a";
        g.lineWidth = w + 6;
        g.beginPath();
        g.moveTo(ex, ey);
        g.lineTo(0, ty);
        g.stroke();
        g.strokeStyle = "#e8fff0";
        g.lineWidth = Math.max(1, w);
        g.beginPath();
        g.moveTo(ex, ey);
        g.lineTo(0, ty);
        g.stroke();
        if (Math.random() < 0.7) A.burst(70 + Math.random() * 70, ty, 2, ["#6fd49a", "#e8fff0"], 2);
      },
    });
    A.shake = Math.max(A.shake, 5);
    await A.wait(560);
    A.fx.push({
      t0: A.now,
      dur: 1500,
      draw: (g, k) => {
        const s = k < 0.12 ? 2.4 - (k / 0.12) * 1.4 : 1;
        g.globalAlpha = k > 0.75 ? (1 - k) * 4 : 1;
        g.translate(96, GROUND - 52);
        g.rotate(-0.18);
        g.scale(s, s);
        g.strokeStyle = "#ff6b6b";
        g.lineWidth = 3;
        g.strokeRect(-52, -13, 104, 26);
        g.fillStyle = "#ff6b6b";
        g.font = `13px ${A.fontFamily}`;
        g.textAlign = "center";
        g.fillText("REJETÉ", 0, 7);
      },
    });
    await A.wait(140);
  },
  // La Pile de refus : la pile s'envole, pluie de lettres sur les héros.
  2: async (A) => {
    const b = A.b;
    await A.tween(b, { y: GROUND - 40 }, 220, easeOut);
    for (let i = 0; i < 34; i++) {
      const x = 30 + Math.random() * 140;
      const rot = (Math.random() - 0.5) * 1.2;
      let landed = false;
      A.fx.push({
        t0: A.now + i * 18,
        dur: 420,
        draw: (g, k) => {
          g.translate(x, -10 + k * (GROUND - 4));
          g.rotate(rot * k * 3);
          g.fillStyle = "#f1ecff";
          g.fillRect(-5, -4, 10, 8);
          g.fillStyle = "#d94848";
          for (const [px, py] of [[-3, -2], [-1, 0], [1, -2], [-3, 2], [1, 2]]) g.fillRect(px, py, 1, 1);
          if (k >= 1 && !landed) {
            landed = true;
            A.dust(x, 1);
          }
        },
      });
    }
    void A.tween(b, { y: GROUND }, 300, easeIn).catch(() => undefined);
    await A.wait(34 * 18 + 260);
    A.shake = Math.max(A.shake, 5);
  },
  // Le Silence radio : onde noire, les couleurs s'éteignent.
  3: async (A) => {
    const b = A.b;
    A.fx.push({
      t0: A.now,
      dur: 700,
      draw: (g, k) => {
        g.globalAlpha = 0.85 * (1 - k * 0.4);
        g.fillStyle = "#05030e";
        g.beginPath();
        g.arc(b.x, GROUND - 30, k * 330, 0, 7);
        g.arc(b.x, GROUND - 30, Math.max(0, k * 330 - 26), 0, 7, true);
        g.fill();
      },
    });
    await A.tween(A, { gray: 1 }, 700, easeOut);
    A.text("…", 110, GROUND - 60, "#c9b8ff", 14, 40);
    await A.wait(150);
  },
};

export async function playUltimate(A: Arena): Promise<void> {
  const b = A.b;
  const heroes = [A.hero, A.mate].filter((h) => h.vis);
  A.hero.x = A_X;
  A.mate.x = N_X;
  A.mate.flip = false;
  b.x = BOSS_X;
  // 1. Face à face : le boss tient bon.
  A.text("LE BOSS TIENT BON", W / 2, 40, "#ff6b6b", 10, 60);
  heroes.forEach((h) => (h.pose = "parry"));
  await A.wait(650);
  // 2. Charge (anticipation) : le boss grossit, anneaux rouges, l'énergie converge, le sol gronde.
  void A.tween(A, { bars: 1, dark: 0.55 }, 400).catch(() => undefined);
  void A.tween(A, { bossAura: 1 }, 700).catch(() => undefined);
  void A.tween(b, { sc: 5 }, 900, easeOut).catch(() => undefined);
  await A.anim(900, (t) => {
    A.shake = Math.max(A.shake, 0.5 + t * 3);
    if (Math.random() < 0.7) {
      const a = Math.random() * Math.PI * 2;
      A.parts.push({ x: b.x + Math.cos(a) * 90, y: b.y - 32 + Math.sin(a) * 63, vx: -Math.cos(a) * 3, vy: -Math.sin(a) * 2.1, gr: 0, life: 28, col: Math.random() < 0.5 ? "#ff6b6b" : CHARGE_COL[b.index], s: 2 });
    }
  });
  A.banner = { s: ATTACK_NAMES[b.index], sub: "", a: 0, col: "#ff6b6b" };
  await A.tween(A.banner, { a: 1 }, 140);
  await A.wait(420);
  A.banner = null;
  // 3. L'attaque, propre au boss.
  await ATTACKS[b.index](A);
  // 4. Impact : arrêt sur image, un seul flash, héros projetés.
  A.freeze = 150;
  A.flash = 0.7;
  A.flashCol = b.index === 3 ? "#05030e" : "#ffffff";
  A.shake = 12;
  heroes.forEach((h) => A.burst(h.x + 16, GROUND - 20, 14, ["#fff6c8", "#ff6b6b"], 3));
  await Promise.all(heroes.map((h) => { const x0 = h.x; return A.anim(420, (t) => { h.x = x0 - 44 * t; h.y = GROUND - Math.sin(t * Math.PI) * 26; h.rot = -t * Math.PI * 1.6; }, easeOut); }));
  heroes.forEach((h) => { h.pose = "ko"; A.land(h); });
  A.shake = 8;
  A.text("K.O.", W / 2, H / 2 - 4, "#ff6b6b", 22, 80);
  await A.wait(800);
  // 5. Le boss ricane et s'en va.
  void A.tween(A, { bossAura: 0 }, 300).catch(() => undefined);
  void A.tween(b, { sc: 4 }, 200).catch(() => undefined);
  for (let k = 0; k < 3; k++) {
    A.text("HA", b.x - 14 + k * 14, b.y - 66 - k * 6, "#c9b8ff", 9, 34);
    await A.tween(b, { y: GROUND - 6 }, 90, easeOut);
    await A.tween(b, { y: GROUND }, 90, easeIn);
  }
  await A.anim(600, (t) => { b.x = BOSS_X + t * 170; b.y = GROUND - Math.abs(Math.sin(t * Math.PI * 3)) * 10; b.a = 1 - t * 0.6; }, easeIn);
  b.vis = false;
  void A.tween(A, { bars: 0, dark: 0, gray: 0 }, 500).catch(() => undefined);
  await A.wait(350);
  // 6. Les héros se relèvent, blessés.
  heroes.forEach((h: Hero) => { h.hurt = true; h.pose = "tired"; });
  await Promise.all(heroes.map((h) => A.hop(h, h.x + 10, 9, 300)));
  await A.wait(450);
}

/** Image finale : héros debout et blessés, le boss est parti. */
export function ultimateRest(A: Arena): void {
  Object.assign(A, { parts: [], texts: [], rings: [], fx: [], bars: 0, dark: 0, gray: 0, bossAura: 0, banner: null, zoom: 1, zx: W / 2, zy: H / 2 });
  Object.assign(A.hero, { x: A_X + 10, y: GROUND, pose: "tired", rot: 0, sx: 1, sy: 1, hurt: true, trail: [] });
  Object.assign(A.mate, { x: N_X + 10, y: GROUND, pose: "tired", rot: 0, sx: 1, sy: 1, hurt: true, flip: false, trail: [] });
  A.b.vis = false;
}
