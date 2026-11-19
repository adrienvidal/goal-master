"use client";
import { useEffect, useState } from "react";
import type { Mood } from "@/game/avatar";
import { sceneDue } from "@/game/evolution";
import type { Form } from "@/game/levels";
import { seeEvolution } from "@/app/actions";
import { formName } from "@/lib/forms";
import type { CharacterId, ColorId } from "@/lib/onboarding";
import { Sprite } from "./Sprite";

/** Événement envoyé par « + Candidature » pour jouer la pose Action. */
export const ACTION_EVENT = "gm:action";

type Props = { id: string; character: CharacterId; color: ColorId; form: Form; seenForm: number; level: number; mood: Mood; fallen: boolean; px?: number; hurt?: boolean; crown?: boolean };
type Moment = { kind: "evolution" | "grace"; from: Form; to: Form } | null;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // stockage indisponible : l'animation ne se rejouera simplement pas
  }
}

// Mon avatar : pose Repos en boucle, Action à chaque candidature, Victoire à la montée de niveau.
// Évolution en plein écran tant que la forme affichée dépasse la forme vue (gardée en base : une seule fois, tous appareils
// confondus) ; « Retour en grâce » une fois par appareil (dernier état vu gardé en local).
export function MyAvatar({ id, character, color, form, seenForm, level, mood, fallen, px = 4, hurt = false, crown = false }: Props): React.ReactElement {
  const [pose, setPose] = useState<"rest" | "action" | "victory">("rest");
  const [moment, setMoment] = useState<Moment>(null);

  useEffect(() => {
    const onAction = () => {
      setPose("action");
      setTimeout(() => setPose("rest"), 900);
    };
    window.addEventListener(ACTION_EVENT, onAction);
    return () => window.removeEventListener(ACTION_EVENT, onAction);
  }, []);

  useEffect(() => {
    const key = `gm-seen-${id}`;
    const seen = read(key);
    write(key, JSON.stringify({ form, level, fallen }));
    let last: { form: Form; level: number; fallen: boolean } | null = null;
    try {
      last = seen ? JSON.parse(seen) : null;
    } catch {
      last = null;
    }
    if (last?.fallen && !fallen) setMoment({ kind: "grace", from: last.form, to: form });
    else if (sceneDue(form, seenForm) && !fallen) setMoment({ kind: "evolution", from: Math.max(1, seenForm) as Form, to: form });
    else if (last && level > last.level) {
      setPose("victory");
      setTimeout(() => setPose("rest"), 2400);
    }
  }, [id, form, seenForm, level, fallen]);

  function close(): void {
    // La forme est vue (évolution, ou retour en grâce qui la montre aussi) : l'encart et les autres appareils suivent.
    if (sceneDue(form, seenForm)) void seeEvolution();
    setMoment(null);
  }

  return (
    <>
      <Sprite character={character} color={color} form={form} mood={mood} pose={pose} px={px} label={formName(character, form)} hurt={hurt} crown={crown} />
      {moment ? (
        <div className="evo-overlay" role="dialog" aria-modal="true" aria-label={moment.kind === "grace" ? "Retour en grâce" : "Évolution"}>
          <div className="evo-flash" />
          <div className="evo-stage">
            <span className="evo-old">
              <Sprite character={character} color={color} form={moment.from} mood={moment.kind === "grace" ? "exhausted" : "normal"} px={6} />
            </span>
            <span className="evo-new">
              <Sprite character={character} color={color} form={moment.to} pose="victory" px={6} />
            </span>
          </div>
          <p className="h-title evo-title text-gold">
            {moment.kind === "grace" ? (
              <>Retour en grâce !<br />{formName(character, moment.to)}</>
            ) : (
              <>Tu es devenu<br />{formName(character, moment.to)} !</>
            )}
          </p>
          <p className="evo-after text-muted">Niveau {level}</p>
          <button type="button" className="btn evo-after max-w-[260px]" onClick={close} autoFocus>
            Continuer
          </button>
        </div>
      ) : null}
    </>
  );
}
