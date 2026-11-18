"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { adoptCompanion } from "@/app/quete-actions";
import { ChestSprite, Companion } from "@/components/Companion";
import { Sprite } from "@/components/Sprite";
import { COMPANION_NAMES, XP_QUEST_DONE, type CompanionId } from "@/game/quests";
import type { Form } from "@/game/levels";
import type { CharacterId, ColorId } from "@/lib/onboarding";

type Props = { questId: string; giver: string; text: string; offer: CompanionId[]; character: CharacterId; color: ColorId; form: Form };

export function Chest({ questId, giver, text, offer, character, color, form }: Props): React.ReactElement {
  const [phase, setPhase] = useState<"shut" | "open" | "adopted">("shut");
  const [choice, setChoice] = useState<CompanionId>(offer[Math.min(1, offer.length - 1)]);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const adopt = () =>
    startTransition(async () => {
      setError("");
      const r = await adoptCompanion(questId, choice).catch(() => ({ ok: false as const, error: "Impossible pour l'instant. Vérifie ta connexion et réessaie." }));
      if (r.ok) setPhase("adopted");
      else setError(r.error);
    });

  if (phase === "shut")
    return (
      <div className="flex max-w-sm flex-col items-center gap-5 text-center">
        <h1 className="h-title text-gold">Quête accomplie !</h1>
        <p className="text-sm text-muted">{giver} a validé « {text} ».</p>
        <button type="button" onClick={() => setPhase("open")} aria-label="Ouvrir le coffre" className="cursor-pointer"><ChestSprite px={7} /></button>
        <button type="button" className="btn" onClick={() => setPhase("open")}>Ouvrir le coffre</button>
      </div>
    );

  if (phase === "adopted")
    return (
      <div className="flex max-w-sm flex-col items-center gap-5 text-center">
        <div className="flex items-end gap-1">
          <Sprite character={character} color={color} form={form} pose="victory" px={5} />
          <Companion id={choice} px={4} joy />
        </div>
        <h1 className="h-title text-gold">{COMPANION_NAMES[choice].the.charAt(0).toUpperCase() + COMPANION_NAMES[choice].the.slice(1)} te suit !</h1>
        <p className="text-sm text-muted">Il se tient à côté de ton héros. Change de compagnon quand tu veux dans ta Ménagerie.</p>
        <Link href="/" className="btn no-underline">Continuer</Link>
      </div>
    );

  const single = offer.length === 1;
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-5 text-center">
      <ChestSprite open px={5} />
      <h1 className="h-title text-gold">{single ? "Le dernier compagnon !" : "Choisis ton compagnon"}</h1>
      <div className="picks" role="radiogroup" aria-label="Compagnons proposés" style={{ "--n": offer.length } as React.CSSProperties}>
        {offer.map((c) => (
          <button key={c} type="button" role="radio" aria-checked={c === choice} className="pick" onClick={() => setChoice(c)}>
            <Companion id={c} px={4} joy={c === choice} />
            <span>{COMPANION_NAMES[c].name}</span>
          </button>
        ))}
      </div>
      <p className="num text-2xl text-gold">+{XP_QUEST_DONE} XP</p>
      {error ? <p className="err" role="alert">{error}</p> : null}
      <button type="button" className="btn" disabled={pending} onClick={adopt}>{pending ? "Adoption…" : `Adopter ${COMPANION_NAMES[choice].the}`}</button>
    </div>
  );
}
