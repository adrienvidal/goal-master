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
  /** Nom donné au compagnon (ou l'espèce). */
  companionName: string | null;
};
/**
 * Un coup visible du journal, dans l'ordre du combat. `hpBefore` / `hpAfter` : PV des deux avant et après,
 * `logStart` / `logEnd` : premières et dernières lignes du journal qui l'accompagne (Parade qui rend 1 PA comprise), pour le rejeu pas à pas.
 */
export type StageHit = { key: string; by: string; kind: ArenaKind; amount: number; at: string; label: string; hpBefore: Record<string, number>; hpAfter: Record<string, number>; logStart: number; logEnd: number };

type Fx = { by: string; kind: ArenaKind; amount: number | null; replay: boolean; n: number };

const FX_MS = 1000;
/** Durée d'un coup de l'adversaire rejoué (spec arene v2). */
const STEP_MS = 1500;
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
/** Pendant un rejeu : PV affichés, dernière ligne du journal visible, actions verrouillées. */
type Replay = { hp: Record<string, number> | null; logEnd: number | null; locked: boolean };
const ReplayCtx = createContext<Replay>({ hp: null, logEnd: null, locked: false });

/** Lance l'animation de mon coup, avant la réponse du serveur. */
export function usePlayFx(): (kind: ArenaKind) => void {
  return useContext(PlayCtx);
}
export function useReplay(): Replay {
  return useContext(ReplayCtx);
}

const seenKey = (arenaId: string) => `gm-arena-seen:${arenaId}`;
function readSeen(arenaId: string): string | null {
  try {
    return localStorage.getItem(seenKey(arenaId));
  } catch {
    return null;
  }
}
function writeSeen(arenaId: string, at: string): void {
  try {
    localStorage.setItem(seenKey(arenaId), at);
  } catch {
    /* stockage indisponible (navigation privée) : on rejouera un peu plus la prochaine fois */
  }
}

/**
 * Rejeu et direct (spec arene v2) : les coups de l'adversaire pas encore vus sur cet appareil se rejouent un par un,
 * à l'arrivée (avec le bandeau « Pendant ton absence ») comme à chaque rafraîchissement de 3 s. Mon coup s'anime au clic.
 */
