"use client";
import { useActionState, useState } from "react";
import { Sprite } from "@/components/Sprite";
import type { Form } from "@/game/levels";
import { formName } from "@/lib/forms";
import type { CharacterId, ColorId } from "@/lib/onboarding";
import { createGoal, type NewGoalState } from "../actions";

type Props = { character: CharacterId; color: ColorId; form: Form; defaultTarget: number; defaultDeadline: string; minDeadline: string };

export default function NewGoalForm({ character: initial, color, form, defaultTarget, defaultDeadline, minDeadline }: Props): React.ReactElement {
  const [state, action, pending] = useActionState<NewGoalState, FormData>(createGoal, null);
  const [character, setCharacter] = useState<CharacterId>(initial);
  return (
    <form action={action} className="device flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wider text-muted">Ton personnage</span>
        <input type="hidden" name="character" value={character} />
        <div className="grid grid-cols-2 gap-2">
          {(["KNIGHT", "PANDA"] as const).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={character === c}
              onClick={() => setCharacter(c)}
              className={`flex flex-col items-center gap-1 border-[3px] bg-night p-3 text-center ${character === c ? "border-gold" : "border-edge"}`}
            >
              <span className="flex min-h-[110px] items-end"><Sprite character={c} color={color} form={form} px={3} /></span>
              <b>{formName(c, form)}</b>
              <small className="text-muted">{c === initial ? "Ton personnage actuel" : "Même niveau, autre univers"}</small>
            </button>
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wider text-muted">Ton nouvel objectif</span>
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
        <p className="text-sm text-muted">XP, niveau, avatar et succès sont conservés.</p>
      </section>
      {state?.error ? <p className="err">{state.error}</p> : null}
      <button type="submit" className="btn" disabled={pending}>Repartir en quête</button>
    </form>
  );
}
