"use client";
import { useState, useTransition } from "react";
import { BusyLabel } from "@/components/LinkButton";
import { linkWidget } from "./actions";

/** Confirmation, puis clé envoyée à job-finder (la fenêtre qui nous a ouverts) et fermeture. */
export function LinkPanel({ origin, pseudo, hero }: { origin: string; pseudo: string; hero: React.ReactNode }): React.ReactElement {
  const [state, setState] = useState<"ask" | "done" | "error">("ask");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function link(): void {
    start(async () => {
      const result = await linkWidget(origin);
      if (!result.ok) {
        setError(result.error);
        setState("error");
        return;
      }
      if (window.opener) {
        window.opener.postMessage({ type: "goal-master:key", key: result.key }, origin);
        window.close();
      }
      // Fenêtre qui ne se ferme pas, ou ouverte sans job-finder derrière : la clé n'est jamais affichée.
      setState("done");
    });
  }

  function cancel(): void {
    window.close();
    location.href = "/";
  }

  if (state === "done") {
    return (
      <div className="device flex flex-col gap-4">
        <h1 className="h-title">C&apos;est relié</h1>
        <div className="flex items-end gap-3">
          {hero}
          <p className="text-muted">Ton héros t&apos;attend dans job-finder. Tu peux fermer cette fenêtre.</p>
        </div>
        <button type="button" className="btn" onClick={() => window.close()}>Retour à job-finder</button>
        <p className="text-sm text-muted">Si l&apos;encart ne s&apos;allume pas, relie à nouveau depuis job-finder.</p>
      </div>
    );
  }

  return (
    <div className="device flex flex-col gap-4">
      <h1 className="h-title">Relier job-finder à ton compte ?</h1>
      <p className="text-muted">Connecté en tant que <b className="text-ink">{pseudo}</b>.</p>
      <div className="flex flex-col gap-2 border-2 border-edge bg-night p-3 text-sm">
        <p>job-finder pourra :</p>
        <ul className="flex list-none flex-col gap-1 p-0">
          <li>▸ afficher ton héros, ton niveau et ta série</li>
          <li>▸ ajouter une candidature quand tu la passes à « envoyée »</li>
        </ul>
        <p className="mt-1">Il ne pourra pas :</p>
        <ul className="flex list-none flex-col gap-1 p-0 text-muted">
          <li>✕ lire le fil, l&apos;Arène, les quêtes ou ton binôme</li>
          <li>✕ annuler ou supprimer une candidature</li>
        </ul>
      </div>
      {state === "error" && <p className="err">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn ghost" onClick={cancel}>Annuler</button>
        <button type="button" className="btn" onClick={link} disabled={pending} aria-busy={pending}>
          <BusyLabel pending={pending}>Relier</BusyLabel>
        </button>
      </div>
    </div>
  );
}
