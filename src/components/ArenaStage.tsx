"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Companion } from "./Companion";
import type { CompanionId } from "@/game/quests";
import type { Mood } from "@/game/avatar";
import type { ArenaKind } from "@/game/arena";
import type { Form } from "@/game/levels";
import type { CharacterId, ColorId } from "@/lib/onboarding";
import type { Pose } from "@/lib/sprites";
import { decayTrauma, impactOf, shakeOffset } from "@/lib/arenaImpact";
import { botteCut, type BotteCut } from "@/lib/arenaBotte";
import { BotteCutIn } from "./BotteCutIn";
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
export type StageHit = { key: string; by: string; kind: ArenaKind; amount: number; at: string; label: string; hpBefore: Record<string, number>; hpAfter: Record<string, number>; logStart: number; logEnd: number; /** Coup encaissé par une Parade (elle rend 1 PA). */ parried: boolean };

/**
 * Coup en cours d'affichage. `delta` : variation des PV de chacun (connue au rejeu, ou dès que le serveur confirme mon coup) ;
 * `ko` : ce coup met un héros à terre (lot Impact : gel le plus long).
 */
type Fx = { by: string; kind: ArenaKind; amount: number | null; replay: boolean; n: number; delta: Record<string, number> | null; parried: boolean; ko: boolean; /** Chiffres arrivés du serveur après le contact : ils jaillissent tout de suite. */ late?: boolean };

function deltaOf(h: StageHit): Record<string, number> {
  return Object.fromEntries(Object.keys(h.hpAfter).map((id) => [id, h.hpAfter[id] - (h.hpBefore[id] ?? h.hpAfter[id])]));
}
const knocksOut = (h: StageHit) => Object.entries(h.hpAfter).some(([id, v]) => v === 0 && (h.hpBefore[id] ?? 0) > 0);

/** Durée d'affichage d'un coup : contact, gel le plus long (K.O.) et chiffre compris, sous le pas de rejeu. */
const FX_MS = 1480;
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
type FxSpot = { name: FxName; at: "front" | "body" | "head" | "around" | "around-2" | "side"; /** Attend le contact du coup. */ late?: boolean };

function PixelFx({ name, at, late }: FxSpot): React.ReactElement {
  const grid = FX_GRIDS[name];
  const k = 3;
  return (
    <svg className={`arena-fx at-${at} ${late ? "late" : ""}`} width={grid[0].length * k} height={grid.length * k} viewBox={`0 0 ${grid[0].length} ${grid.length}`} shapeRendering="crispEdges" aria-hidden>
      {grid.flatMap((row, y) => [...row].map((c, x) => (c === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={FX_PAL[c]} />)))}
    </svg>
  );
}

const PlayCtx = createContext<(kind: ArenaKind) => void>(() => {});
const FxCtx = createContext<Fx | null>(null);
/** Pendant un rejeu : PV affichés, dernière ligne du journal visible, actions verrouillées ; `finale` : fin du combat annoncée. */
type Replay = { hp: Record<string, number> | null; logEnd: number | null; locked: boolean; finale?: "ko" | "time" | null };
const ReplayCtx = createContext<Replay>({ hp: null, logEnd: null, locked: false, finale: null });

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
/** Pause sur « K.O. ! » ou « Temps écoulé ! » avant d'ouvrir le résultat (un peu plus pour le K.O., qui flashe et claque). */
const FINALE_MS = 2200;
const FINALE_KO_MS = 2800;

/**
 * `ended` : le combat est fini, par K.O. ou à l'échéance. Le rejeu va jusqu'au bout, la scène annonce la fin,
 * puis le résultat s'ouvre tout seul (le bouton reste en secours).
 */
/** Botte plein écran en cours : elle précède `show()` du coup, le mien comme celui du rejeu. */
/** `hp` : PV des deux au départ, gardés à l'écran pendant la séquence (la réponse du serveur arrive avant le contact). */
type Cut = { origin: "mine" | "replay"; by: string; kind: ArenaKind; n: number; spec: BotteCut; pierce: boolean; hp: Record<string, number> };

