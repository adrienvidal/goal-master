"use client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { cancelChallenge, launchChallenge, respondChallenge, type ChallengeResult } from "@/app/defi-actions";
import { CHALLENGE_TARGETS, type ChallengeWhen } from "@/game/challenge";
import { ArenaPanel, type ArenaLaunch } from "./Arena";
import { NudgeButton } from "./NudgeButton";

// Défi (maquette docs/maquettes/defi.html) : bouton et panneau dans la carte du binôme, bandeaux sur l'accueil.

export type LaunchState = { ok: true; tonightLeft: string | null; fridayLeft: string } | { ok: false; reason: string };
type Props = { partnerName: string; nudgeSentToday: boolean; blink: boolean; launch: LaunchState; arena: ArenaLaunch; quest: { ok: true } | { ok: false; reason: string } };

function useAction(): [boolean, string, (run: () => Promise<ChallengeResult>) => void] {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const run = (action: () => Promise<ChallengeResult>) =>
    startTransition(async () => {
      setError("");
      const r = await action().catch(() => ({ ok: false as const, error: "Impossible pour l'instant. Vérifie ta connexion et réessaie." }));
      if (!r.ok) setError(r.error);
    });
  return [pending, error, run];
}

/** « Motiver », « Défier » et « Arène » côte à côte ; un seul panneau ouvert à la fois, sur toute la largeur. */
export function PartnerActions({ partnerName, nudgeSentToday, blink, launch, arena, quest }: Props): React.ReactElement {
  const [panel, setPanel] = useState<"nudge" | "challenge" | "arena" | null>(null);
  if (panel === "nudge") return <NudgeButton partnerName={partnerName} sentToday={nudgeSentToday} blink={blink} open onOpenChange={(o) => setPanel(o ? "nudge" : null)} />;
  if (panel === "challenge" && launch.ok) return <ChallengePanel partnerName={partnerName} launch={launch} onClose={() => setPanel(null)} />;
  if (panel === "arena" && arena.ok) return <ArenaPanel partnerName={partnerName} compare={arena.compare} onClose={() => setPanel(null)} />;
  return (
    <div className="flex flex-col gap-2">
      <div className="partner-actions grid grid-cols-4 gap-2">
        <NudgeButton partnerName={partnerName} sentToday={nudgeSentToday} blink={blink} open={false} onOpenChange={(o) => setPanel(o ? "nudge" : null)} />
        {launch.ok ? (
          <button type="button" className="btn ember" onClick={() => setPanel("challenge")}><span aria-hidden>🏁</span>Défier</button>
        ) : (
          <span className="btn off" aria-disabled="true"><span aria-hidden>🏁</span>Défier</span>
        )}
        {arena.ok ? (
          <button type="button" className="btn arena" onClick={() => setPanel("arena")}><span aria-hidden>🛡️</span>Arène</button>
        ) : arena.enter ? (
          <Link href="/arene" className="btn arena no-underline"><span aria-hidden>🛡️</span>Entrer</Link>
        ) : (
          <span className="btn off" aria-disabled="true"><span aria-hidden>🛡️</span>Arène</span>
        )}
        {quest.ok ? (
          <Link href="/quete/nouvelle" className="btn quest no-underline"><span aria-hidden>📜</span>Quête</Link>
        ) : (
          <span className="btn off" aria-disabled="true"><span aria-hidden>📜</span>Quête</span>
        )}
      </div>
      {launch.ok ? null : <p className="text-sm text-muted">{launch.reason}</p>}
      {arena.ok || arena.enter ? null : <p className="text-sm text-muted">{arena.reason}</p>}
      {quest.ok ? null : <p className="text-sm text-muted">{quest.reason}</p>}
    </div>
  );
}

