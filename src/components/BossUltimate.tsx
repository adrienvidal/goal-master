"use client";
// Duel perdu : le boss lance son attaque ultime et met les héros K.O. (cadrage boss-finale).
import { useRef } from "react";
import { BOSSES, type BossIndex } from "@/game/duel";
import { H, W, type HeroLook } from "./arena/engine";
import { playUltimate, ultimateRest } from "./arena/ultimate";
import { useArenaScene } from "./arena/useArenaScene";

type Props = { boss: BossIndex; me: HeroLook; partner: HeroLook | null };

export function BossUltimate({ boss, me, partner }: Props): React.ReactElement {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { playing, skip } = useArenaScene(canvas, { setup: { me, partner, boss }, play: playUltimate, rest: ultimateRest }, [boss, me, partner]);

  return (
    <div className="relative w-full border-[3px] border-black bg-[#0b0918]">
      <canvas ref={canvas} width={W} height={H} className="block aspect-video h-auto w-full [image-rendering:pixelated]" aria-label={`${BOSSES[boss]} lance son attaque ultime et vous met K.O.`} />
      {playing ? (
        <button type="button" onClick={skip} className="absolute right-2 top-2 border-2 border-edge bg-night/85 px-2.5 py-1.5 text-sm">
          Passer
        </button>
      ) : null}
    </div>
  );
}