export function ArenaLive({ arenaId, meId, foeName, hits, ended, fighters, children }: { arenaId: string; meId: string; foeName: string; hits: StageHit[]; ended: "ko" | "time" | null; fighters: StageFighter[]; children: React.ReactNode }): React.ReactElement {
  const router = useRouter();
  const [fx, setFx] = useState<Fx | null>(null);
  const [queue, setQueue] = useState<StageHit[]>([]);
  const [step, setStep] = useState<StageHit | null>(null);
  const [banner, setBanner] = useState<{ total: number; done: number; lost: number } | null>(null);
  // Au rejeu, les PV ne changent qu'au contact du coup, pas à son départ.
  const [landed, setLanded] = useState(true);
  const known = useRef<string | null>(null);
  const optimistic = useRef<{ kind: ArenaKind; at: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [cut, setCut] = useState<Cut | null>(null);
  const cutRef = useRef<Cut | null>(null);
  cutRef.current = cut;
  // Confirmation de mon coup arrivée pendant la Botte plein écran : appliquée au départ de l'impact.
  const pending = useRef<StageHit | null>(null);
  const lastAt = hits.at(-1)?.at ?? null;

  const show = useCallback((f: Omit<Fx, "n">) => {
    setFx({ ...f, n: Date.now() });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setFx(null), FX_MS);
  }, []);

  // Botte du combattant `by` : la séquence plein écran, ou rien (autre action, combattant inconnu).
  const cutFor = useCallback(
    (origin: Cut["origin"], by: string, kind: ArenaKind): Cut | null => {
      const f = fighters.find((x) => x.id === by);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const spec = f ? botteCut(kind, f.levelForm, { replay: origin === "replay", reduced }) : null;
      if (!f || !spec) return null;
      const target = fighters.find((x) => x.id !== by);
      return { origin, by, kind, n: Date.now(), spec, pierce: origin === "mine" && spec.cracks && !!target?.parry, hp: Object.fromEntries(fighters.map((x) => [x.id, x.hp])) };
    },
    [fighters],
  );

  // Coups arrivés depuis le dernier passage : à l'ouverture, ceux que cet appareil n'a pas vus ; ensuite, les nouveaux.
  useEffect(() => {
    const first = known.current === null;
    const since = first ? readSeen(arenaId) : known.current;
    known.current = lastAt ?? "";
    // Sans trace sur cet appareil : seulement les coups de l'adversaire depuis mon dernier coup.
    const fresh = since !== null ? hits.filter((h) => h.at > since) : hits.slice(hits.findLastIndex((h) => h.by === meId) + 1);
    const mine = fresh.filter((h) => h.by === meId);
    const theirs = fresh.filter((h) => h.by !== meId);
    // Confirmation de mon coup : l'animation lancée au clic continue, seul le chiffre tiré s'ajoute.
    const o = optimistic.current;
    const confirmed = mine.at(-1);
    if (o && confirmed && confirmed.kind === o.kind && Date.now() - o.at < CONFIRM_MS) {
      optimistic.current = null;
      if (cutRef.current?.origin === "mine") pending.current = confirmed;
      else if (Date.now() - o.at < FX_MS) setFx((cur) => (cur ? { ...cur, amount: confirmed.amount, delta: deltaOf(confirmed), parried: confirmed.parried, late: Date.now() - cur.n >= (impactOf(cur.kind, { parried: false, ko: false })?.at ?? 0) } : cur));
    }
    if (theirs.length === 0) {
      if (lastAt && queue.length === 0 && !step) writeSeen(arenaId, lastAt);
      return;
    }
    setBanner(first ? { total: theirs.length, done: 0, lost: theirs[0].hpBefore[meId] - theirs[theirs.length - 1].hpAfter[meId] } : null);
    setQueue((q) => [...q, ...theirs]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seuls les nouveaux coups déclenchent le rejeu
  }, [lastAt]);

  // Un coup à la fois : animation, PV et journal de ce coup, puis le suivant après STEP_MS.
  useEffect(() => {
    if (step || queue.length === 0) return;
    const [next, ...rest] = queue;
    setStep(next);
    setQueue(rest);
    const c = cutFor("replay", next.by, next.kind);
    if (c) setCut(c);
    else show({ by: next.by, kind: next.kind, amount: next.amount, replay: true, delta: deltaOf(next), parried: next.parried, ko: knocksOut(next) });
    setBanner((b) => (b ? { ...b, done: Math.min(b.total, b.done + 1) } : b));
    writeSeen(arenaId, next.at);
  }, [queue, step, show, arenaId, cutFor]);

  // Pendant la Botte plein écran du rejeu, les PV attendent : le contact et la fin du pas partent après elle.
  const cutting = cut !== null;
  useEffect(() => {
    if (!step) return;
    setLanded(false);
    if (cutting) return;
    const land = setTimeout(() => setLanded(true), impactOf(step.kind, { parried: step.parried, ko: false })?.at ?? 0);
    const t = setTimeout(() => setStep(null), STEP_MS);
    return () => {
      clearTimeout(land);
      clearTimeout(t);
    };
  }, [step, cutting]);

  useEffect(() => () => clearTimeout(timer.current), []);

  // Fin du combat, une fois le dernier coup joué ou rejoué : annonce, puis le résultat s'ouvre tout seul.
  const finished = ended !== null && step === null && queue.length === 0;
  useEffect(() => {
    if (!finished) return;
    if (hits.at(-1)) writeSeen(arenaId, hits.at(-1)!.at);
    const t = setTimeout(() => router.replace("/arene/resultat"), ended === "ko" ? FINALE_KO_MS : FINALE_MS);
    return () => clearTimeout(t);
  }, [finished, ended, router, arenaId, hits]);

  const skip = useCallback(() => {
    setCut(null);
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
      const c = cutFor("mine", meId, kind);
      if (c) {
        pending.current = null;
        setCut(c);
        return;
      }
      show({ by: meId, kind, amount: null, replay: true, delta: null, parried: false, ko: false });
    },
    [meId, show, cutFor],
  );

  // Fin de la Botte plein écran (ou tap) : l'impact du lot Impact part, comme sans elle.
  const cutDone = useCallback(() => {
    const c = cutRef.current;
    setCut(null);
    if (!c) return;
    if (c.origin === "mine") {
      const p = pending.current;
      pending.current = null;
      // Pas encore confirmé : l'horloge de confirmation repart du début de l'impact.
      if (!p && optimistic.current) optimistic.current = { kind: c.kind, at: Date.now() };
      show({ by: meId, kind: c.kind, amount: p?.amount ?? null, replay: true, delta: p ? deltaOf(p) : null, parried: p?.parried ?? false, ko: false });
      return;
    }
    if (step) show({ by: step.by, kind: step.kind, amount: step.amount, replay: true, delta: deltaOf(step), parried: step.parried, ko: knocksOut(step) });
  }, [meId, show, step]);

  const cutFighter = cut ? fighters.find((x) => x.id === cut.by) : undefined;

  const busy = step !== null || queue.length > 0;
  const finale = finished ? ended : null;
  let replay: Replay = { hp: null, logEnd: null, locked: false, finale };
  if (cut?.origin === "mine") replay = { hp: cut.hp, logEnd: null, locked: false, finale };
  else if (step) replay = { hp: landed ? step.hpAfter : step.hpBefore, logEnd: step.logEnd, locked: true, finale };
  else if (queue.length) replay = { hp: queue[0].hpBefore, logEnd: queue[0].logStart - 1, locked: true, finale };

  return (
    <PlayCtx.Provider value={play}>
      <FxCtx.Provider value={fx}>
        <ReplayCtx.Provider value={replay}>
          {cut && cutFighter ? <BotteCutIn key={cut.n} cut={cut.spec} character={cutFighter.character} color={cutFighter.color} form={cutFighter.displayedForm} side={cut.by === meId ? "left" : "right"} pierce={cut.pierce} onDone={cutDone} /> : null}
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
          {ended && !busy ? (
            <>
              <div className={`arena-finale ${ended}`} role="status" aria-live="assertive">{ended === "ko" ? "K.O. !" : "Temps écoulé !"}</div>
              <Link href="/arene/resultat" className="text-center text-sm text-muted underline">Voir le résultat</Link>
            </>
          ) : null}
          {children}
        </ReplayCtx.Provider>
      </FxCtx.Provider>
    </PlayCtx.Provider>
  );
}

/** Effets des Bottes : traînée et impact pour Coup d'estoc ; feuilles, soin et étoiles pour Bambou tourbillon. Ceux de la cible attendent le contact. */
function botteFx(mine: boolean, fx: Fx): FxSpot[] {
  if (!fx.replay) return [];
  if (fx.kind === "THRUST") return mine ? [{ name: "slash", at: "front", late: true }] : [{ name: "impact", at: "body", late: true }];
  if (fx.kind === "WHIRL") return mine ? [{ name: "leaves", at: "around" }, { name: "leaves", at: "around-2" }, { name: "heal", at: "side", late: true }] : [{ name: "stars", at: "head", late: true }];
  return [];
}

/** Chiffre ou mot qui jaillit au contact ; `later` : après le contact (soin du Bambou, PA rendu par la Parade). */
type Float = { text: string; tone: "dmg" | "big" | "heal" | "clang" | "pa"; later?: boolean };
type Staging = { pose: Pose; body: string[]; floats: Float[]; effects: FxSpot[]; sparks: { n: number; tone: "hit" | "big" | "clang" | "leaf" } | null };

// Lot Impact (maquette arene-impact) : l'attaquant prend son élan et s'élance, la cible encaisse au contact
// (flash, recul écrasé, étincelles, chiffre), la Parade tinte, le Bambou fait tourner le Panda.
function staging(f: StageFighter, fx: Fx | null): Staging {
  const rest: Pose = f.hp === 0 ? "ko" : f.parry ? "parry" : "rest";
  const none: Staging = { pose: rest, body: [], floats: [], effects: [], sparks: null };
  if (!fx) return none;
  const mine = fx.by === f.id;
  const strike = fx.kind === "ATTACK" || fx.kind === "THRUST";
  const big = fx.kind === "THRUST";
  const lost = fx.delta ? -(fx.delta[f.id] ?? 0) : null;
  const out: Staging = { ...none, effects: botteFx(mine, fx) };
  if (mine) {
    if (strike || fx.kind === "WHIRL") out.pose = "action";
    if (fx.kind === "POTION") out.pose = "potion";
    if (fx.kind === "PARRY") out.pose = "parry";
    if (strike) out.body = ["lunge", big ? "big" : ""];
    if (fx.kind === "WHIRL") out.body = ["spin"];
    const healed = fx.delta ? (fx.delta[f.id] ?? 0) : fx.amount;
    if (fx.kind === "WHIRL" && healed) out.floats = [{ text: `+${healed}`, tone: "heal", later: true }];
    if (fx.kind === "POTION" && healed) out.floats = [{ text: `+${healed}`, tone: "heal" }];
    return out;
  }
  if (strike) {
    const dmg = lost ?? fx.amount;
    if (fx.parried) {
      out.body = ["guard-hit"];
      out.sparks = { n: 10, tone: "clang" };
      out.floats = [{ text: "Paré !", tone: "clang" }, { text: "+1 PA", tone: "pa", later: true }];
      if (dmg) out.floats.push({ text: `-${dmg}`, tone: "dmg" });
      return out;
    }
    out.body = ["hit", big ? "big" : ""];
    out.sparks = { n: big || fx.ko ? 18 : 8, tone: big || fx.ko ? "big" : "hit" };
    if (dmg !== null) out.floats = [{ text: `-${dmg}`, tone: big || fx.ko ? "big" : "dmg" }];
    return out;
  }
  if (fx.kind === "WHIRL" && lost) {
    out.body = ["hit"];
    out.sparks = { n: 6, tone: "leaf" };
    out.floats = [{ text: `-${lost}`, tone: "dmg" }];
  }
  return out;
}

const SPARK_TONES = { hit: ["#ffffff", "#f2c14e"], big: ["#ffffff", "#f2c14e", "#ff7a45"], clang: ["#9fd8ff", "#ffffff"], leaf: ["#7bc95a", "#4f8f3a"] } as const;

/** Étincelles au contact, devant la cible ; angles tirés du numéro du coup (même rendu à chaque affichage). */
function Sparks({ n, tone, seed }: { n: number; tone: keyof typeof SPARK_TONES; seed: number }): React.ReactElement {
  const colors = SPARK_TONES[tone];
  const reach = tone === "big" ? 46 : 32;
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const jitter = ((seed % 997) * 31 + i * 53) % 100 / 100;
        const a = (i / n) * Math.PI * 2 + jitter;
        const r = reach * (0.5 + jitter * 0.7);
        const style = { "--dx": `${Math.round((Math.cos(a) * r) / 2) * 2}px`, "--dy": `${Math.round((Math.sin(a) * r) / 2) * 2}px`, background: colors[i % colors.length] } as React.CSSProperties;
        return <i key={i} className="arena-spark" style={style} aria-hidden />;
      })}
    </>
  );
}

