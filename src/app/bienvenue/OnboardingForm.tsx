"use client";
import { useActionState, useState } from "react";
import { COLORS, type CharacterId, type ColorId } from "@/lib/onboarding";
import { createPlayer, type OnboardingState } from "./actions";

const COLOR_HEX: Record<ColorId, string> = { BLUE: "#3d7bd9", RED: "#d94848", GREEN: "#3fa55b", PURPLE: "#8a55d6", ORANGE: "#e8892e", BLACK: "#4a4a5e" };
const COLOR_NAME: Record<ColorId, string> = { BLUE: "Bleu", RED: "Rouge", GREEN: "Vert", PURPLE: "Violet", ORANGE: "Orange", BLACK: "Noir" };
const CHARACTER_INFO: Record<CharacterId, { name: string; line: string }> = {
  KNIGHT: { name: "Chevalier", line: "Du bébé au chevalier légendaire" },
  PANDA: { name: "Panda", line: "Du bébé panda au grand maître" },
};

type Props = { takenColor: string | null; partnerName: string | null; defaultTarget: number; defaultDeadline: string; minDeadline: string };

// Une seule page, étapes empilées (maquette « Bienvenue »). L'aperçu des avatars arrive au lot 4.
export default function OnboardingForm({ takenColor, partnerName, defaultTarget, defaultDeadline, minDeadline }: Props): React.ReactElement {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(createPlayer, null);
  const [character, setCharacter] = useState<CharacterId>("KNIGHT");
  const [color, setColor] = useState<ColorId>(COLORS.find((c) => c !== takenColor) ?? "BLUE");

  return (
    <form action={action} className="device flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <label htmlFor="pseudo" className="text-xs uppercase tracking-wider text-muted">1 · Pseudo</label>
        <input id="pseudo" name="pseudo" className="input" required maxLength={20} autoComplete="nickname" />
      </section>

      <section className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wider text-muted">2 · Ton personnage et ta couleur</span>
        <input type="hidden" name="character" value={character} />
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(CHARACTER_INFO) as CharacterId[]).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={character === c}
              onClick={() => setCharacter(c)}
              className={`flex flex-col items-center gap-1 border-[3px] bg-night p-3 text-center ${character === c ? "border-gold" : "border-edge"}`}
            >
              <b>{CHARACTER_INFO[c].name}</b>
              <small className="text-muted">{CHARACTER_INFO[c].line}</small>
            </button>
          ))}
        </div>
        <input type="hidden" name="color" value={color} />
        <div className="mt-2 grid grid-cols-6 gap-2">
          {COLORS.map((c) => {
            const taken = c === takenColor;
            return (
              <button
                key={c}
                type="button"
                disabled={taken}
                aria-pressed={color === c}
                aria-label={taken ? `${COLOR_NAME[c]}, déjà pris par ${partnerName}` : COLOR_NAME[c]}
                title={taken ? `Déjà pris par ${partnerName}` : COLOR_NAME[c]}
                onClick={() => setColor(c)}
                className={`aspect-square border-[3px] border-night ${color === c ? "outline-[3px] outline-offset-2 outline-gold" : ""} ${taken ? "cursor-not-allowed opacity-30" : ""}`}
                style={{ background: COLOR_HEX[c] }}
              />
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wider text-muted">3 · Ton objectif</span>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="target" className="text-sm text-muted">Candidatures</label>
            <input id="target" name="target" className="input num" type="number" min={1} max={1000} defaultValue={defaultTarget} required />
          </div>
          <div>
            <label htmlFor="deadline" className="text-sm text-muted">Avant le</label>
            <input id="deadline" name="deadline" className="input num" type="date" min={minDeadline} defaultValue={defaultDeadline} required />
          </div>
        </div>
      </section>

      {state?.error ? <p className="err">{state.error}</p> : null}
      <button type="submit" className="btn" disabled={pending}>Commencer l&apos;aventure</button>
    </form>
  );
}
