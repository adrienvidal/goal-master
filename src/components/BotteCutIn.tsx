"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Form } from "@/game/levels";
import type { BotteCut } from "@/lib/arenaBotte";
import type { CharacterId, ColorId } from "@/lib/onboarding";
import { spriteLayers, type Rect } from "@/lib/sprites";

// Bottes plein écran (spec 2026-11-18-arene-bottes-plein-ecran, maquette arene-botte) : la séquence couvre toute la
// fenêtre avant l'impact du lot Impact. Le temps des images clés est exprimé de 0 à 1 sur toute la séquence.

type Props = {
  cut: BotteCut;
  character: CharacterId;
  color: ColorId;
  form: Form;
  /** Mon coup entre par la gauche, celui de l'adversaire par la droite, héros retourné. */
  side: "left" | "right";
  /** Coup d'estoc du dernier palier sur une cible qui pare. */
  pierce: boolean;
  onDone: () => void;
};

type Frame = Keyframe & { t: number };

/** Une animation par élément, à partir d'images clés en temps global. */
function kf(el: Element | null | undefined, frames: Frame[], T: number, extra: KeyframeAnimationOptions = {}): Animation | null {
  if (!el) return null;
  const a = frames[0].t;
  const b = frames[frames.length - 1].t;
  return el.animate(
    frames.map(({ t, ...p }) => ({ ...p, offset: (t - a) / (b - a) })),
    { duration: Math.max(1, T * (b - a)), delay: T * a, fill: "both", ...extra },
  );
}

function Layer({ rects, w, h, W, H, fill }: { rects: Rect[]; w: number; h: number; W: number; H: number; fill?: string }): React.ReactElement {
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={W} height={H} shapeRendering="crispEdges" aria-hidden className="botte-layer">
      {rects.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={fill ?? r.fill} />)}
    </svg>
  );
}

