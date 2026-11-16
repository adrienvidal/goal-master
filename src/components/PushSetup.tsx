"use client";
import { useEffect, useState } from "react";
import { savePushSubscription } from "@/app/motiver-actions";

function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type State = "unsupported" | "ask" | "denied" | "on" | "loading";

// Enregistre le service worker et propose d'activer les notifications de relance (cadrage §4.2 étape 4 et §7).
export function PushSetup(): React.ReactElement | null {
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      setState("unsupported");
      return;
    }
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => reg.pushManager.getSubscription())
      .then(async (sub) => {
        if (sub) {
          await savePushSubscription(JSON.parse(JSON.stringify(sub)));
          setState("on");
        } else setState(Notification.permission === "denied" ? "denied" : "ask");
      })
      .catch(() => setState("unsupported"));
  }, []);

  async function enable(): Promise<void> {
    setState("loading");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) });
      await savePushSubscription(JSON.parse(JSON.stringify(sub)));
      setState("on");
    } catch {
      setState(Notification.permission === "denied" ? "denied" : "ask");
    }
  }

  if (state === "ask")
    return (
      <div className="flex flex-col gap-2 border-[3px] border-edge bg-night/80 p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[15px]">Active les notifications pour recevoir les relances de ton binôme, même app fermée.</p>
        <button type="button" className="btn !w-auto shrink-0 px-4 !text-[10px]" onClick={enable}>Activer</button>
      </div>
    );
  if (state === "denied")
    return <p className="text-sm text-muted">Notifications bloquées : autorise-les dans les réglages du navigateur pour recevoir les relances.</p>;
  if (state === "unsupported")
    return <p className="text-sm text-muted">Sur iPhone, ajoute Goal Master à l&apos;écran d&apos;accueil (Partager › Sur l&apos;écran d&apos;accueil) pour recevoir les relances.</p>;
  return null;
}
