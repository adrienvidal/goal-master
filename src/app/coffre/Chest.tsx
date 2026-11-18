"use client";
import { useEffect, useState, useTransition } from "react";
import { adoptCompanion } from "@/app/quete-actions";
import { ChestSprite, Companion } from "@/components/Companion";
import { BusyLabel, LinkButton } from "@/components/LinkButton";
import { Sprite } from "@/components/Sprite";
import type { Form } from "@/game/levels";
import { COMPANION_IDS, COMPANION_NAME_MAX, COMPANION_NAMES, XP_QUEST_DONE, type CompanionId } from "@/game/quests";
import type { CharacterId, ColorId } from "@/lib/onboarding";

// Coffre v3 (maquette quetes, « Coffre v3 ») : trois coups pour l'ouvrir, compagnons qui sortent un par un,
// collection en cours, puis adoption fêtée avec la barre d'XP qui monte.

type Level = { level: number; xpInLevel: number; xpForNext: number };
type Props = {
  questId: string;
  giver: string;
  text: string;
  offer: CompanionId[];
  owned: CompanionId[];
  xp: { before: Level; after: Level };
  character: CharacterId;
  color: ColorId;
  form: Form;
};
type Spark = { id: number; dx: number; dy: number };

const TAPS_TO_OPEN = 3;
const REVEAL_FIRST_MS = 450;
const REVEAL_GAP_MS = 400;
const COLOR_AFTER_MS = 350;

const pct = (l: Level) => Math.round((l.xpInLevel / l.xpForNext) * 100);
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches), []);
  return reduced;
}