/** Barre de PV : elle tombe d'un coup et une traînée claire la rattrape ; au soin, une traînée verte la précède. */
function HpBar({ value, max, low, label }: { value: number; max: number; low: boolean; label: string }): React.ReactElement {
  // Sens du dernier changement, ajusté pendant le rendu (pas d'image où la traînée saute avant de suivre).
  const [prev, setPrev] = useState(value);
  const [trail, setTrail] = useState(value);
  const [dir, setDir] = useState<"down" | "up" | null>(null);
  if (value !== prev) {
    setPrev(value);
    setDir(value < prev ? "down" : "up");
    if (value > prev) setTrail(value);
  }
  useEffect(() => {
    if (dir !== "down" || trail === value) return;
    const t = setTimeout(() => setTrail(value), 300);
    return () => clearTimeout(t);
  }, [dir, trail, value]);
  const pct = (v: number) => (max > 0 ? Math.min(100, Math.max(0, (v / max) * 100)) : 0);
  const fill = low ? "#ff6b6b" : "repeating-linear-gradient(90deg,#6fd49a 0 8px,#3e9f6a 8px 10px)";
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} className="relative h-4 border-[3px] border-edge bg-night">
      <i className={`arena-trail ${dir ?? ""}`} style={{ width: `${pct(dir === "down" ? trail : value)}%` }} />
      <i className={`arena-fill ${dir ?? ""}`} style={{ width: `${pct(value)}%`, background: fill }} />
    </div>
  );
}

