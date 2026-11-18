"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Companion } from "./Companion";
import type { CompanionId } from "@/game/quests";
import type { Mood } from "@/game/avatar";
import type { ArenaKind } from "@/game/arena";
import type { Form } from "@/game/levels";
import type { CharacterId, ColorId } from "@/lib/onboarding";
import type { Pose } from "@/lib/sprites";
import { Bar } from "./Bar";
import { Sprite } from "./Sprite";

// Scène du combat : chaque coup se joue une fois (pose, recul, chiffre), puis le héros revient en garde.
// Mon coup s'anime dès le clic ; la confirmation du serveur n'ajoute que le chiffre tiré.

export type StageFighter = {
  id: string;
  name: string;
  /** Évolution figée à l'acceptation : celle qui fixe les stats du combat. */
  levelForm: number;
  character: CharacterId;
  color: ColorId;
  displayedForm: Form;
  mood: Mood;
  title: string;
  hp: number;
  maxHp: number;
  parry: boolean;
  stunned: boolean;
  /** Compagnon affiché (spec quetes) : décoratif, il saute quand son héros frappe. */
  companion: CompanionId | null;
};
/** Le dernier coup joué, `key` change à chaque nouveau coup. */
export type StageHit = { key: string; by: string; kind: ArenaKind; amount: number; at: string };

type Fx = { by: string; kind: ArenaKind; amount: number | null; replay: boolean; n: number };

const FX_MS = 1000;
/** Un coup plus ancien que ça, trouvé en arrivant sur la page, ne se rejoue pas. */
const FRESH_MS = 30_000;
/** Délai dans lequel la réponse du serveur confirme le coup déjà animé au clic, sans le rejouer. */
const CONFIRM_MS = 15_000;
const VISUAL: ArenaKind[] = ["ATTACK", "THRUST", "WHIRL", "POTION", "PARRY"];

// Effets dessinés des Bottes (maquette arene, section Effets) : une lettre = une couleur, « . » transparent.
const FX_PAL: Record<string, string> = { L: "#fffbe0", W: "#dfe6ee", Y: "#f2c14e", I: "#ffffff", M: "#a8e07a", V: "#6fae4a" };
const FX_GRIDS = {
  slash: [".....LL", "...LWW.", "..WW...", ".LW....", ".W.....", "LW.....", "W......"],
  impact: ["...Y...", ".Y.L.Y.", "..LLL..", "YLLILLY", "..LLL..", ".Y.L.Y.", "...Y..."],
  stars: ["..Y...Y..", "Y.....L..", "...L...Y."],
  heal: ["M.....M", "...V...", "...V...", ".VVVVV.", "...V...", "...V...", "M.....M"],
  leaves: ["..MV....V.", ".......MV.", "MV........", "........MV", ".V..MV....", "......V..."],
} as const;
type FxName = keyof typeof FX_GRIDS;
/** Où l'effet se pose autour du héros (classes de position dans globals.css). */
type FxSpot = { name: FxName; at: "front" | "body" | "head" | "around" | "around-2" | "side" };

function PixelFx({ name, at }: FxSpot): React.ReactElement {
  const grid = FX_GRIDS[name];
  const k = 3;
  return (
    <svg className={`arena-fx at-${at}`} width={grid[0].length * k} height={grid.length * k} viewBox={`0 0 ${grid[0].length} ${grid.length}`} shapeRendering="crispEdges" aria-hidden>
      {grid.flatMap((row, y) => [...row].map((c, x) => (c === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={FX_PAL[c]} />)))}
    </svg>
  );
}

const PlayCtx = createContext<(kind: ArenaKind) => void>(() => {});
const FxCtx = createContext<Fx | null>(null);

/** Lance l'animation de mon coup, avant la réponse du serveur. */
export function usePlayFx(): (kind: ArenaKind) => void {
  return useContext(PlayCtx);
}

