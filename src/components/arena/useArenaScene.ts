"use client";
// Monte une scène de combat sur un canvas : la joue, ou affiche d'office son image finale quand
// l'appareil demande moins d'animations ; « Passer » saute à cette image finale.
import { useEffect, useRef, useState, type RefObject } from "react";
import { Arena, Cancelled, type ArenaSetup } from "./engine";

type Scene = { setup: Omit<ArenaSetup, "canvas">; play: (A: Arena) => Promise<void>; rest: (A: Arena) => void };

export function useArenaScene(canvas: RefObject<HTMLCanvasElement | null>, scene: Scene, deps: unknown[]): { playing: boolean; skip: () => void } {
  const skip = useRef<() => void>(() => undefined);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!canvas.current) return;
    const A = new Arena({ canvas: canvas.current, ...scene.setup });
    let over = false;
    const toRest = (): void => {
      if (over) return;
      over = true;
      A.cancel();
      scene.rest(A);
      setPlaying(false);
    };
    skip.current = toRest;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) toRest();
    else
      scene
        .play(A)
        .then(() => {
          over = true;
          setPlaying(false);
        })
        .catch((e: unknown) => {
          if (!(e instanceof Cancelled)) throw e;
        });
    return () => A.destroy();
    // La scène se rejoue seulement quand ses données changent (deps), pas à chaque rendu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { playing, skip: () => skip.current() };
}
