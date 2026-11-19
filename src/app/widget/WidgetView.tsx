"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Sprite } from "@/components/Sprite";
import { isLocalOrigin } from "@/lib/localOrigin";
import type { WidgetMode } from "@/lib/widgetMode";
import { victoryFor, victoryLine, victoryPop, type Victory } from "@/lib/widgetVictory";
import type { WidgetState } from "@/lib/widgetState";

const REFRESH_MS = 30_000;
const VICTORY_MS = 3_200;
const LAST_SEEN = "gm-widget-last";

type Status = "waiting" | "ready" | "unlinked";

function readLast(): WidgetState | null {
  try {
    const raw = localStorage.getItem(LAST_SEEN);
    const last = raw ? (JSON.parse(raw) as WidgetState) : null;
    // Il sert aussi à dessiner le héros en attente : une entrée abîmée ou ancienne ne doit pas casser l'encart.
    return last && typeof last.character === "string" && typeof last.displayedForm === "number" ? last : null;
  } catch {
    return null;
  }
}

function writeLast(state: WidgetState): void {
  try {
    localStorage.setItem(LAST_SEEN, JSON.stringify(state));
  } catch {
    // Stockage refusé : la victoire se rejouera peut-être une fois, rien de grave.
  }
}

export function WidgetView({ mode }: { mode: WidgetMode }): React.ReactElement {
  const [status, setStatus] = useState<Status>("waiting");
  const [state, setState] = useState<WidgetState | null>(null);
  const [victory, setVictory] = useState<Victory | null>(null);
  const [shownXp, setShownXp] = useState<number | null>(null);
  // Le dernier héros vu, pour dessiner l'attente et le lien coupé sans attendre l'API (lu après le montage).
  const [ghost, setGhost] = useState<WidgetState | null>(null);
  const key = useRef<string | null>(null);
  const parentOrigin = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!key.current) return;
    const res = await fetch("/api/widget/state", { headers: { Authorization: `Bearer ${key.current}` }, cache: "no-store" }).catch(() => null);
    if (!res) return;
    if (res.status === 401) {
      setStatus("unlinked");
      if (parentOrigin.current) window.parent.postMessage({ type: "goal-master:unlinked" }, parentOrigin.current);
      return;
    }
    if (!res.ok) return;
    const next = (await res.json()) as WidgetState;
    const won = victoryFor(readLast(), next);
    writeLast(next);
    setStatus("ready");
    setState(next);
    if (won) {
      // La barre part de l'ancienne valeur puis monte (ou se remplit puis repart de zéro au passage de niveau).
      setShownXp(won.levelUp ? 100 : Math.max(0, ((next.xpInLevel - won.xp) / next.xpForNext) * 100));
      setVictory(won);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setVictory(null), VICTORY_MS);
      requestAnimationFrame(() => setTimeout(() => setShownXp(null), won.levelUp ? 900 : 300));
    }
  }, []);

  useEffect(() => {
    function onMessage(event: MessageEvent): void {
      if (event.source !== window.parent || !isLocalOrigin(event.origin)) return;
      const data = event.data as { type?: string; key?: string } | null;
      if (data?.type === "goal-master:key" && typeof data.key === "string") {
        key.current = data.key;
        parentOrigin.current = event.origin;
        void load();
      } else if (data?.type === "goal-master:refresh") {
        void load();
      }
    }
    setGhost(readLast());
    window.addEventListener("message", onMessage);
    // Rien de secret ici : on signale seulement qu'on attend la clé (à chaque montage, rechargement compris).
    if (window.parent !== window) window.parent.postMessage({ type: "goal-master:ready" }, "*");
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, REFRESH_MS);
    return () => {
      window.removeEventListener("message", onMessage);
      clearInterval(poll);
    };
  }, [load]);

  const hero = status === "ready" ? state : null;
  const classes = ["widget-root", `gm-${mode}`, mode === "free" ? "" : "gm-widget", hero ? "" : "gm-ghost", victory ? "win" : "", victory?.newForm ? "evo" : "", victory?.derust ? "derust" : ""];
  const className = classes.filter(Boolean).join(" ");
  if (mode === "free") return <FreeView className={className} state={hero} victory={victory} />;
  if (mode === "small") return <SmallView className={className} state={hero ?? state ?? ghost} ready={hero !== null} unlinked={status === "unlinked"} victory={victory} />;
  if (!hero) {
    const shown = state ?? ghost;
    return (
      <div className={className}>
        <Bar />
        <div className="gm-body">
          <div className="gm-stage">{shown && <HeroSprite state={shown} px={shown.displayedForm >= 4 ? 2 : 3} />}</div>
          <div className="gm-info">
            {status === "unlinked" ? (
              <>
                <span className="gm-name">Lien coupé</span>
                <span className="gm-note">Tes candidatures ne comptent plus. Relie à nouveau depuis job-finder.</span>
              </>
            ) : (
              <span className="gm-name">
                Ton héros arrive<span className="gm-dots" />
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  const xpPct = shownXp ?? (hero.xpInLevel / hero.xpForNext) * 100;
  const line = victory ? victoryLine(victory, hero) : null;
  return (
    <div className={className}>
      <Bar />
      <div className="gm-body">
        <a className="gm-stage" href="/" target="_blank" rel="noopener" title="Ouvrir Goal Master">
          {victory && <span className={victory.xp === 0 && !victory.levelUp ? "gm-pop muted" : "gm-pop"}>{victoryPop(victory, hero, mode)}</span>}
          <HeroSprite state={hero} victory={victory} px={hero.displayedForm >= 4 ? 2 : 3} />
        </a>
        <div className="gm-info">
          <span className="gm-name">{hero.pseudo}</span>
          <span className="gm-lvl">NIV. {hero.level}</span>
          <div className="gm-xp" role="progressbar" aria-label="XP vers le niveau suivant" aria-valuenow={Math.round(xpPct)} aria-valuemin={0} aria-valuemax={100}>
            <i style={{ width: `${xpPct}%`, transition: shownXp === 100 || shownXp === null ? undefined : "none" }} />
          </div>
          {line ? (
            <span className={line.gold ? "gm-say gold" : "gm-say"} role="status">
              <strong>{line.strong}</strong>
              {line.rest}
            </span>
          ) : (
            <span className="gm-sub">
              <span>{hero.today} auj.</span>
              <Rhythm state={hero} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function HeroSprite({ state, victory = null, px }: { state: WidgetState; victory?: Victory | null; px: number }): React.ReactElement {
  return (
    <span className="gm-hero">
      <Sprite character={state.character} color={state.color} form={state.displayedForm} mood={victory ? "normal" : state.mood} pose={victory ? "victory" : "rest"} px={px} />
    </span>
  );
}

/** Série en cours, sinon jours ouvrés sans candidature (la rouille). */
function Rhythm({ state }: { state: WidgetState }): React.ReactElement | null {
  if (state.streak > 0) return <span>🔥 {state.streak} j</span>;
  if (state.idleWorkdays > 0) return <span className="gm-rust">{state.idleWorkdays} j sans</span>;
  return null;
}

/** Small : la tête cadrée, le niveau, le compte du jour (ou la rouille) ; la victoire prend la place du compte. */
function SmallView({ className, state, ready, unlinked, victory }: { className: string; state: WidgetState | null; ready: boolean; unlinked: boolean; victory: Victory | null }): React.ReactElement {
  const head = state && <HeroSprite state={state} victory={victory} px={state.displayedForm >= 4 ? 3 : 4} />;
  let line: React.ReactNode = <span className="gm-dots" />;
  if (unlinked) line = "relier ?";
  else if (ready && state) {
    // Les candidatures du jour seulement (la série ne tient pas à côté dès deux chiffres) ; la rouille à la place.
    line = state.idleWorkdays > 0 && state.today === 0 ? <span className="gm-rust">{state.idleWorkdays} j sans</span> : `${state.today} auj.`;
  }
  return (
    <div className={className}>
      {ready ? (
        <a className="gm-head" href="/" target="_blank" rel="noopener" title="Ouvrir Goal Master">
          {head}
        </a>
      ) : (
        <div className="gm-head">{head}</div>
      )}
      <div className="gm-sinfo">
        <span className="gm-slvl" style={unlinked ? { color: "var(--muted)" } : undefined}>
          {unlinked ? "COUPÉ" : ready && state ? `NIV. ${state.level}` : "\u00a0"}
        </span>
        {victory && state ? (
          <span className={["gm-ssay", victory.xp === 0 && !victory.levelUp ? "muted" : "", victory.newForm ? "evo" : ""].filter(Boolean).join(" ")} role="status">
            {victoryPop(victory, state, "small")}
          </span>
        ) : (
          <span className="gm-sline">{line}</span>
        )}
      </div>
    </div>
  );
}

/** Free : le personnage patrouille le long du bas de job-finder (patrouille du décor) ; rien en attente ni lien coupé. */
const PATROL = { "--from": "10%", "--to": "90%", "--dur": "80s", "--steps": 320, "--face": 1, "--delay": "0s" } as React.CSSProperties;

function FreeView({ className, state, victory }: { className: string; state: WidgetState | null; victory: Victory | null }): React.ReactElement {
  return (
    <div className={className}>
      {state && (
        <span className="walker" style={PATROL}>
          {victory && <span className="gm-pop">{victoryPop(victory, state, "free")}</span>}
          <span className="facer">
            <span className="sizer">
              <HeroSprite state={state} victory={victory} px={state.displayedForm >= 4 ? 2 : 3} />
            </span>
          </span>
        </span>
      )}
    </div>
  );
}

function Bar(): React.ReactElement {
  return (
    <div className="gm-bar">
      <b>GOAL MASTER</b>
    </div>
  );
}
