"use client";
import { useOptimistic, useState, useTransition } from "react";
import { BusyLabel } from "@/components/LinkButton";
import { renameCompanion, showCompanion } from "@/app/quete-actions";
import { Companion } from "@/components/Companion";
import { COMPANION_IDS, COMPANION_NAME_MAX, COMPANION_NAMES, type CompanionId } from "@/game/quests";

const OFFLINE = { ok: false as const, error: "Impossible pour l'instant. Vérifie ta connexion et réessaie." };

export function Menagerie({ owned, shown, names }: { owned: CompanionId[]; shown: string | null; names: Partial<Record<CompanionId, string>> }): React.ReactElement {
  const [current, setCurrent] = useOptimistic(shown);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [, startTransition] = useTransition();
  const [saving, startSaving] = useTransition();
  const shownId = owned.find((c) => c === current) ?? null;
  const [draft, setDraft] = useState(shownId ? names[shownId] ?? "" : "");
  const pick = (c: CompanionId) => {
    setDraft(names[c] ?? COMPANION_NAMES[c].name);
    setSaved("");
    startTransition(async () => {
      setError("");
      setCurrent(c);
      const r = await showCompanion(c).catch(() => OFFLINE);
      if (!r.ok) {
        setError(r.error);
        // Le compagnon affiché n'a pas changé : le champ reprend son nom, pour ne pas renommer le mauvais.
        const back = owned.find((o) => o === shown);
        setDraft(back ? names[back] ?? COMPANION_NAMES[back].name : "");
      }
    });
  };
  const rename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shownId) return;
    startSaving(async () => {
      setError("");
      const r = await renameCompanion(shownId, draft).catch(() => OFFLINE);
      if (r.ok) setSaved(`C'est noté : ${draft.trim() || COMPANION_NAMES[shownId].name}.`);
      else setError(r.error);
    });
  };
  return (
    <>
      <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
        {COMPANION_IDS.map((c) =>
          owned.includes(c) ? (
            <button key={c} type="button" className={`pick ${c === current ? "shown" : ""}`} aria-pressed={c === current} onClick={() => pick(c)}>
              <Companion id={c} px={4} label={names[c]} />
              <span className="max-w-full overflow-hidden text-ellipsis">
                {names[c] ?? COMPANION_NAMES[c].name}
                {names[c] && names[c] !== COMPANION_NAMES[c].name ? <small className="block text-xs text-muted">{COMPANION_NAMES[c].name}</small> : null}
                {c === current ? <small className="block text-xs text-gold">affiché</small> : null}
              </span>
            </button>
          ) : (
            <div key={c} className="pick locked" aria-label="Compagnon à découvrir">
              <Companion id={c} px={4} locked />
              <span>???</span>
            </div>
          ),
        )}
      </div>
      {shownId ? (
        <form onSubmit={rename} className="grid grid-cols-[1fr_auto] items-end gap-2">
          <label htmlFor="rename-pet" className="flex min-w-0 flex-col gap-1.5 text-sm text-muted">
            Renommer ton {COMPANION_NAMES[shownId].name.toLowerCase()}
            <input id="rename-pet" className="qfield" maxLength={COMPANION_NAME_MAX} value={draft} onChange={(e) => { setDraft(e.target.value); setSaved(""); }} autoComplete="off" />
          </label>
          <button type="submit" className="btn sm" disabled={saving}><BusyLabel pending={saving}>Enregistrer</BusyLabel></button>
        </form>
      ) : null}
      {saved ? <p className="text-sm text-[var(--ok)]" role="status">{saved}</p> : null}
      {error ? <p className="err" role="alert">{error}</p> : null}
    </>
  );
}
