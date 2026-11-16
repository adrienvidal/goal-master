"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export const DUEL_SEEN_KEY = "gm-duel-seen";
export const CHALLENGE_SEEN_KEY = "gm-challenge-seen";

function readSeen(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function markSeen(key: string, id: string): void {
  try {
    localStorage.setItem(key, id);
  } catch {
    // stockage indisponible : le résultat se rejouera, sans gravité
  }
}

export function readSeenDuel(): string | null {
  return readSeen(DUEL_SEEN_KEY);
}

export function markDuelSeen(id: string): void {
  markSeen(DUEL_SEEN_KEY, id);
}

// Ouvre un résultat (duel, défi) une fois par appareil, comme l'évolution.
function ResultWatcher({ id, storageKey, href }: { id: string; storageKey: string; href: string }): null {
  const router = useRouter();
  useEffect(() => {
    if (readSeen(storageKey) !== id) router.replace(href);
  }, [id, storageKey, href, router]);
  return null;
}

function ResultContinue({ id, storageKey }: { id: string; storageKey: string }): React.ReactElement {
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn"
      onClick={() => {
        markSeen(storageKey, id);
        router.replace("/");
      }}
    >
      Continuer
    </button>
  );
}

export function DuelWatcher({ id }: { id: string }): React.ReactElement {
  return <ResultWatcher id={id} storageKey={DUEL_SEEN_KEY} href="/duel" />;
}

export function DuelContinue({ id }: { id: string }): React.ReactElement {
  return <ResultContinue id={id} storageKey={DUEL_SEEN_KEY} />;
}

export function ChallengeWatcher({ id }: { id: string }): React.ReactElement {
  return <ResultWatcher id={id} storageKey={CHALLENGE_SEEN_KEY} href="/defi" />;
}

export function ChallengeContinue({ id }: { id: string }): React.ReactElement {
  return <ResultContinue id={id} storageKey={CHALLENGE_SEEN_KEY} />;
}