/** Tirage déterministe (fissures), pour un rendu stable. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

export function BotteCutIn({ cut, character, color, form, side, pierce, onDone }: Props): React.ReactElement {
  const root = useRef<HTMLButtonElement>(null);
  const done = useRef(onDone);
  done.current = onDone;
  const [view] = useState(() => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const wide = W >= 768;
    const bandH = wide ? Math.round(Math.min(260, Math.max(150, H * 0.34))) : 150;
    const ts = (wide ? Math.round(Math.min(28, Math.max(18, W / 38))) : 15) * (cut.kind === "WHIRL" ? 0.8 : 1);
    return { W, H, wide, bandH, ts };
  });
  const L = useMemo(() => spriteLayers(character, color, form), [character, color, form]);
  const k = ((view.bandH * (0.5 + 0.05 * form)) / L.height) * L.scale;
  const SW = Math.round(L.width * k);
  const SH = Math.round(L.height * k);
  const knight = cut.kind === "THRUST";
  const leaves = Math.round(cut.leaves * (view.wide ? 1.6 : 1));
  const cracks = useMemo(() => {
    if (!cut.cracks) return [];
    const rnd = seeded(7);
    const cx = view.W / 2;
    const cy = view.H / 2;
    return Array.from({ length: 7 }, (_, n) => {
      const ang = (n / 7) * Math.PI * 2 + 0.3;
      const pts = [`${cx},${cy}`];
      for (let j = 0; j < 5; j++) {
        const r = (18 + j * 22 + rnd() * 14) * (1 + j * 0.5);
        const a = ang + (rnd() - 0.5) * 0.6;
        pts.push(`${Math.round(cx + Math.cos(a) * r)},${Math.round(cy + Math.sin(a) * r)}`);
      }
      return pts.join(" ");
    });
  }, [cut.cracks, view.W, view.H]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const T = cut.ms;
    const q = (sel: string) => el.querySelector(sel);
    const qa = (sel: string) => Array.from(el.querySelectorAll(sel));
    const A: Animation[] = [];
    const push = (a: Animation | null) => {
      if (a) A.push(a);
    };
    const dir = side === "left" ? -1 : 1;
    push(kf(q(".botte-dim"), [{ t: 0, opacity: 0 }, { t: 0.12, opacity: 1 }, { t: 0.85, opacity: 1 }, { t: 1, opacity: 0 }], T));
    if (cut.reduced) {
      push(kf(q(".botte-band"), [{ t: 0, opacity: 0 }, { t: 0.2, opacity: 1 }, { t: 0.8, opacity: 1 }, { t: 1, opacity: 0 }], T));
      push(kf(q(".botte-tint"), [{ t: 0.45, opacity: 0 }, { t: 0.6, opacity: 1 }, { t: 0.75, opacity: 0 }], T));
    } else {
      push(kf(q(".botte-lines"), [{ t: 0.05, opacity: 0, transform: "translateX(0)" }, { t: 0.18, opacity: 1 }, { t: 0.8, opacity: 1 }, { t: 0.92, opacity: 0, transform: `translateX(${dir * 120}px)` }], T));
      push(kf(q(".botte-band"), [
        { t: 0.06, transform: "rotate(-7deg) scaleY(0)", easing: "ease-out" },
        { t: 0.14, transform: "rotate(-7deg) scaleY(1.08)" },
        { t: 0.2, transform: "rotate(-7deg) scaleY(1)" },
        { t: 0.84, transform: "rotate(-7deg) scaleY(1)", easing: "ease-in" },
        { t: 0.95, transform: "rotate(-7deg) scaleY(0)" },
      ], T));
      push(kf(q(".botte-hero"), [
        { t: 0.12, transform: `translateX(${dir * 70}%)`, opacity: 0, easing: "cubic-bezier(.2,1.4,.4,1)" },
        { t: 0.3, transform: "translateX(0)", opacity: 1 },
        { t: 0.84, transform: `translateX(${-dir * 8}px)`, opacity: 1 },
      ], T));
      push(kf(q(".botte-title b"), [{ t: 0.22, transform: "scale(2.4)", opacity: 0, easing: "ease-in" }, { t: 0.32, transform: "scale(1)", opacity: 1 }], T));
      push(kf(q(".botte-title i"), [{ t: 0.32, clipPath: "inset(0 100% 0 0)" }, { t: 0.46, clipPath: "inset(0 0 0 0)" }], T, { easing: `steps(${cut.tier})` }));
      push(kf(q(".botte-shine"), [{ t: 0.3, transform: "translateX(-200%) skewX(-20deg)" }, { t: 0.5, transform: "translateX(500%) skewX(-20deg)" }], T));
      const rig = q(".botte-rig");
      const weapon = q(".botte-weapon");
      if (knight) {
        const back = "translateX(-7%) scale(1.1, .88)";
        const lunge = `translateX(${cut.lunge}%) scale(1.18, .88)`;
        const f: Frame[] = [
          { t: 0.26, transform: "none", opacity: 1 },
          { t: 0.36, transform: back, opacity: 1, easing: "cubic-bezier(.6,0,.9,.5)" },
          { t: 0.42, transform: back, opacity: 1, easing: "cubic-bezier(.2,.9,.3,1)" },
          { t: 0.48, transform: lunge, opacity: 1 },
          { t: 0.54, transform: lunge, opacity: 1, easing: "ease-out" },
        ];
        if (cut.traverse) f.push({ t: 0.55, transform: "translateX(-200%)", opacity: 0 }, { t: 0.66, transform: "translateX(-200%)", opacity: 0, easing: "cubic-bezier(.2,1.3,.4,1)" }, { t: 0.76, transform: "none", opacity: 1 });
        else f.push({ t: 0.7, transform: "none", opacity: 1 });
        push(kf(rig, f, T));
        push(kf(weapon, [
          { t: 0.26, transform: "rotate(0)", filter: "brightness(1)" },
          { t: 0.36, transform: "rotate(-45deg)", filter: "brightness(1)" },
          { t: 0.39, transform: "rotate(-45deg)", filter: "brightness(2.6)" },
          { t: 0.42, transform: "rotate(-45deg)", filter: "brightness(1)", easing: "cubic-bezier(.2,.9,.3,1)" },
          { t: 0.47, transform: "rotate(90deg)", filter: "brightness(1)" },
          { t: 0.68, transform: "rotate(90deg)", filter: "brightness(1)", easing: "steps(3)" },
          { t: 0.78, transform: "rotate(0)", filter: "brightness(1)" },
        ], T));
        qa(".botte-ghost").forEach((g, i) => {
          const end = Math.min(cut.lunge, 60) * (1 - (i + 1) * 0.22);
          push(kf(g, [
            { t: 0.42, transform: back, opacity: 0 },
            { t: 0.45 + i * 0.012, transform: back, opacity: 0.55 - i * 0.1 },
            { t: 0.49 + i * 0.02, transform: `translateX(${end}%) scale(1.18, .88)`, opacity: 0.45 - i * 0.08 },
            { t: 0.6 + i * 0.02, transform: `translateX(${end}%) scale(1.18, .88)`, opacity: 0 },
          ], T));
        });
        qa(".botte-slash").forEach((s, i) => {
          const rot = i === 0 ? -12 : 10;
          push(kf(s, [
            { t: 0.5 + i * 0.06, transform: `rotate(${rot}deg) scaleX(0)`, opacity: 1, easing: "ease-out" },
            { t: 0.6 + i * 0.06, transform: `rotate(${rot}deg) scaleX(1)`, opacity: 1 },
            { t: 0.74 + i * 0.06, transform: `rotate(${rot}deg) scaleX(1) scaleY(.2)`, opacity: 0 },
          ], T));
        });
        if (cut.cracks) {
          push(kf(q(".botte-flash"), [{ t: 0.6, opacity: 0 }, { t: 0.62, opacity: 0.9 }, { t: 0.66, opacity: 0 }], T));
          qa(".botte-cracks polyline").forEach((p) => push(kf(p, [{ t: 0.6, strokeDashoffset: 100, opacity: 1 }, { t: 0.72, strokeDashoffset: 0, opacity: 1 }, { t: 0.9, strokeDashoffset: 0, opacity: 0 }], T)));
          push(kf(q(".botte-pierce"), [{ t: 0.62, opacity: 0, transform: "scale(2)" }, { t: 0.68, opacity: 1, transform: "scale(1)" }, { t: 0.86, opacity: 1 }, { t: 0.92, opacity: 0 }], T));
          push(kf(el, [0, -8, 7, -5, 4, -2, 0].map((x, i) => ({ t: 0.6 + i * 0.02, transform: `translate(${x}px, ${-x / 2}px)` })), T));
        }
      } else {
        const top = 0.62 + (cut.float ? 0.1 : 0);
        const hy = -cut.jump;
        const f: Frame[] = [
          { t: 0.26, transform: "none" },
          { t: 0.34, transform: "scale(1.14, .82)", easing: "cubic-bezier(.2,.9,.4,1)" },
          { t: 0.42, transform: `translateY(${hy}%) scale(.92, 1.1)`, easing: "ease-out" },
        ];
        if (cut.float) f.push({ t: 0.5, transform: `translateY(${hy - 6}%)`, easing: "ease-in-out" }, { t: 0.58, transform: `translateY(${hy}%)` }, { t: 0.64, transform: `translateY(${hy - 6}%)`, easing: "ease-in" });
        else f.push({ t: 0.5, transform: `translateY(${hy - 4}%)`, easing: "ease-in" });
        f.push({ t: top, transform: "translateY(0) scale(1.2, .78)", easing: "ease-out" }, { t: top + 0.08, transform: "none" });
        push(kf(rig, f, T));
        const flips = 2 * cut.turns;
        push(kf(q(".botte-spin"), Array.from({ length: flips + 1 }, (_, j) => ({ t: 0.38 + (j * (top - 0.4)) / flips, transform: `scaleX(${j % 2 ? -1 : 1})`, easing: "steps(1, end)" })), T));
        push(kf(weapon, [{ t: 0.28, transform: "rotate(0)" }, { t: top, transform: `rotate(${360 * (cut.turns + 1)}deg)`, easing: "ease-out" }, { t: top + 0.06, transform: `rotate(${360 * (cut.turns + 1)}deg)` }], T));
        qa(".botte-dust").forEach((d, i) => {
          const s = i % 2 ? 1 : -1;
          const far = 20 + (i >> 1) * 22;
          push(kf(d, [{ t: top, transform: "translate(0,0) scale(1)", opacity: 0 }, { t: top + 0.01, transform: "translate(0,0) scale(1)", opacity: 0.9, easing: "ease-out" }, { t: top + 0.14, transform: `translate(${s * far}px, ${-8 - (i >> 1) * 6}px) scale(.4)`, opacity: 0 }], T));
        });
        const maxR = Math.hypot(view.W, view.H) / 2;
        const grow = view.wide && cut.tier < 3 ? 1.6 : 1;
        const [r0, r1, turns] = cut.tier === 1 ? [70 * grow, 80 * grow, 1] : cut.tier === 2 ? [40 * grow, 170 * grow, 1.5] : [20, maxR, 2.2];
        if (cut.tier === 3) push(kf(q(".botte-tint"), [{ t: 0.48, opacity: 0 }, { t: 0.6, opacity: 1 }, { t: 0.76, opacity: 1 }, { t: 0.88, opacity: 0 }], T));
        qa(".botte-gust").forEach((g, i) => push(kf(g, [{ t: 0.48, transform: `rotate(${i * 70}deg) scale(.6)`, opacity: 0 }, { t: 0.59, opacity: 1 }, { t: 0.85, transform: `rotate(${i * 70 + 540}deg) scale(1.1)`, opacity: 0 }], T)));
        qa(".botte-leaf").forEach((lf, i) => {
          const a0 = (i / leaves) * 360;
          const end = cut.tier === 3 ? r1 * (0.4 + (0.6 * ((i * 7) % leaves)) / leaves) : r1;
          const st = 0.48 + (i % 4) * 0.015;
          push(kf(lf, [{ t: st, transform: `rotate(${a0}deg)`, easing: "cubic-bezier(.3,.1,.5,1)" }, { t: 0.86, transform: `rotate(${a0 + turns * 360}deg)` }], T));
          push(kf(lf.firstElementChild, [
            { t: st, transform: `translateX(${r0}px) rotate(0)`, opacity: 0 },
            { t: st + (0.86 - st) * 0.15, opacity: 1 },
            { t: st + (0.86 - st) * 0.8, opacity: 1 },
            { t: 0.86, transform: `translateX(${end}px) rotate(${(i % 2 ? 1 : -1) * 270}deg)`, opacity: 0 },
          ], T));
        });
        if (cut.tier === 3) push(kf(el, [0, -4, 4, -3, 3, -1, 0].map((x, i) => ({ t: 0.55 + i * 0.04, transform: `translate(${x}px, 0)` })), T));
      }
    }
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      A.forEach((a) => a.cancel());
      done.current();
    };
    const timer = setTimeout(finish, T);
    el.addEventListener("click", finish);
    return () => {
      clearTimeout(timer);
      el.removeEventListener("click", finish);
      if (!finished) A.forEach((a) => a.cancel());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une séquence par montage
  }, []);

  const all = [...L.body, ...L.weapon];
  const classes = ["botte", `t${cut.tier}`, knight ? "estoc" : "whirl", side === "right" ? "from-right" : "", cut.reduced ? "reduced" : ""].filter(Boolean).join(" ");
  const style = { "--bh": `${view.bandH}px`, "--ts": `${view.ts}px` } as React.CSSProperties;
  return (
    <button ref={root} type="button" className={classes} style={style} aria-label="Passer l'animation">
      <span className="botte-dim" />
      {cut.speedLines && !cut.reduced ? <span className="botte-lines" /> : null}
      <span className="botte-band">
        {cut.tier === 3 && !cut.reduced ? <span className="botte-clip"><span className="botte-shine" /></span> : null}
        <span className="botte-in">
          <span className="botte-hero" style={{ width: SW, height: SH }}>
            <span className={`botte-flip ${side === "right" ? "flipped" : ""}`}>
              {knight && !cut.reduced ? Array.from({ length: cut.ghosts }, (_, i) => <span key={i} className="botte-ghost"><Layer rects={all} w={L.width} h={L.height} W={SW} H={SH} fill="#9fd8ff" /></span>) : null}
              <span className="botte-rig">
                <span className={`botte-spin ${form === 6 ? "legend" : ""}`}>
                  <Layer rects={L.body} w={L.width} h={L.height} W={SW} H={SH} />
                  {L.pivot ? (
                    <span className="botte-weapon" style={{ transformOrigin: `${L.pivot.x * (SW / L.width)}px ${L.pivot.y * (SH / L.height)}px` }}>
                      <Layer rects={L.weapon} w={L.width} h={L.height} W={SW} H={SH} />
                    </span>
                  ) : null}
                </span>
              </span>
              {!knight && !cut.reduced ? Array.from({ length: 6 }, (_, i) => <i key={i} className="botte-dust" />) : null}
            </span>
          </span>
          <span className="botte-title">
            <b>{cut.title}</b>
            <i>{"★".repeat(cut.tier)}</i>
          </span>
        </span>
      </span>
      {!cut.reduced && knight ? <span className="botte-fx">{Array.from({ length: cut.slashes }, (_, i) => <span key={i} className="botte-slash" />)}</span> : null}
      {!cut.reduced && !knight ? (
        <span className="botte-fx">
          {cut.tier >= 2 ? Array.from({ length: cut.tier === 3 ? 3 : 2 }, (_, i) => {
            const size = 120 + i * 90 + (cut.tier === 3 ? 80 : 0);
            return <span key={`g${i}`} className="botte-gust" style={{ width: size, height: size, margin: `${-size / 2}px 0 0 ${-size / 2}px` }} />;
          }) : null}
          {Array.from({ length: leaves }, (_, i) => <span key={i} className="botte-leaf"><i /></span>)}
        </span>
      ) : null}
      <span className="botte-tint" />
      {cut.cracks && !cut.reduced ? (
        <>
          <span className="botte-flash" />
          <svg className="botte-cracks" viewBox={`0 0 ${view.W} ${view.H}`} preserveAspectRatio="none" aria-hidden>
            {cracks.map((p, i) => <polyline key={i} points={p} pathLength={100} />)}
          </svg>
          {pierce ? <span className="botte-pierce">PERCE LA PARADE !</span> : null}
        </>
      ) : null}
      <span className="botte-skip">Toucher pour passer</span>
    </button>
  );
}
