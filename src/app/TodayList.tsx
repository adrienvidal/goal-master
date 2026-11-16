"use client";
import { useState, useTransition } from "react";
import { removeApplication } from "./actions";

export type TodayItem = { id: string; name: string; detail: string; time: string; warning: string };

// Candidatures du jour, chacune retirable après confirmation dans la ligne (maquette candidatures-du-jour).
export default function TodayList({ items, count, cap }: { items: TodayItem[]; count: number; cap: number }): React.ReactElement {
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [pending, startTransition] = useTransition();

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted">
        Aujourd&apos;hui (<span className="num">0/{cap}</span>) : pas encore de candidature.
      </p>
    );
  }

  function remove(item: TodayItem): void {
    setError("");
    startTransition(async () => {
      try {
        const result = await removeApplication(item.id);
        if (!result.ok) return setError(result.error);
        setConfirming(null);
        setToast(`${result.xp > 0 ? `−${result.xp} XP · ` : ""}${item.name} retirée`);
      } catch {
        setError("Impossible de la retirer pour l'instant. Vérifie ta connexion et réessaie.");
      }
    });
  }

  return (
    <section className="flex flex-col gap-2" aria-labelledby="today-title">
      {toast ? <p role="status" className="border-[3px] border-edge bg-night px-3 py-2 text-[15px]">{toast}</p> : null}
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="today-title" className="font-display text-[10px] leading-relaxed">Aujourd&apos;hui</h2>
        <span className="num text-muted">{count}/{cap}</span>
      </div>
      <ul className="flex flex-col">
        {items.map((item) =>
          confirming === item.id ? (
            <li key={item.id} className="my-1 flex flex-col gap-2.5 border-[3px] border-danger bg-[#3a1b2a] p-2.5">
              <p className="text-[15px] leading-snug">
                Retirer <b className="break-words">{item.name}</b> ? {item.warning}
              </p>
              {error ? <p className="err">{error}</p> : null}
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className="btn ghost !text-[10px]" onClick={() => { setConfirming(null); setError(""); }}>Garder</button>
                <button type="button" className="btn !bg-danger !text-[10px]" disabled={pending} onClick={() => remove(item)}>{error ? "Réessayer" : "Retirer"}</button>
              </div>
            </li>
          ) : (
            <li key={item.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5 border-b-2 border-dotted border-stone-2 py-1.5 last:border-b-0">
              <time className="num text-muted">{item.time}</time>
              <span className="min-w-0 break-words text-[15px] font-semibold leading-snug">
                {item.name}
                {item.detail ? <small className="block font-normal text-muted">{item.detail}</small> : null}
              </span>
              <button
                type="button"
                aria-label={`Retirer ${item.name}`}
                className="grid size-8 place-items-center border-2 border-edge font-display text-[11px] text-muted hover:border-danger hover:text-danger"
                onClick={() => { setConfirming(item.id); setError(""); setToast(""); }}
              >
                <span aria-hidden>✕</span>
              </button>
            </li>
          ),
        )}
      </ul>
    </section>
  );
}