export function Chest({ questId, giver, text, offer, owned, xp, character, color, form }: Props): React.ReactElement {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<"shut" | "open" | "adopted">("shut");
  const [taps, setTaps] = useState(0);
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [out, setOut] = useState(0);
  const [colored, setColored] = useState(0);
  const first = offer[Math.min(1, offer.length - 1)];
  const [choice, setChoice] = useState<CompanionId>(first);
  const [name, setName] = useState(COMPANION_NAMES[first].name);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [bar, setBar] = useState(pct(xp.before));
  const [levelShown, setLevelShown] = useState(xp.before.level);
  const shownName = name.trim() || COMPANION_NAMES[choice].name;
  const label = shownName === COMPANION_NAMES[choice].name ? COMPANION_NAMES[choice].the : shownName;

  const tap = () => {
    if (phase !== "shut") return;
    const n = taps + 1;
    setTaps(n);
    if (!reduced) setSparks(Array.from({ length: 6 * n }, (_, i) => ({ id: n * 100 + i, dx: Math.round((Math.random() - 0.5) * 140), dy: Math.round(-Math.random() * 90) })));
    if (n >= TAPS_TO_OPEN) setPhase("open");
  };

  // Les compagnons sortent un par un, en silhouette puis en couleur.
  useEffect(() => {
    if (phase !== "open") return;
    if (reduced) {
      setOut(offer.length);
      setColored(offer.length);
      return;
    }
    const timers = offer.flatMap((_, i) => [
      setTimeout(() => setOut(i + 1), REVEAL_FIRST_MS + i * REVEAL_GAP_MS),
      setTimeout(() => setColored(i + 1), REVEAL_FIRST_MS + i * REVEAL_GAP_MS + COLOR_AFTER_MS),
    ]);
    return () => timers.forEach(clearTimeout);
  }, [phase, offer, reduced]);

  // Adoption : la barre d'XP monte de +20, en passant par le niveau suivant si besoin.
  useEffect(() => {
    if (phase !== "adopted") return;
    if (reduced) {
      setBar(pct(xp.after));
      setLevelShown(xp.after.level);
      return;
    }
    const levelUp = xp.after.level > xp.before.level;
    const timers = levelUp
      ? [setTimeout(() => setBar(100), 500), setTimeout(() => { setLevelShown(xp.after.level); setBar(0); }, 1800), setTimeout(() => setBar(pct(xp.after)), 1900)]
      : [setTimeout(() => setBar(pct(xp.after)), 500)];
    return () => timers.forEach(clearTimeout);
  }, [phase, xp, reduced]);

  const pick = (c: CompanionId) => {
    // Le nom suit l'espèce tant que le joueur ne l'a pas changé.
    if (name.trim() === "" || name === COMPANION_NAMES[choice].name) setName(COMPANION_NAMES[c].name);
    setChoice(c);
  };
  const adopt = () =>
    startTransition(async () => {
      setError("");
      const r = await adoptCompanion(questId, choice, name).catch(() => ({ ok: false as const, error: "Impossible pour l'instant. Vérifie ta connexion et réessaie." }));
      if (r.ok) setPhase("adopted");
      else setError(r.error);
    });

  if (phase === "adopted")
    return (
      <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
        <h1 className="h-title text-gold">{capital(label)} te suit !</h1>
        <div className="flex items-end gap-1">
          <Sprite character={character} color={color} form={form} pose="victory" px={5} />
          <span className={reduced ? "" : "chest-jump"}>
            <Companion id={choice} px={4} joy label={shownName} />
          </span>
        </div>
        <div className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-2" aria-label="Expérience">
          <span className={`num ${levelShown > xp.before.level ? "text-gold" : ""}`}>Niv. {levelShown}</span>
          <div className="relative h-3 border-2 border-edge bg-night">
            <i className="chest-xp absolute inset-y-0 left-0 bg-gold" style={{ width: `${bar}%` }} />
          </div>
          <span className="num text-muted">+{XP_QUEST_DONE} XP</span>
        </div>
        {xp.after.level > xp.before.level && levelShown === xp.after.level ? <p className="font-display text-[11px] text-gold">Niveau {xp.after.level} !</p> : null}
        <p className="text-sm text-muted">Il se tient à côté de ton héros. Change de compagnon quand tu veux dans ta Ménagerie.</p>
        <LinkButton href="/" className="btn no-underline">Continuer</LinkButton>
      </div>
    );

  const revealed = out >= offer.length;
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-5 text-center">
      <h1 className="h-title text-gold">{phase === "shut" ? "Quête accomplie !" : offer.length === 1 ? "Le dernier compagnon !" : "Choisis ton compagnon"}</h1>
      {phase === "shut" ? <p className="text-sm text-muted">{giver} a validé « {text} ». Touche le coffre.</p> : null}

      <button type="button" onClick={tap} disabled={phase !== "shut"} aria-label={phase === "shut" ? `Taper sur le coffre (${taps} sur ${TAPS_TO_OPEN})` : "Coffre ouvert"} className={`chest-tap ${phase === "open" ? "opened" : ""}`}>
        <span className="chest-ray" aria-hidden />
        <span key={taps} className={taps === 1 ? "chest-hit1" : taps === 2 ? "chest-hit2" : ""}>
          <ChestSprite open={phase === "open"} px={phase === "open" ? 6 : 7} />
        </span>
        <span className="chest-sparks" aria-hidden>
          {sparks.map((s) => (
            <i key={s.id} style={{ "--dx": `${s.dx}px`, "--dy": `${s.dy}px` } as React.CSSProperties} />
          ))}
        </span>
      </button>

      {phase === "shut" ? (
        <p className="flex gap-1.5" aria-hidden>
          {Array.from({ length: TAPS_TO_OPEN }, (_, i) => (
            <i key={i} className={`chest-count ${i < taps ? "on" : ""}`} />
          ))}
        </p>
      ) : (
        <>
          <div className="picks" role="radiogroup" aria-label="Compagnons proposés" style={{ "--n": offer.length } as React.CSSProperties}>
            {offer.map((c, i) => (
              <button key={c} type="button" role="radio" aria-checked={c === choice} disabled={i >= out} className={`pick chest-pick ${i < out ? "out" : ""} ${i < colored ? "" : "sil"}`} onClick={() => pick(c)}>
                <Companion id={c} px={4} joy={c === choice && i < colored} />
                <span>{i < colored ? COMPANION_NAMES[c].name : "???"}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-[13px] text-muted">Ta collection · <b className="text-gold">{owned.length}/{COMPANION_IDS.length}</b></span>
            <span className="flex items-end gap-1.5">
              {COMPANION_IDS.map((c) => <Companion key={c} id={c} px={2} locked={!owned.includes(c)} />)}
            </span>
          </div>
          {revealed ? (
            <>
              <label htmlFor="pet-name" className="flex w-full max-w-xs flex-col gap-1.5 text-left text-sm text-muted">
                Son nom
                <input id="pet-name" className="qfield" maxLength={COMPANION_NAME_MAX} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
              </label>
              <p className="num text-2xl text-gold">+{XP_QUEST_DONE} XP</p>
              {error ? <p className="err" role="alert">{error}</p> : null}
              <button type="button" className="btn" disabled={pending} onClick={adopt}><BusyLabel pending={pending}>{`Adopter ${label}`}</BusyLabel></button>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
