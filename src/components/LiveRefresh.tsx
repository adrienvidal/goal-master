"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const EVERY_MS = 60_000;

// Garde l'accueil à jour sans recharger la page (données du binôme, relance, boss) : au retour sur l'app,
// toutes les 60 s tant qu'elle est affichée, et dès qu'une notification push arrive (message du service worker).
// router.refresh() ne recharge que les données : défilement et saisie en cours sont conservés.
/** `every` : intervalle en ms (60 s par défaut ; l'Arène passe à 3 s quand c'est au binôme de jouer). */
export function LiveRefresh({ every = EVERY_MS }: { every?: number }): null {
  const router = useRouter();
  useEffect(() => {
    const refresh = (): void => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const onMessage = (event: MessageEvent): void => {
      if ((event.data as { type?: string } | null)?.type === "gm-refresh") refresh();
    };
    document.addEventListener("visibilitychange", refresh);
    navigator.serviceWorker?.addEventListener("message", onMessage);
    const timer = setInterval(refresh, every);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
      clearInterval(timer);
    };
  }, [router, every]);
  return null;
}