function ChallengePanel({ partnerName, launch, onClose }: { partnerName: string; launch: Extract<LaunchState, { ok: true }>; onClose: () => void }): React.ReactElement {
  const [target, setTarget] = useState<number>(5);
  const [when, setWhen] = useState<ChallengeWhen>(launch.tonightLeft ? "tonight" : "friday");
  const [pending, error, run] = useAction();
  const until = when === "tonight" ? "ce soir minuit" : "vendredi 18 h";
  const options: { id: ChallengeWhen; label: string; left: string | null }[] = [
    { id: "tonight", label: "Ce soir minuit", left: launch.tonightLeft },
    { id: "friday", label: "Vendredi 18 h", left: launch.fridayLeft },
  ];
  return (
    <div className="flex flex-col gap-3 border-[3px] border-ember bg-night p-3">
      <p className="h-title">Défier {partnerName}</p>
      <div className="flex flex-col gap-1">
        <span className="text-[13px] uppercase tracking-wider text-muted">Cible</span>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cible">
          {CHALLENGE_TARGETS.map((t) => (
            <button key={t} type="button" role="radio" aria-checked={target === t} className="chip" onClick={() => setTarget(t)}>{t}</button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[13px] uppercase tracking-wider text-muted">Avant</span>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Échéance">
          {options.filter((o) => o.left).map((o) => (
            <button key={o.id} type="button" role="radio" aria-checked={when === o.id} className="chip" onClick={() => setWhen(o.id)}>
              {o.label}<small>dans {o.left}</small>
            </button>
          ))}
        </div>
      </div>
      <p className="text-[15px]">Le premier à <b>{target} candidatures</b> avant <b>{until}</b> gagne la couronne.</p>
      <button type="button" className="btn ember" disabled={pending} onClick={() => run(() => launchChallenge(target, when))}>Envoyer le défi</button>
      <button type="button" className="btn ghost" onClick={onClose}>Fermer</button>
      {error ? <p className="err">{error}</p> : null}
    </div>
  );
}

/** Chez le destinataire : relever le défi ou passer son tour. */
export function ChallengeIncoming({ id, children }: { id: string; children: React.ReactNode }): React.ReactElement {
  const [pending, error, run] = useAction();
  return (
    <div role="status" className="flex flex-col gap-3 border-[3px] border-ember bg-stone-2 p-3">
      <div className="flex min-w-0 items-end gap-3">{children}</div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn ghost" disabled={pending} onClick={() => run(() => respondChallenge(id, false))}>Pas cette fois</button>
        <button type="button" className="btn ember" disabled={pending} onClick={() => run(() => respondChallenge(id, true))}>Relever le défi</button>
      </div>
      {error ? <p className="err">{error}</p> : null}
    </div>
  );
}

/** Chez le lanceur, tant que le binôme n'a pas répondu. */
export function ChallengePending({ id, partnerName, target, until }: { id: string; partnerName: string; target: number; until: string }): React.ReactElement {
  const [pending, error, run] = useAction();
  return (
    <div className="flex flex-col gap-2 border-[3px] border-dashed border-ember p-3">
      <p className="text-[15px]">🏁 Défi envoyé à {partnerName} : <b>{target} candidatures avant {until}</b>.</p>
      <p className="text-sm text-muted">En attente de sa réponse. Il a reçu une notification.</p>
      <button type="button" className="btn ghost" disabled={pending} onClick={() => run(() => cancelChallenge(id))}>Annuler le défi</button>
      {error ? <p className="err">{error}</p> : null}
    </div>
  );
}

const CLOSED_KEY = "gm-challenge-closed";

/** Défi refusé ou expiré : prévient le lanceur, se ferme d'une croix (retenu sur cet appareil). */
export function ChallengeClosedBanner({ id, text, storageKey = CLOSED_KEY }: { id: string; text: string; storageKey?: string }): React.ReactElement | null {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      setOpen(localStorage.getItem(storageKey) !== id);
    } catch {
      setOpen(true);
    }
  }, [id, storageKey]);
  if (!open) return null;
  return (
    <div role="status" className="flex items-start gap-3 border-[3px] border-edge bg-night py-2 pl-3 pr-2">
      <p className="min-w-0 flex-1 text-[15px]">{text}</p>
      <button
        type="button"
        aria-label="Fermer"
        className="grid size-8 shrink-0 place-items-center border-2 border-edge font-display text-[11px] text-muted hover:border-gold hover:text-ink"
        onClick={() => {
          try {
            localStorage.setItem(storageKey, id);
          } catch {
            // stockage indisponible : le bandeau reviendra, sans gravité
          }
          setOpen(false);
        }}
      >
        <span aria-hidden>✕</span>
      </button>
    </div>
  );
}
