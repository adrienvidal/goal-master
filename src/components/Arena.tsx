"use client";
import { useState, useTransition } from "react";
import { BusyLabel } from "@/components/LinkButton";
import { cancelArena, playArena, provokeArena, respondArena, type ArenaResult } from "@/app/arene-actions";
import type { ArenaKind } from "@/game/arena";
import { usePlayFx, useReplay } from "./ArenaStage";

// Arène (maquette docs/maquettes/arene.html) : panneau de provocation, bandeaux et actions du combat.

/** `enter` : un combat est en cours, le bouton mène à l'Arène au lieu d'être grisé. */
export type ArenaLaunch = { ok: true; compare: ArenaCompare } | { ok: false; reason: string; enter?: boolean };
export type ArenaCompare = { myForm: number; theirForm: number; myHp: number; theirHp: number; myAttack: string; theirAttack: string; myEnergy: number; theirEnergy: number };

function useArenaAction(): [boolean, string, (run: () => Promise<ArenaResult>) => void] {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const run = (action: () => Promise<ArenaResult>) =>
    startTransition(async () => {
      setError("");
      const r = await action().catch(() => ({ ok: false as const, error: "Impossible pour l'instant. Vérifie ta connexion et réessaie." }));
      if (!r.ok) setError(r.error);
    });
  return [pending, error, run];
}

/** Panneau « Provoquer » : rien à régler, les stats comparées et un bouton. */
export function ArenaPanel({ partnerName, compare, onClose }: { partnerName: string; compare: ArenaCompare; onClose: () => void }): React.ReactElement {
  const [pending, error, run] = useArenaAction();
  const rows: [string, string | number, string | number][] = [
    ["Évolution", compare.myForm, compare.theirForm],
    ["PV", compare.myHp, compare.theirHp],
    ["Attaque", compare.myAttack, compare.theirAttack],
    ["PA au premier tour", compare.myEnergy, compare.theirEnergy],
    ["Potions", 2, 2],
  ];
  const outsider = compare.theirEnergy > compare.myEnergy ? `${partnerName} est moins évolué : il part avec 1 PA de plus.` : compare.myEnergy > compare.theirEnergy ? "Tu es l'outsider : tu pars avec 1 PA de plus." : null;
  return (
    <div className="flex flex-col gap-3 border-[3px] border-magic bg-[#261c3a] p-3">
      <p className="h-title !text-[10px]">Provoquer {partnerName}</p>
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1 text-sm">
        <span />
        <span className="text-xs uppercase tracking-wider text-muted">Toi</span>
        <span className="text-xs uppercase tracking-wider text-muted">{partnerName}</span>
        {rows.map(([label, a, b]) => (
          <span key={label} className="contents">
            <span>{label}</span>
            <span className="num text-right">{a}</span>
            <span className="num text-right">{b}</span>
          </span>
        ))}
      </div>
      <p className="text-sm text-muted">
        {outsider ? `${outsider} ` : ""}
        +3 PA à chaque tour. Fin au K.O., ou vendredi 18 h : le plus de PV restants gagne. Aucune XP en jeu.
      </p>
      <button type="button" className="btn arena" disabled={pending} onClick={() => run(provokeArena)}><BusyLabel pending={pending}>Envoyer la provocation</BusyLabel></button>
      <button type="button" className="btn ghost" onClick={onClose}>Fermer</button>
      {error ? <p className="err">{error}</p> : null}
    </div>
  );
}

/** Chez le provoqué : entrer dans l'Arène ou passer son tour. */
export function ArenaIncoming({ id, children }: { id: string; children: React.ReactNode }): React.ReactElement {
  const [pending, error, run] = useArenaAction();
  return (
    <div role="status" className="flex flex-col gap-3 border-[3px] border-magic bg-[#261c3a] p-3">
      <div className="flex min-w-0 items-end gap-3">{children}</div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn ghost" disabled={pending} onClick={() => run(() => respondArena(id, false))}><BusyLabel pending={pending}>Pas cette fois</BusyLabel></button>
        <button type="button" className="btn arena" disabled={pending} onClick={() => run(() => respondArena(id, true))}><BusyLabel pending={pending}>Entrer dans l&apos;Arène</BusyLabel></button>
      </div>
      {error ? <p className="err">{error}</p> : null}
    </div>
  );
}

/** Chez le lanceur, tant que le binôme n'a pas répondu. */
export function ArenaPending({ id, partnerName, expires }: { id: string; partnerName: string; expires: string }): React.ReactElement {
  const [pending, error, run] = useArenaAction();
  return (
    <div className="flex flex-col gap-2 border-[3px] border-dashed border-magic p-3">
      <p className="text-[15px]">🛡️ Provocation envoyée à {partnerName}.</p>
      <p className="text-sm text-muted">Il a reçu une notification. Sans réponse d&apos;ici {expires}, elle s&apos;efface.</p>
      <button type="button" className="btn ghost" disabled={pending} onClick={() => run(() => cancelArena(id))}><BusyLabel pending={pending}>Retirer la provocation</BusyLabel></button>
      {error ? <p className="err">{error}</p> : null}
    </div>
  );
}

export type Move = { kind: ArenaKind; label: string; cost: string; detail: string; disabled: boolean; special?: boolean };

/** Les actions du tour : chaque coup part tout de suite ; « Finir mon tour » passe la main. */
export function ArenaMoves({ id, moves, used, max, myTurn }: { id: string; moves: Move[]; used: number; max: number; myTurn: boolean }): React.ReactElement {
  const [pending, error, run] = useArenaAction();
  const playFx = usePlayFx();
  const { locked } = useReplay();
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        {moves.map((m) => (
          <button key={m.kind} type="button" className={`arena-move ${m.special ? "special" : ""}`} disabled={!myTurn || m.disabled || pending || locked} onClick={() => {
            playFx(m.kind);
            run(() => playArena(id, m.kind));
          }}>
            <span className="num text-energy">{m.cost}</span>
            <b className="font-display text-[9px] leading-relaxed">{m.label}</b>
            <span className="text-[13px] leading-snug text-muted">{m.detail}</span>
          </button>
        ))}
      </div>
      {myTurn ? (
        <div className="flex items-center justify-between gap-3">
          <span className="num text-muted">Actions {used}/{max}</span>
          <button type="button" className="btn ghost !w-auto !px-4" disabled={pending || locked} onClick={() => run(() => playArena(id, "END"))}><BusyLabel pending={pending}>Finir mon tour</BusyLabel></button>
        </div>
      ) : null}
      {error ? <p className="err">{error}</p> : null}
    </div>
  );
}
