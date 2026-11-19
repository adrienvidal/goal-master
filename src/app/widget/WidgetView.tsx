"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Sprite } from "@/components/Sprite";
import { formName } from "@/lib/forms";
import { isLocalOrigin } from "@/lib/localOrigin";
import { victoryFor, type Victory } from "@/lib/widgetVictory";
import type { WidgetState } from "@/lib/widgetState";

const REFRESH_MS = 30_000;
const VICTORY_MS = 3_200;
const LAST_SEEN = "gm-widget-last";

type Status = "waiting" | "ready" | "unlinked";

function readLast(): WidgetState | null {
  try {
    const raw = localStorage.getItem(LAST_SEEN);
    return raw ? (JSON.parse(raw) as WidgetState) : null;
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

export function WidgetView(): React.ReactElement {
  const [status, setStatus] = useState<Status>("waiting");
  const [state, setState] = useState<WidgetState | null>(null);
  const [victory, setVictory] = useState<Victory | null>(null);
  const [shownXp, setShownXp] = useState<number | null>(null);
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

  if (status === "unlinked") {
    return (
      <div className="gm-widget widget-root">
        <Bar />
        <p className="gm-msg">Le lien a été coupé depuis Goal Master. Tes candidatures ne comptent plus.</p>
      </div>
    );
  }
  if (!state) {
    return (
      <div className="gm-widget widget-root">
        <Bar />
        <p className="gm-msg">Ton héros arrive…</p>
      </div>
    );
  }

  const xpPct = shownXp ?? (state.xpInLevel / state.xpForNext) * 100;
  const classes = ["gm-widget", "widget-root", victory ? "win" : "", victory?.newForm ? "evo" : "", victory?.derust ? "derust" : ""].join(" ");
  return (
    <div className={classes}>
      <Bar />
      <div className="gm-body">
        <a className="gm-stage" href="/" target="_blank" rel="noopener" title="Ouvrir Goal Master">
          {victory && <span className={victory.xp === 0 ? "gm-pop muted" : "gm-pop"}>{victory.levelUp ? `NIV. ${state.level} !` : `+${victory.xp} XP`}</span>}
          <span className="gm-hero">
            <Sprite
              character={state.character}
              color={state.color}
              form={state.displayedForm}
              mood={victory ? "normal" : state.mood}
              pose={victory ? "victory" : "rest"}
              px={state.displayedForm >= 4 ? 2 : 3}
            />
          </span>
        </a>
        <div className="gm-info">
          <span className="gm-name">{state.pseudo}</span>
          <span className="gm-lvl">NIV. {state.level}</span>
          <div className="gm-xp" role="progressbar" aria-label="XP vers le niveau suivant" aria-valuenow={Math.round(xpPct)} aria-valuemin={0} aria-valuemax={100}>
            <i style={{ width: `${xpPct}%`, transition: shownXp === 100 || shownXp === null ? undefined : "none" }} />
          </div>
          <span className="gm-sub">
            <span>{state.today} auj.</span>
            <span>{rhythm(state)}</span>
          </span>
        </div>
      </div>
      {victory && (
        <p className="gm-msg" role="status">
          <VictoryMessage victory={victory} state={state} />
        </p>
      )}
    </div>
  );
}

/** Série en cours, sinon jours ouvrés sans candidature (la rouille). */
function rhythm(state: WidgetState): string {
  if (state.streak > 0) return `🔥 ${state.streak} j`;
  if (state.idleWorkdays > 0) return `${state.idleWorkdays} j sans`;
  return "";
}

function VictoryMessage({ victory, state }: { victory: Victory; state: WidgetState }): React.ReactElement {
  if (victory.newForm) {
    return (
      <>
        <strong>Nouvelle forme : {formName(state.character, state.levelForm)}.</strong> Va la voir dans Goal Master.
      </>
    );
  }
  if (victory.xp === 0) {
    return (
      <>
        <strong>{victory.company}</strong> compte, sans XP : plafond de 15 atteint aujourd&apos;hui.
      </>
    );
  }
  return (
    <>
      <strong>{victory.company}</strong> compte dans Goal Master.
    </>
  );
}

function Bar(): React.ReactElement {
  return (
    <div className="gm-bar">
      <b>GOAL MASTER</b>
    </div>
  );
}