export function ArenaLive({ arenaId, meId, foeName, hits, children }: { arenaId: string; meId: string; foeName: string; hits: StageHit[]; children: React.ReactNode }): React.ReactElement {
  const [fx, setFx] = useState<Fx | null>(null);
  const [queue, setQueue] = useState<StageHit[]>([]);
  const [step, setStep] = useState<StageHit | null>(null);
  const [banner, setBanner] = useState<{ total: number; done: number; lost: number } | null>(null);
  const known = useRef<string | null>(null);
  const optimistic = useRef<{ kind: ArenaKind; at: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastAt = hits.at(-1)?.at ?? null;

  const show = useCallback((f: Omit<Fx, "n">) => {
    setFx({ ...f, n: Date.now() });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setFx(null), FX_MS);
  }, []);

  // Coups arrivés depuis le dernier passage : à l'ouverture, ceux que cet appareil n'a pas vus ; ensuite, les nouveaux.
  useEffect(() => {
    const first = known.current === null;
    const since = first ? readSeen(arenaId) : known.current;
    known.current = lastAt ?? "";
    let fresh = since ? hits.filter((h) => h.at > since) : hits.slice(hits.findLastIndex((h) => h.by === meId) + 1);
    if (first && !since) fresh = fresh.filter((h) => h.by !== meId);
    const mine = fresh.filter((h) => h.by === meId);
    const theirs = fresh.filter((h) => h.by !== meId);
    // Confirmation de mon coup : l'animation lancée au clic continue, seul le chiffre tiré s'ajoute.
    const o = optimistic.current;
    const confirmed = mine.at(-1);
    if (o && confirmed && confirmed.kind === o.kind && Date.now() - o.at < CONFIRM_MS) {
      optimistic.current = null;
      if (Date.now() - o.at < FX_MS) setFx((cur) => (cur ? { ...cur, amount: confirmed.amount } : cur));
    }
    if (theirs.length === 0) {
      if (lastAt && queue.length === 0 && !step) writeSeen(arenaId, lastAt);
      return;
    }
    if (first) setBanner({ total: theirs.length, done: 0, lost: theirs[0].hpBefore[meId] - theirs[theirs.length - 1].hpAfter[meId] });
    setQueue((q) => [...q, ...theirs]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seuls les nouveaux coups déclenchent le rejeu
  }, [lastAt]);

  // Un coup à la fois : animation, PV et journal de ce coup, puis le suivant après STEP_MS.
  useEffect(() => {
    if (step || queue.length === 0) return;
    const [next, ...rest] = queue;
    setStep(next);
    setQueue(rest);
    show({ by: next.by, kind: next.kind, amount: next.amount, replay: true });
    setBanner((b) => (b ? { ...b, done: b.done + 1 } : b));
    writeSeen(arenaId, next.at);
  }, [queue, step, show, arenaId]);

  useEffect(() => {
    if (!step) return;
    const t = setTimeout(() => setStep(null), STEP_MS);
    return () => clearTimeout(t);
  }, [step]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const skip = useCallback(() => {
    setQueue([]);
    setStep(null);
    setFx(null);
    setBanner((b) => (b ? { ...b, done: b.total } : b));
    if (lastAt) writeSeen(arenaId, lastAt);
  }, [arenaId, lastAt]);

  const play = useCallback(
    (kind: ArenaKind) => {
      if (!VISUAL.includes(kind)) return;
      optimistic.current = { kind, at: Date.now() };
      show({ by: meId, kind, amount: null, replay: true });
    },
    [meId, show],
  );

  const busy = step !== null || queue.length > 0;
  const replay: Replay = step
    ? { hp: step.hpAfter, logEnd: step.logEnd, locked: true }
    : queue.length
      ? { hp: queue[0].hpBefore, logEnd: queue[0].logStart - 1, locked: true }
      : { hp: null, logEnd: null, locked: false };

  return (
    <PlayCtx.Provider value={play}>
      <FxCtx.Provider value={fx}>
        <ReplayCtx.Provider value={replay}>
          {banner ? (
            <div className={`arena-replay ${busy ? "" : "done"}`} role="status">
              <div className="flex min-w-0 flex-col gap-0.5">
                <small className="text-[13px] text-muted">{busy ? `Pendant ton absence, ${foeName} a joué · ${banner.done}/${banner.total}` : `${foeName} a joué ${banner.total} action${banner.total > 1 ? "s" : ""}`}</small>
                <b className="font-display text-[10px] leading-relaxed">{busy ? (step?.label ?? "…") : banner.lost > 0 ? `Tu as perdu ${banner.lost} PV` : "Aucun dégât pour toi"}</b>
              </div>
              <div className="dots" aria-hidden>{Array.from({ length: banner.total }, (_, i) => <i key={i} className={!busy || i < banner.done ? "on" : ""} />)}</div>
              {busy ? <button type="button" className="btn ghost !w-auto !px-3 !py-2 !text-[9px]" onClick={skip}>Passer</button> : <button type="button" className="text-sm text-muted underline" onClick={() => setBanner(null)}>Fermer</button>}
            </div>
          ) : null}
          {children}
        </ReplayCtx.Provider>
      </FxCtx.Provider>
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

export function StageFighterView({ f: given, right, isMe }: { f: StageFighter; right: boolean; isMe: boolean }): React.ReactElement {
  const fx = useContext(FxCtx);
  const { hp } = useContext(ReplayCtx);
  const f = hp ? { ...given, hp: hp[given.id] ?? given.hp } : given;
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
        {f.companion ? <Companion id={f.companion} px={3} label={f.companionName ?? undefined} joy={st.pose === "action"} className={right ? "order-first -scale-x-100 mr-1" : "ml-1"} /> : null}
        {st.float ? <span key={`float-${fx?.n}`} className={`arena-dmg ${st.float.heal ? "heal" : ""}`}>{st.float.text}</span> : null}
      </div>
    </div>
  );
}

export type JournalLine = { index: number; time: string; text: string; tone: "me" | "foe" | "sys" };

/** Journal du combat, du plus récent au plus ancien ; pendant un rejeu, les lignes pas encore rejouées attendent leur tour. */
export function ArenaJournal({ lines, empty }: { lines: JournalLine[]; empty: string }): React.ReactElement {
  const { logEnd } = useContext(ReplayCtx);
  const shown = logEnd === null ? lines : lines.filter((l) => l.index <= logEnd);
  return (
    <ol className="flex flex-col gap-1.5 text-sm">
      {shown.length === 0 ? <li className="text-muted">{empty}</li> : null}
      {shown.map((l) => (
        <li key={l.index} className="grid grid-cols-[52px_1fr] gap-2">
          <time className="num text-muted">{l.time}</time>
          <span className={`${l.tone === "sys" ? "italic text-muted" : l.tone === "me" ? "text-[#5aa9ff]" : "text-[#e5533d]"} ${logEnd !== null && l.index > logEnd - 2 ? "arena-log-fresh" : ""}`}>{l.text}</span>
        </li>
      ))}
    </ol>
  );
}

/** Pastille de présence : le binôme a l'Arène ouverte (vu il y a moins de 10 s), ou la connexion est perdue. */
export function ArenaPresence({ name, here }: { name: string; here: boolean }): React.ReactElement {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  if (!online) return <span className="arena-presence lost" role="status"><i />Connexion perdue · on réessaie</span>;
  return <span className={`arena-presence ${here ? "" : "off"}`}><i />{here ? `${name} est dans l'Arène` : `${name} n'est pas dans l'Arène`}</span>;
}
