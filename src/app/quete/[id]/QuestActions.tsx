"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelQuest, markQuestDone, refuseQuest, validateQuest, type QuestResult } from "@/app/quete-actions";

function useQuestAction(): [boolean, string, (run: () => Promise<QuestResult>, then?: () => void) => void] {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const run = (action: () => Promise<QuestResult>, then?: () => void) =>
    startTransition(async () => {
      setError("");
      const r = await action().catch(() => ({ ok: false as const, error: "Impossible pour l'instant. Vérifie ta connexion et réessaie." }));
      if (r.ok) then?.();
      else setError(r.error);
    });
  return [pending, error, run];
}

/** Le destinataire : lien de preuve facultatif, puis « C'est fait ». */
export function MarkDone({ id, link: initial }: { id: string; link: string }): React.ReactElement {
  const [link, setLink] = useState(initial);
  const [pending, error, run] = useQuestAction();
  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); run(() => markQuestDone(id, link)); }}>
      <label htmlFor="quest-link" className="flex flex-col gap-1.5 text-sm text-muted">
        Lien de preuve (facultatif)
        <input id="quest-link" type="url" inputMode="url" className="qfield" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://www.linkedin.com/posts/…" />
      </label>
      {error ? <p className="err" role="alert">{error}</p> : null}
      <button type="submit" className="btn ok" disabled={pending}>{pending ? "Envoi…" : "C'est fait"}</button>
    </form>
  );
}

/** Le donneur : « Pas encore » ou « Valider ». */
export function ReviewQuest({ id }: { id: string }): React.ReactElement {
  const [pending, error, run] = useQuestAction();
  return (
    <div className="flex flex-col gap-2">
      {error ? <p className="err" role="alert">{error}</p> : null}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn ghost" disabled={pending} onClick={() => run(() => refuseQuest(id))}>Pas encore</button>
        <button type="button" className="btn ok" disabled={pending} onClick={() => run(() => validateQuest(id))}>Valider</button>
      </div>
    </div>
  );
}

/** Le donneur retire sa quête, après confirmation. */
export function CancelQuest({ id, partnerName }: { id: string; partnerName: string }): React.ReactElement {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [pending, error, run] = useQuestAction();
  if (!confirm) return <button type="button" className="btn ghost" onClick={() => setConfirm(true)}>Annuler la quête</button>;
  return (
    <div className="flex flex-col gap-2 border-[3px] border-danger p-3">
      <p className="text-[15px]">Annuler cette quête ? {partnerName} recevra une notification.</p>
      {error ? <p className="err" role="alert">{error}</p> : null}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn ghost" disabled={pending} onClick={() => setConfirm(false)}>Garder</button>
        <button type="button" className="btn !bg-danger" disabled={pending} onClick={() => run(() => cancelQuest(id), () => router.push("/"))}>Annuler</button>
      </div>
    </div>
  );
}
