"use client";
// Duel perdu : le boss lance son attaque ultime et met les héros K.O. (cadrage boss-finale).
import { useEffect, useRef, useState } from "react";
import { BOSSES, type BossIndex } from "@/game/duel";
import { Arena, Cancelled, H, W, type HeroLook } from "./arena/engine";
import { playUltimate, ultimateRest } from "./arena/ultimate";

export function BossUltimate({ boss, me, partner }: { boss: BossIndex; me: HeroLook; partner: HeroLook | null }): React.ReactElement {
  const canvas = useRef<HTMLCanvasElement>(null);
  const skip = useRef<() => void>(() => undefined);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!canvas.current) return;
    const A = new Arena({ canvas: canvas.current, me, partner, boss });
    let over = false;
    const rest = (): void => {
      if (over) return;
      over = true;
      A.cancel();
      ultimateRest(A);
      setPlaying(false);
    };
    skip.current = rest;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) rest();
    else
      playUltimate(A)
        .then(() => {
          over = true;
          setPlaying(false);
        })
        .catch((e: unknown) => {
          if (!(e instanceof Cancelled)) throw e;
        });
    return () => A.destroy();
  }, [boss, me, partner]);

  return (
    <div className="relative w-full border-[3px] border-black bg-[#0b0918]">
      <canvas ref={canvas} width={W} height={H} className="block aspect-video h-auto w-full [image-rendering:pixelated]" aria-label={`${BOSSES[boss]} lance son attaque ultime et vous met K.O.`} />
      {playing ? (
        <button type="button" onClick={() => skip.current()} className="absolute right-2 top-2 border-2 border-edge bg-night/85 px-2.5 py-1.5 text-sm">
          Passer
        </button>
      ) : null}
    </div>
  );
}
