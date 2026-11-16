"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Mood } from "@/game/avatar";
import type { Form } from "@/game/levels";
import type { CharacterId, ColorId } from "@/lib/onboarding";
import { Sprite } from "./Sprite";

export type Walker = { pseudo: string; level: number; character: CharacterId; color: ColorId; form: Form; mood: Mood; hurt: boolean; status: string | null; crown?: boolean };

// Trajets des deux héros : le premier part de la gauche, le second de la droite.
const PATHS = [
  { from: "24%", to: "60%", dur: 14, face: 1, delay: 0 },
  { from: "76%", to: "42%", dur: 18, face: -1, delay: -3 },
];

export function EyeIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 10 10" width="20" height="20" shapeRendering="crispEdges" fill="#f1ecff" aria-hidden>
      <rect x="3" y="2" width="4" height="1" /><rect x="1" y="3" width="2" height="1" /><rect x="7" y="3" width="2" height="1" />
      <rect x="0" y="4" width="2" height="2" /><rect x="8" y="4" width="2" height="2" /><rect x="4" y="4" width="2" height="2" fill="#f2c14e" />
      <rect x="1" y="6" width="2" height="1" /><rect x="7" y="6" width="2" height="1" /><rect x="3" y="7" width="4" height="1" />
    </svg>
  );
}

// Vue décor : l'œil efface la carte, les héros se promènent dans le paysage ; toucher n'importe où ramène la carte.
export function DecorView({ walkers }: { walkers: Walker[] }): React.ReactElement {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (!open) {
      delete root.dataset.decor;
      return;
    }
    root.dataset.decor = "1";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      delete root.dataset.decor;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button type="button" className="eye-btn" aria-label="Masquer la carte pour voir le décor" onClick={() => setOpen(true)}>
        <EyeIcon />
      </button>
      {open
        ? createPortal(
            <button type="button" className="decor" aria-label="Revenir à l'accueil" onClick={() => setOpen(false)} autoFocus>
              {walkers.map((w, i) => {
                const path = PATHS[i % PATHS.length];
                const sitting = w.mood === "sleep" || w.mood === "exhausted";
                const slow = w.mood === "tired" ? 1.6 : 1;
                const style = { "--from": path.from, "--to": path.to, "--dur": `${path.dur * slow}s`, "--steps": path.dur * slow * 4, "--face": path.face, "--delay": `${path.delay}s` } as React.CSSProperties;
                return (
                  <span key={w.pseudo} className={`walker ${sitting ? "sitting" : ""}`} style={style}>
                    <span className={`tag ${w.status ? "sad" : ""}`}>{w.status ?? `${w.pseudo} · Niv. ${w.level}`}</span>
                    <span className="facer">
                      <span className="sizer">
                        <Sprite character={w.character} color={w.color} form={w.form} mood={w.mood} px={4} hurt={w.hurt} crown={w.crown} />
                      </span>
                    </span>
                  </span>
                );
              })}
              <span className="decor-hint">Toucher pour revenir</span>
            </button>,
            document.body,
          )
        : null}
    </>
  );
}