export function StageFighterView({ f: given, right, isMe }: { f: StageFighter; right: boolean; isMe: boolean }): React.ReactElement {
  const fx = useContext(FxCtx);
  const { hp } = useContext(ReplayCtx);
  const f = hp ? { ...given, hp: hp[given.id] ?? given.hp } : given;
  const st = staging(f, fx);
  const low = f.hp <= f.maxHp / 3;
  // Mise à terre : le héros tombe quand ses PV passent à zéro sous nos yeux (pas en ouvrant un combat déjà fini).
  const prevHp = useRef(f.hp);
  const [fall, setFall] = useState(0);
  useEffect(() => {
    if (prevHp.current > 0 && f.hp === 0) setFall(Date.now());
    prevHp.current = f.hp;
  }, [f.hp]);
  // La clé relance les animations du corps : un coup, ou une chute.
  let bodyKey = "body";
  if (st.body.some(Boolean)) bodyKey = `body-${fx?.n}`;
  else if (fall) bodyKey = `fall-${fall}`;
  const body = ["arena-body", right ? "flip r" : "l", f.stunned ? "stun" : "", ...st.body, fall ? "fall" : ""].filter(Boolean).join(" ");
  return (
    <div className={`flex flex-col gap-2 ${right ? "items-end text-right" : ""}`}>
      <div className={`flex flex-wrap items-baseline gap-1.5 text-sm ${right ? "justify-end" : ""}`}>
        <b>{isMe ? "Toi" : f.name}</b>
        <span className="text-[13px] text-muted">Évol. {f.levelForm}</span>
      </div>
      <div className="w-full max-w-[180px]">
        <HpBar value={f.hp} max={f.maxHp} low={low} label={`PV : ${isMe ? "toi" : f.name}`} />
        <span className="num">{f.hp}/{f.maxHp}</span>
      </div>
      <div className="relative flex min-h-[72px] items-end">
        <span key={bodyKey} className={body}>
          <Sprite character={f.character} color={f.color} form={f.displayedForm} mood={f.mood} pose={st.pose} px={4} label={f.title} tilted={f.stunned} />
          {st.effects.map((e) => <PixelFx key={`${e.name}-${e.at}-${fx?.n}`} {...e} />)}
          {st.sparks && fx ? <Sparks key={`sparks-${fx.n}`} n={st.sparks.n} tone={st.sparks.tone} seed={fx.n} /> : null}
        </span>
        {f.companion ? <Companion id={f.companion} px={3} label={f.companionName ?? undefined} joy={st.pose === "action"} className={right ? "order-first -scale-x-100 mr-1" : "ml-1"} /> : null}
        {st.floats.map((fl) => <span key={`${fl.text}-${fx?.n}`} className={`arena-dmg ${fl.tone} ${fl.later ? "later" : ""} ${fx?.late ? "now" : ""}`}>{fl.text}</span>)}
      </div>
    </div>
  );
}

