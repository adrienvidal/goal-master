"use client";
import { useEffect, useState, useTransition } from "react";
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
  let outsider: string | null = null;
  if (compare.myForm < compare.theirForm) outsider = "Tu es l'outsider : tu pars avec des PA en plus.";
  else if (compare.myForm > compare.theirForm) outsider = `${partnerName} est moins évolué : il part avec des PA en plus.`;
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
        Tu ouvres le combat avec 2 actions au premier tour, {partnerName} répond avec 1 PA de plus. {outsider ? `${outsider} ` : ""}
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

/** `blocked` : pourquoi l'action est indisponible pendant mon tour (null si elle est jouable). */
export type Move = { kind: ArenaKind; label: string; cost: string; detail: string; blocked: string | null; special?: boolean };

const HINT_MS = 3000;

/**
 * Les actions du tour : chaque coup part tout de suite ; « Finir mon tour » passe la main.
 * Une action grisée reste touchable : elle ne joue rien et dit pourquoi (`waiting` : ce n'est pas mon tour).
 */
export function ArenaMoves({ id, moves, myTurn, waiting }: { id: string; moves: Move[]; myTurn: boolean; waiting: string | null }): React.ReactElement {
  const [pending, error, run] = useArenaAction();
  const playFx = usePlayFx();
  const { locked } = useReplay();
  const [hint, setHint] = useState<{ text: string; n: number } | null>(null);
  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(null), HINT_MS);
    return () => clearTimeout(t);
  }, [hint]);
  const blockedBy = (m: Move): string | null =>
    locked ? "Attends la fin du rejeu, ou touche Passer." : !myTurn ? waiting : m.blocked;
  return (
    <div className="flex flex-col gap-3">
      {hint ? <p key={hint.n} role="status" className="arena-hint">{hint.text}</p> : null}
      <div className="grid grid-cols-2 gap-2">
        {moves.map((m) => {
          const why = blockedBy(m);
          const off = why !== null || (!myTurn && !waiting);
          return (
          <button key={m.kind} type="button" className={`arena-move ${m.special ? "special" : ""} ${off ? "off" : ""}`} aria-disabled={off} disabled={pending || (!myTurn && !waiting)} onClick={() => {
            if (why) return setHint({ text: why, n: Date.now() });
            if (off) return;
            playFx(m.kind);
            run(() => playArena(id, m.kind));
          }}>
            <span className="num text-energy">{m.cost}</span>
            <b className="font-display text-[9px] leading-relaxed">{m.label}</b>
            <span className="text-[13px] leading-snug text-muted">{m.detail}</span>
          </button>
          );
        })}
      </div>
      {myTurn ? (
        <div className="flex items-center justify-end gap-3">
          <button type="button" className="btn ghost !w-auto !px-4" disabled={pending || locked} onClick={() => run(() => playArena(id, "END"))}><BusyLabel pending={pending}>Finir mon tour</BusyLabel></button>
        </div>
      ) : null}
      {error ? <p className="err">{error}</p> : null}
    </div>
  );
}
