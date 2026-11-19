"use client";
import { useEffect, useState } from "react";
import { SLOW_ACTION_EVENT } from "./LinkButton";

const CLOSED_KEY = "gm-nudge-closed";
const WIN_KEY = "gm-nudge-win-seen";
const WIN_MS = 4000;
const VERSION_EVERY_MS = 5 * 60 * 1000;

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
    // stockage indisponible : le bandeau reviendra, sans gravité
  }
}

// Relance reçue : se ferme d'une croix, retenu sur cet appareil. Les +15 XP restent possibles 24 h.
export function NudgeBanner({ id, children }: { id: string; children: React.ReactNode }): React.ReactElement | null {
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(read(CLOSED_KEY) !== id), [id]);
  if (!open) return null;
  return (
    <div role="status" className="flex items-start gap-3 border-[3px] border-ember bg-stone-2 py-2 pl-3 pr-2">
      <div className="flex min-w-0 flex-1 items-end gap-3">{children}</div>
      <button
        type="button"
        aria-label="Fermer la relance"
        className="grid size-8 shrink-0 place-items-center border-2 border-edge font-display text-[11px] text-muted hover:border-gold hover:text-ink"
        onClick={() => {
          write(CLOSED_KEY, id);
          setOpen(false);
        }}
      >
        <span aria-hidden>✕</span>
      </button>
    </div>
  );
}

// Relance réussie : visible 4 secondes après la candidature qui la valide, une fois par appareil.
export function NudgeWinBanner({ id, partner }: { id: string; partner: string }): React.ReactElement | null {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (read(WIN_KEY) === id) return;
    setOpen(true);
    // Noté « vu » seulement une fois affiché jusqu'au bout : un remontage pendant le rafraîchissement ne l'efface pas.
    const timer = setTimeout(() => {
      write(WIN_KEY, id);
      setOpen(false);
    }, WIN_MS);
    return () => clearTimeout(timer);
  }, [id]);
  if (!open) return null;
  return (
    <div role="status" className="border-[3px] border-[var(--ok)] bg-stone-2 px-3 py-2 text-[15px]">
      <b className="text-[var(--ok)]">Relance réussie :</b> +15 XP pour {partner} et toi.
    </div>
  );
}

// Nouvelle version déployée : vérifiée au retour sur l'onglet, toutes les 5 minutes et quand un bouton charge plus de 8 s
// (version changée en plein clic : on recharge aussitôt), sinon bandeau fixe en haut.
export function VersionWatcher({ version }: { version: string }): React.ReactElement | null {
  const [stale, setStale] = useState(false);
  useEffect(() => {
    let alive = true;
    async function check(reloadIfStale = false): Promise<void> {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        const { version: live } = (await res.json()) as { version: string };
        if (!alive || live === version) return;
        // Un bouton bloqué sur une nouvelle version : l'action est faite côté serveur, la page la montrera après rechargement.
        if (reloadIfStale) location.reload();
        else setStale(true);
      } catch {
        // hors ligne : on réessaiera
      }
    }
    const onVisible = (): void => {
      if (document.visibilityState === "visible") void check();
    };
    const onSlow = (): void => void check(true);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(SLOW_ACTION_EVENT, onSlow);
    const timer = setInterval(() => void check(), VERSION_EVERY_MS);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(SLOW_ACTION_EVENT, onSlow);
      clearInterval(timer);
    };
  }, [version]);
  if (!stale) return null;
  return (
    <div className="version-banner fixed inset-x-0 top-0 z-50 px-4 pt-[max(8px,env(safe-area-inset-top))]">
      <div role="alert" className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 border-[3px] border-gold bg-night px-3 py-2 shadow-[4px_4px_0_#0c0a1a]">
        <p className="min-w-0 text-[15px]">
          <b className="text-gold">Nouvelle version de Goal Master.</b> <small className="text-muted">Recharge pour en profiter.</small>
        </p>
        <button type="button" className="btn !w-auto shrink-0 px-4 !py-3 !text-[10px]" onClick={() => location.reload()}>Recharger</button>
      </div>
    </div>
  );
}
