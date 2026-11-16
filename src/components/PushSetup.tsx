"use client";
import { useEffect, useState } from "react";
import { deletePushSubscription, savePushSubscription } from "@/app/motiver-actions";
import { deviceLabel, isIos } from "@/lib/device";

function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** « ios » : iPhone sans l'app installée ; « unsupported » : autre navigateur sans push. */
type State = "loading" | "ios" | "unsupported" | "ask" | "denied" | "on";

// Enregistre le service worker et suit l'état du push sur cet appareil (cadrage §7, spec notifications).
function usePush(): { state: State; device: string; enable: () => Promise<void>; disable: () => Promise<void> } {
  const [state, setState] = useState<State>("loading");
  const [device, setDevice] = useState("Cet appareil");

  useEffect(() => {
    setDevice(deviceLabel(navigator.userAgent, navigator.maxTouchPoints));
    const unsupported = (): State => (isIos(navigator.userAgent, navigator.maxTouchPoints) ? "ios" : "unsupported");
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      setState(unsupported());
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
      .catch(() => setState(unsupported()));
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

  async function disable(): Promise<void> {
    setState("loading");
    const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
    if (sub) {
      await deletePushSubscription(sub.endpoint);
      await sub.unsubscribe().catch(() => false);
    }
    setState("ask");
  }

  return { state, device, enable, disable };
}

const IOS_STEPS = ["Bouton Partager de Safari", "« Sur l'écran d'accueil »", "Ouvre Goal Master depuis l'icône et reviens ici"];

// Accueil : invitation à activer le push, ou ce qui l'empêche.
export function PushSetup(): React.ReactElement | null {
  const { state, enable } = usePush();
  if (state === "ask")
    return (
      <div className="flex flex-col gap-2 border-[3px] border-edge bg-night/80 p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[15px]">Active les notifications pour recevoir les relances de ton binôme, même app fermée.</p>
        <button type="button" className="btn !w-auto shrink-0 px-4 !text-[10px]" onClick={enable}>Activer</button>
      </div>
    );
  if (state === "denied")
    return <p className="text-sm text-muted">Notifications bloquées : autorise-les dans les réglages du navigateur pour recevoir les relances.</p>;
  if (state === "ios")
    return <p className="text-sm text-muted">Sur iPhone, ajoute Goal Master à l&apos;écran d&apos;accueil (Partager › Sur l&apos;écran d&apos;accueil) pour recevoir les relances.</p>;
  if (state === "unsupported")
    return <p className="text-sm text-muted">Ce navigateur ne gère pas les notifications : ouvre Goal Master dans Chrome, Edge ou Firefox pour les recevoir.</p>;
  return null;
}

function Pill({ tone, children }: { tone: "on" | "off" | "warn"; children: React.ReactNode }): React.ReactElement {
  const color = tone === "on" ? "text-[var(--ok)]" : tone === "warn" ? "text-ember" : "text-muted";
  return <span className={`border-2 border-current px-2 py-1 font-display text-[10px] leading-none ${color}`}>{children}</span>;
}

// Réglages : le canal push de cet appareil, avec ses quatre états (maquette notifications).
export function PushChannel(): React.ReactElement {
  const { state, device, enable, disable } = usePush();
  const pill =
    state === "on" ? <Pill tone="on">ACTIVÉ</Pill> : state === "denied" ? <Pill tone="warn">BLOQUÉ</Pill> : state === "ask" ? <Pill tone="off">DÉSACTIVÉ</Pill> : state === "loading" ? <Pill tone="off">…</Pill> : <Pill tone="off">INDISPONIBLE</Pill>;
  return (
    <div className="flex flex-col gap-2.5 border-[3px] border-stone-2 bg-night p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <b className="font-semibold">Sur cet appareil</b>
        {pill}
      </div>
      {state === "on" ? (
        <>
          <p className="text-sm text-muted">{device} · notifications même app fermée.</p>
          <button type="button" className="btn ghost !text-[10px]" onClick={disable}>Désactiver sur cet appareil</button>
        </>
      ) : null}
      {state === "ask" ? (
        <>
          <p className="text-sm text-muted">Tu reçois tout par e-mail. Active le push pour être prévenu tout de suite.</p>
          <button type="button" className="btn !text-[10px]" onClick={enable}>Activer</button>
        </>
      ) : null}
      {state === "denied" ? (
        <p className="text-sm text-muted">Ton navigateur bloque les notifications de Goal Master. Autorise-les dans ses réglages du site, puis reviens ici. Les e-mails continuent d&apos;arriver.</p>
      ) : null}
      {state === "ios" ? (
        <>
          <p className="text-sm text-muted">Sur iPhone, le push ne marche que depuis l&apos;app installée :</p>
          <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm text-muted">
            {IOS_STEPS.map((s) => <li key={s}>{s}</li>)}
          </ol>
        </>
      ) : null}
      {state === "unsupported" ? (
        <p className="text-sm text-muted">Ce navigateur ne gère pas les notifications. Ouvre Goal Master dans Chrome, Edge ou Firefox pour les activer. Les e-mails continuent d&apos;arriver.</p>
      ) : null}
    </div>
  );
}