/**
 * Cadre de la scène (lot Impact) : au contact d'un coup, toute la scène se fige un court instant (gel) et tremble
 * selon la force du coup ; au K.O., un flash. Le tremblement décroît en temps réel et se coupe si le téléphone
 * demande moins d'animations.
 */
export function ArenaStageBox({ children }: { children: React.ReactNode }): React.ReactElement {
  const fx = useContext(FxCtx);
  const { finale } = useContext(ReplayCtx);
  const box = useRef<HTMLDivElement>(null);
  const trauma = useRef(0);
  const raf = useRef(0);

  const kick = useCallback((amount: number) => {
    const el = box.current;
    if (!el || amount <= 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    trauma.current = Math.min(1, trauma.current + amount);
    if (raf.current) return;
    const t0 = performance.now();
    let last = t0;
    const tick = (now: number) => {
      trauma.current = decayTrauma(trauma.current, (now - last) / 1000);
      last = now;
      const o = shakeOffset(trauma.current, (now - t0) / 1000);
      el.style.translate = trauma.current > 0 ? `${o.x.toFixed(2)}px ${o.y.toFixed(2)}px` : "";
      el.style.rotate = trauma.current > 0 ? `${o.rotate.toFixed(2)}deg` : "";
      raf.current = trauma.current > 0 ? requestAnimationFrame(tick) : 0;
    };
    raf.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const impact = fx ? impactOf(fx.kind, { parried: fx.parried, ko: fx.ko }) : null;
  const n = fx?.n;
  useEffect(() => {
    if (!impact || (impact.stop === 0 && impact.trauma === 0)) return;
    let frozen: Animation[] = [];
    let thaw: ReturnType<typeof setTimeout> | undefined;
    const hit = setTimeout(() => {
      kick(impact.trauma);
      if (impact.stop === 0) return;
      // Gel : tout ce qui bouge dans la scène s'arrête net, puis repart ; le tremblement, lui, continue.
      frozen = box.current?.getAnimations?.({ subtree: true }) ?? [];
      frozen.forEach((a) => a.pause());
      thaw = setTimeout(() => frozen.forEach((a) => a.play()), impact.stop);
    }, impact.at);
    return () => {
      clearTimeout(hit);
      clearTimeout(thaw);
      frozen.forEach((a) => a.playState === "paused" && a.play());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- un coup = un numéro ; la confirmation du serveur ne le rejoue pas
  }, [n]);

  useEffect(() => {
    if (finale !== "ko") return;
    const t = setTimeout(() => kick(0.55), 250);
    return () => clearTimeout(t);
  }, [finale, kick]);

  const style = { "--hit-at": `${impact?.at ?? 0}ms` } as React.CSSProperties;
  return (
    <div ref={box} className="arena-stage" style={style}>
      {children}
      {finale === "ko" ? <i className="arena-whiteout" aria-hidden /> : null}
    </div>
  );
}

const JOURNAL_LINES = 14;
export type JournalLine = { index: number; time: string; text: string; tone: "me" | "foe" | "sys" };

/** Journal du combat, du plus récent au plus ancien ; pendant un rejeu, les lignes pas encore rejouées attendent leur tour. */
export function ArenaJournal({ lines, empty }: { lines: JournalLine[]; empty: string }): React.ReactElement {
  const { logEnd } = useContext(ReplayCtx);
  const shown = (logEnd === null ? lines : lines.filter((l) => l.index <= logEnd)).slice(0, JOURNAL_LINES);
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
