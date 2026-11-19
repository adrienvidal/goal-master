"use client";
import { useEffect, useRef } from "react";
import { renderLandscape } from "@/lib/landscapeArt";
import { LANDSCAPE_NAMES, landscapeGrid, parisHour, SCENE_H, SCENE_W, type LandscapeId } from "@/lib/landscapes";

type Props = { id: LandscapeId; className?: string; label?: boolean };

const FRAME_MS = 125; // 8 images par seconde
const quarter = (h: number) => Math.round(h * 4);

/**
 * Paysage 8 bits. En fond d'écran (sans `label`) : dessiné à la forme de la fenêtre, animé, le ciel suit
 * l'heure de Paris ; aucune image tant que la page est cachée ; figé si l'appareil demande moins
 * d'animations. En vignette (`label`, Réglages) : 320 × 180, fixe, à l'heure actuelle.
 */
export function Landscape({ id, className = "", label = false }: Props): React.ReactElement {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (label) {
      const draw = () => renderLandscape(canvas, id, parisHour(), 0, { w: SCENE_W, h: SCENE_H });
      draw();
      const timer = window.setInterval(draw, 60_000);
      return () => window.clearInterval(timer);
    }

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let grid = landscapeGrid(window.innerWidth, window.innerHeight);
    let hour = parisHour();
    let frame = 0;
    let last = 0;
    let lastHourCheck = 0;
    let drawnKey = "";
    let raf = 0;
    let resizeTimer = 0;

    const paint = (force = false) => {
      // Caché (encart job-finder, où l'iframe peut ne faire que 50 px de haut) : rien à dessiner, et pas de calcul inutile.
      if (canvas.getClientRects().length === 0) return;
      const still = motion.matches;
      const key = `${quarter(hour)}|${grid.w}x${grid.h}`;
      if (still && !force && key === drawnKey) return;
      renderLandscape(canvas, id, hour, still ? 0 : frame, grid);
      drawnKey = key;
    };
    const tick = (t: number) => {
      raf = window.requestAnimationFrame(tick);
      if (document.hidden || t - last < FRAME_MS) return;
      last = t;
      if (t - lastHourCheck > 10_000) { hour = parisHour(); lastHourCheck = t; }
      if (!motion.matches) frame++;
      paint();
    };
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => { grid = landscapeGrid(window.innerWidth, window.innerHeight); paint(true); }, 200);
    };
    const onVisible = () => { if (!document.hidden) { hour = parisHour(); paint(true); } };

    paint(true);
    raf = window.requestAnimationFrame(tick);
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [id, label]);

  return (
    <canvas
      ref={ref}
      width={SCENE_W}
      height={SCENE_H}
      className={`landscape ${className}`}
      role={label ? "img" : undefined}
      aria-label={label ? LANDSCAPE_NAMES[id] : undefined}
      aria-hidden={label ? undefined : true}
    />
  );
}