export function ArenaLive({ meId, last, children }: { meId: string; last: StageHit | null; children: React.ReactNode }): React.ReactElement {
  const [fx, setFx] = useState<Fx | null>(null);
  const seen = useRef<string | null>(null);
  const optimistic = useRef<{ kind: ArenaKind; at: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback((f: Omit<Fx, "n">) => {
    setFx({ ...f, n: Date.now() });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setFx(null), FX_MS);
  }, []);

  useEffect(() => {
    if (!last || last.key === seen.current) return;
    const first = seen.current === null;
    seen.current = last.key;
    if (first && Date.now() - new Date(last.at).getTime() > FRESH_MS) return;
    const o = optimistic.current;
    optimistic.current = null;
    const already = o !== null && last.by === meId && o.kind === last.kind && Date.now() - o.at < CONFIRM_MS;
    if (!already) {
      show({ by: last.by, kind: last.kind, amount: last.amount, replay: true });
      return;
    }
    // Confirmation de mon coup : l'animation lancée au clic continue, seul le chiffre tiré s'ajoute.
    if (Date.now() - o.at < FX_MS) setFx((cur) => (cur ? { ...cur, amount: last.amount } : cur));
    else show({ by: last.by, kind: last.kind, amount: last.amount, replay: false });
  }, [last, meId, show]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const play = useCallback(
    (kind: ArenaKind) => {
      if (!VISUAL.includes(kind)) return;
      optimistic.current = { kind, at: Date.now() };
      show({ by: meId, kind, amount: null, replay: true });
    },
    [meId, show],
  );

  return (
    <PlayCtx.Provider value={play}>
      <FxCtx.Provider value={fx}>{children}</FxCtx.Provider>
    </PlayCtx.Provider>
  );
}

/** Effets des Bottes : traînée et impact pour Coup d'estoc ; feuilles, soin et étoiles pour Bambou tourbillon. */
function botteFx(mine: boolean, fx: Fx): FxSpot[] {
  if (!fx.replay) return [];
  if (fx.kind === "THRUST") return mine ? [{ name: "slash", at: "front" }] : [{ name: "impact", at: "body" }];
  if (fx.kind === "WHIRL") return mine ? [{ name: "leaves", at: "around" }, { name: "leaves", at: "around-2" }, { name: "heal", at: "side" }] : [{ name: "stars", at: "head" }];
  return [];
}

function staging(f: StageFighter, fx: Fx | null): { pose: Pose; recoil: boolean; moving: boolean; float: { text: string; heal: boolean } | null; effects: FxSpot[] } {
  const rest: Pose = f.parry ? "parry" : "rest";
  if (!fx) return { pose: rest, recoil: false, moving: false, float: null, effects: [] };
  const mine = fx.by === f.id;
  const strike = fx.kind === "ATTACK" || fx.kind === "THRUST";
  let pose: Pose = rest;
  if (mine && fx.replay) {
    if (strike || fx.kind === "WHIRL") pose = "action";
    if (fx.kind === "POTION") pose = "potion";
    if (fx.kind === "PARRY") pose = "parry";
  }
  const recoil = !mine && strike && fx.replay;
  let float: { text: string; heal: boolean } | null = null;
  if (fx.amount !== null) {
    if (!mine && strike) float = { text: `-${fx.amount}`, heal: false };
    if (mine && (fx.kind === "WHIRL" || fx.kind === "POTION")) float = { text: `+${fx.amount}`, heal: true };
  }
  return { pose, recoil, moving: recoil || pose !== rest, float, effects: botteFx(mine, fx) };
}

export function StageFighterView({ f, right, isMe }: { f: StageFighter; right: boolean; isMe: boolean }): React.ReactElement {
  const fx = useContext(FxCtx);
  const st = staging(f, fx);
  const low = f.hp <= f.maxHp / 3;
  const body = ["arena-body", right ? "flip" : "", f.stunned ? "stun" : "", st.recoil ? (right ? "recoil-right" : "recoil-left") : ""].filter(Boolean).join(" ");
  return (
    <div className={`flex flex-col gap-2 ${right ? "items-end text-right" : ""}`}>
      <div className={`flex flex-wrap items-baseline gap-1.5 text-sm ${right ? "justify-end" : ""}`}>
        <b>{isMe ? "Toi" : f.name}</b>
        <span className="text-[13px] text-muted">Évol. {f.levelForm}</span>
      </div>
      <div className="w-full max-w-[180px]">
        <Bar value={f.hp} max={f.maxHp} tone="green" color={low ? "#ff6b6b" : undefined} label={`PV : ${isMe ? "toi" : f.name}`} />
        <span className="num">{f.hp}/{f.maxHp}</span>
      </div>
      <div className="relative flex min-h-[72px] items-end">
        <span key={st.moving ? `body-${fx?.n}` : "body"} className={body}>
          <Sprite character={f.character} color={f.color} form={f.displayedForm} mood={f.mood} pose={st.pose} px={4} label={f.title} />
          {st.effects.map((e) => <PixelFx key={`${e.name}-${e.at}-${fx?.n}`} {...e} />)}
        </span>
        {f.companion ? <Companion id={f.companion} px={3} joy={st.pose === "action"} className={right ? "order-first -scale-x-100 mr-1" : "ml-1"} /> : null}
        {st.float ? <span key={`float-${fx?.n}`} className={`arena-dmg ${st.float.heal ? "heal" : ""}`}>{st.float.text}</span> : null}
      </div>
    </div>
  );
}
