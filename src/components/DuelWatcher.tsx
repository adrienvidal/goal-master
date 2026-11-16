"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export const DUEL_SEEN_KEY = "gm-duel-seen";

export function readSeenDuel(): string | null {
  try {
    return localStorage.getItem(DUEL_SEEN_KEY);
  } catch {
    return null;
  }
}

export function markDuelSeen(id: string): void {
  try {
    localStorage.setItem(DUEL_SEEN_KEY, id);
  } catch {
    // stockage indisponible : le résultat se rejouera, sans gravité
  }
}

// Ouvre le résultat du dernier duel tranché, une fois par appareil (comme l'évolution).
export function DuelWatcher({ id }: { id: string }): null {
  const router = useRouter();
  useEffect(() => {
    if (readSeenDuel() !== id) router.replace("/duel");
  }, [id, router]);
  return null;
}

export function DuelContinue({ id }: { id: string }): React.ReactElement {
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn"
      onClick={() => {
        markDuelSeen(id);
        router.replace("/");
      }}
    >
      Continuer
    </button>
  );
}
