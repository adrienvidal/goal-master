"use client";
import { useEffect, useRef } from "react";
import { drawLandscape, LANDSCAPE_H, LANDSCAPE_NAMES, LANDSCAPE_W, type LandscapeId } from "@/lib/landscapes";

type Props = { id: LandscapeId; className?: string; label?: boolean };

// Paysage 8 bits en pixels nets ; en fond d'écran (className « landscape-bg ») ou en vignette de choix.
export function Landscape({ id, className = "", label = false }: Props): React.ReactElement {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (ctx) drawLandscape(ctx, id);
  }, [id]);
  return (
    <canvas
      ref={ref}
      width={LANDSCAPE_W}
      height={LANDSCAPE_H}
      className={`landscape ${className}`}
      role={label ? "img" : undefined}
      aria-label={label ? LANDSCAPE_NAMES[id] : undefined}
      aria-hidden={label ? undefined : true}
    />
  );
}
