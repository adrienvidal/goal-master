"use client";
import { useState, useTransition } from "react";
import { NUDGE_MESSAGES } from "@/game/nudges";
import { sendNudge } from "@/app/motiver-actions";

type Props = { partnerName: string; sentToday: boolean; blink: boolean };

// « Motiver » : choix parmi 4 messages, une relance par jour (cadrage §7).
export function NudgeButton({ partnerName, sentToday, blink }: Props): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  if (sentToday) return <span className="btn ghost" aria-disabled="true">Relance envoyée ✓</span>;

  if (!open)
    return (
      <button type="button" className={`btn ${blink ? "blink" : ""}`} onClick={() => setOpen(true)}>
        ⚔️ Motiver
      </button>
    );

  return (
    <div className="flex flex-col gap-2">
      <p className="h-title">Motiver {partnerName}</p>
      <div className="flex flex-col gap-2" role="radiogroup" aria-label="Message">
        {NUDGE_MESSAGES.map((m, i) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={choice === i}
            onClick={() => setChoice(i)}
            className={`border-[3px] bg-night px-3 py-2 text-left ${choice === i ? "border-gold" : "border-edge"}`}
          >
            <small className="mr-2 text-muted">{i < 2 ? "Sympa" : "Chambreur"}</small>
            {m}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <button
          type="button"
          className="btn"
          disabled={choice === null || pending}
          onClick={() =>
            startTransition(async () => {
              const r = await sendNudge(choice!);
              if (!r.ok) setError(r.error);
            })
          }
        >
          Envoyer
        </button>
        <button type="button" className="btn ghost !w-auto px-4" onClick={() => setOpen(false)}>Fermer</button>
      </div>
      {error ? <p className="err">{error}</p> : null}
    </div>
  );
}
