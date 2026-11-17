"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
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
    show({ by: last.by, kind: last.kind, amount: last.amount, replay: !already });
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

function staging(f: StageFighter, fx: Fx | null): { pose: Pose; recoil: boolean; moving: boolean; float: { text: string; heal: boolean } | null } {
  const rest: Pose = f.parry ? "parry" : "rest";
  if (!fx) return { pose: rest, recoil: false, moving: false, float: null };
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
  return { pose, recoil, moving: recoil || pose !== rest, float };
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
        </span>
        {st.float ? <span key={`float-${fx?.n}`} className={`arena-dmg ${st.float.heal ? "heal" : ""}`}>{st.float.text}</span> : null}
      </div>
    </div>
  );
}
