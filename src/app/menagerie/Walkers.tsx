"use client";
import { useOptimistic, useState, useTransition } from "react";
import { setWalkers } from "@/app/quete-actions";
import { Companion } from "@/components/Companion";
import { COMPANION_NAMES, MAX_WALKERS, type CompanionId } from "@/game/quests";

const OFFLINE = { ok: false as const, error: "Impossible pour l'instant. Vérifie ta connexion et réessaie." };

/** Ménagerie : les compagnons qui passent voir le héros dans job-finder, en mode libre (maquette encart-libre-vivant, écran 3). */
export function Walkers({ owned, walkers, names, linked }: { owned: CompanionId[]; walkers: CompanionId[]; names: Partial<Record<CompanionId, string>>; linked: boolean }): React.ReactElement {
  const [chosen, setChosen] = useOptimistic(walkers);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();
  const full = chosen.length >= MAX_WALKERS;
  const toggle = (c: CompanionId, on: boolean) => {
    const next = on ? [...chosen, c] : chosen.filter((x) => x !== c);
    startTransition(async () => {
      setError("");
      setChosen(next);
      // En cas d'échec, l'état optimiste retombe tout seul sur le choix enregistré.
      const r = await setWalkers(next).catch(() => OFFLINE);
      if (!r.ok) setError(r.error);
    });
  };
  return (
    <section className="flex flex-col gap-3" aria-labelledby="walkers-title">
      <h2 id="walkers-title" className="walkers-title">
        En balade dans job-finder
        <span className="num text-muted">
          {chosen.length} / {MAX_WALKERS}
        </span>
      </h2>
      <p className="text-sm text-muted">Ils passent un par un voir ton héros quand l&apos;encart de job-finder est en mode Libre.</p>
      <div className="walkers">
        {owned.map((c) => {
          const on = chosen.includes(c);
          const off = full && !on;
          const name = names[c] ?? COMPANION_NAMES[c].name;
          return (
            <label key={c} htmlFor={`walk-${c}`} className={off ? "walk-row off" : "walk-row"}>
              <Companion id={c} px={2} label={name} />
              <span className="min-w-0 overflow-hidden text-ellipsis">
                {name}
                {name !== COMPANION_NAMES[c].name ? <small className="block text-xs text-muted">{COMPANION_NAMES[c].name}</small> : null}
              </span>
              <input id={`walk-${c}`} type="checkbox" role="switch" className="switch" checked={on} disabled={off} onChange={(e) => toggle(c, e.target.checked)} aria-label={`${name} se balade dans job-finder`} />
            </label>
          );
        })}
      </div>
      {full ? <p className="text-sm text-gold">Trois au plus. Retire-en un pour en faire venir un autre.</p> : null}
      {!linked ? <p className="text-sm text-muted">Relie job-finder dans les <a href="/reglages">Réglages</a> pour les voir s&apos;y promener.</p> : null}
      {error ? <p className="err" role="alert">{error}</p> : null}
    </section>
  );
}
