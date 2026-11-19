"use client";
// Boss final de l'écran de fin d'objectif : la quête rejouée en un combat (cadrage boss-finale).
import { useEffect, useRef, useState } from "react";
import { BOSSES } from "@/game/duel";
import type { Finale } from "@/game/finale";
import { Arena, Cancelled, H, pairTints, W, type HeroLook } from "./arena/engine";
import { finaleRest, playFinale, type FinaleHud } from "./arena/finale";

const WEEK_CLASS = { "": "bg-stone-2", w: "bg-gold", l: "bg-danger", f: "bg-[var(--ok)]" } as const;

export function BossFinale({ finale, me, partner, names }: { finale: Finale; me: HeroLook; partner: HeroLook | null; names: [string, string] }): React.ReactElement {
  const canvas = useRef<HTMLCanvasElement>(null);
  const skip = useRef<() => void>(() => undefined);
  const [playing, setPlaying] = useState(true);
  const [hud, setHud] = useState<FinaleHud>({ left: finale.totalHp, mine: 0, theirs: 0, weeks: finale.weeks.map(() => "") });

  useEffect(() => {
    if (!canvas.current) return;
    const A = new Arena({ canvas: canvas.current, me, partner: finale.duo ? partner : null, boss: finale.boss });
    let over = false;
    const rest = (): void => {
      if (over) return;
      over = true;
      A.cancel();
      setHud(finaleRest(A, finale));
      setPlaying(false);
    };
    skip.current = rest;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) rest();
    else
      playFinale(A, finale, (p) => setHud((h) => ({ ...h, ...p })))
        .then(() => {
          over = true;
          setPlaying(false);
        })
        .catch((e: unknown) => {
          if (!(e instanceof Cancelled)) throw e;
        });
    return () => A.destroy();
  }, [finale, me, partner]);

  const total = Math.max(1, hud.mine + hud.theirs);
  const [tMe, tMate] = pairTints(me.color);
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="relative border-[3px] border-black bg-[#0b0918]">
        <canvas ref={canvas} width={W} height={H} className="block aspect-video h-auto w-full [image-rendering:pixelated]" aria-label={`Combat contre le boss final, ${BOSSES[finale.boss]}`} />
        {playing ? (
          <button type="button" onClick={() => skip.current()} className="absolute right-2 top-2 border-2 border-edge bg-night/85 px-2.5 py-1.5 text-sm">
            Passer
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-left">
        <span className="font-display text-[10px] leading-relaxed text-[#c9b8ff]">{BOSSES[finale.boss]} · boss final</span>
        <span className="num">{hud.left} / {finale.totalHp} PV</span>
      </div>
      <div className="h-[18px] border-[3px] border-[#c9b8ff] bg-night" role="img" aria-label={`${hud.left} points de vie sur ${finale.totalHp}`}>
        <i className="block h-full bg-danger transition-[width] duration-100" style={{ width: `${(hud.left / finale.totalHp) * 100}%` }} />
      </div>
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${finale.weeks.length}, 1fr)` }} aria-hidden>
        {hud.weeks.map((w, i) => (
          <span key={i} className={`h-2.5 ${WEEK_CLASS[w]}`} />
        ))}
      </div>
      {finale.duo ? (
        <>
          <div className="flex h-2.5 bg-stone-2" role="img" aria-label={`Part des coups : ${names[0]} ${hud.mine}, ${names[1]} ${hud.theirs}`}>
            <i className="block h-full" style={{ width: `${(hud.mine / total) * 100}%`, background: tMe.bar }} />
            <i className="block h-full" style={{ width: `${(hud.theirs / total) * 100}%`, background: tMate.bar }} />
          </div>
          <p className="flex justify-between gap-2 text-sm text-muted">
            <span>{names[0]} <b className="num" style={{ color: tMe.text }}>{hud.mine}</b> coups</span>
            <span>{names[1]} <b className="num" style={{ color: tMate.text }}>{hud.theirs}</b> coups</span>
          </p>
        </>
      ) : null}
    </div>
  );
}
