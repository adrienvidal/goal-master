"use client";
import { useRouter } from "next/navigation";
import { BusyLabel } from "@/components/LinkButton";
import { useState, useTransition } from "react";
import { launchQuest } from "@/app/quete-actions";
import { QUEST_TEXT_MAX } from "@/game/quests";

const EXAMPLES = [
  "Poste un article sur LinkedIn",
  "Relance un ancien collègue pour un café",
  "Mets ton CV à jour sur Welcome to the Jungle",
  "Inscris-toi au prochain salon de l'emploi",
  "Écris à 3 recruteurs de ta liste",
];

export function QuestForm({ partnerName }: { partnerName: string }): React.ReactElement {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const over = text.trim().length > QUEST_TEXT_MAX;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      setError("");
      const r = await launchQuest(text).catch(() => ({ ok: false as const, error: "Impossible pour l'instant. Vérifie ta connexion et réessaie." }));
      if (r.ok) router.push("/");
      else setError(r.error);
    });
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label htmlFor="quest-text" className="flex flex-col gap-1.5 text-sm text-muted">
        Sa quête
        <textarea id="quest-text" className="qfield" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Poste un article sur LinkedIn" />
      </label>
      <span className={`num self-end ${over ? "text-danger" : "text-muted"}`}>{text.trim().length}/{QUEST_TEXT_MAX}</span>
      <div className="chips" aria-label="Exemples">
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" onClick={() => setText(ex)}>{ex}</button>
        ))}
      </div>
      <p className="text-sm text-muted">Récompense : un coffre et +20 XP pour {partnerName}, +5 XP pour toi.</p>
      {error ? <p className="err" role="alert">{error}</p> : null}
      <button type="submit" className="btn" disabled={pending}><BusyLabel pending={pending}>Lancer la quête</BusyLabel></button>
    </form>
  );
}
