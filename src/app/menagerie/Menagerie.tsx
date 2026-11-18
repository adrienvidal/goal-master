"use client";
import { useOptimistic, useState, useTransition } from "react";
import { showCompanion } from "@/app/quete-actions";
import { Companion } from "@/components/Companion";
import { COMPANION_IDS, COMPANION_NAMES, type CompanionId } from "@/game/quests";

export function Menagerie({ owned, shown }: { owned: CompanionId[]; shown: string | null }): React.ReactElement {
  const [current, setCurrent] = useOptimistic(shown);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();
  const pick = (c: CompanionId) =>
    startTransition(async () => {
      setError("");
      setCurrent(c);
      const r = await showCompanion(c).catch(() => ({ ok: false as const, error: "Impossible pour l'instant. Vérifie ta connexion et réessaie." }));
      if (!r.ok) setError(r.error);
    });
  return (
    <>
      <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
        {COMPANION_IDS.map((c) =>
          owned.includes(c) ? (
            <button key={c} type="button" className={`pick ${c === current ? "shown" : ""}`} aria-pressed={c === current} onClick={() => pick(c)}>
              <Companion id={c} px={4} />
              <span>{COMPANION_NAMES[c].name}{c === current ? <small className="block text-gold">affiché</small> : null}</span>
            </button>
          ) : (
            <div key={c} className="pick locked" aria-label="Compagnon à découvrir">
              <Companion id={c} px={4} locked />
              <span>???</span>
            </div>
          ),
        )}
      </div>
      {error ? <p className="err" role="alert">{error}</p> : null}
    </>
  );
}
