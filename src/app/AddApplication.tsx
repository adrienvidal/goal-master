"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { BusyLabel } from "@/components/LinkButton";
import { ACTION_EVENT } from "@/components/MyAvatar";
import { addApplication, cancelApplication, type DuplicateInfo } from "./actions";

const UNDO_SECONDS = 5;
const DAILY_CAP = 15;

type Props = { todayCount: number };
type Toast = { id: string; company: string; xp: boolean };

// « + Candidature » : un seul champ « Chez qui ? », un avertissement sans blocage en cas de doublon, puis un
// message « +10 XP » avec un lien Annuler pendant 5 secondes (cadrage §5 et §8).
export default function AddApplication({ todayCount }: Props): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [company, setCompany] = useState("");
  const [duplicateOf, setDuplicateOf] = useState<DuplicateInfo | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);
  const [pending, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), UNDO_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [toast]);

  function submit(confirm: boolean): void {
    setError("");
    startTransition(async () => {
      const result = await addApplication(company, confirm);
      if (result.ok) {
        window.dispatchEvent(new Event(ACTION_EVENT));
        setToast({ id: result.id, company: company.trim(), xp: todayCount < DAILY_CAP });
        setCompany("");
        setDuplicateOf(null);
        setOpen(false);
      } else if ("duplicate" in result) {
        setDuplicateOf(result.duplicate);
      } else {
        setError(result.error);
      }
    });
  }

  function undo(id: string): void {
    setToast(null);
    startTransition(async () => {
      await cancelApplication(id);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {open ? (
        <form
          className="flex flex-col gap-3 border-[3px] border-gold bg-night p-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit(false);
          }}
        >
          <label htmlFor="company" className="h-title">Chez qui ?</label>
          <input
            id="company"
            ref={input}
            className="input"
            value={company}
            maxLength={80}
            required
            autoComplete="organization"
            onChange={(e) => {
              setCompany(e.target.value);
              setDuplicateOf(null);
            }}
          />
          {duplicateOf ? (
            // Doublon sûr : ne pas l'ajouter d'abord. Possible : on demande si c'est un autre poste. Jamais bloquant.
            <>
              <p className="border-[3px] border-[#b9831c] bg-[#3a2f17] p-3">
                {duplicateOf.sure ? (
                  <>Déjà ajoutée {duplicateOf.when} : <b className="break-words">« {duplicateOf.company} »</b>. C&apos;est sûrement la même.</>
                ) : (
                  <>Même entreprise que <b className="break-words">« {duplicateOf.company} »</b>, {duplicateOf.when}. C&apos;est une autre candidature ?</>
                )}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className={`btn ${duplicateOf.sure ? "" : "ghost"} !text-[10px]`} onClick={() => { setDuplicateOf(null); setCompany(""); setOpen(false); }}>
                  {duplicateOf.sure ? "Ne pas l'ajouter" : "Non, la même"}
                </button>
                <button type="button" className={`btn ${duplicateOf.sure ? "ghost" : ""} !text-[10px]`} disabled={pending} onClick={() => submit(true)}>
                  <BusyLabel pending={pending}>{duplicateOf.sure ? "Compter quand même" : "Oui, autre poste"}</BusyLabel>
                </button>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <button type="submit" className="btn" disabled={pending}><BusyLabel pending={pending}>Valider · +10 XP</BusyLabel></button>
              <button type="button" className="btn ghost !w-auto px-4" onClick={() => setOpen(false)}>Fermer</button>
            </div>
          )}
          {error ? <p className="err">{error}</p> : null}
        </form>
      ) : (
        <button type="button" className="btn !py-5 !text-sm" onClick={() => setOpen(true)}>+ Candidature</button>
      )}

      {toast ? (
        <div role="status" className="flex items-center justify-between gap-3 border-[3px] border-gold bg-night px-3 py-2">
          <span>
            <b className="font-display text-[11px] text-gold">{toast.xp ? "+10 XP" : "+0 XP"}</b> {toast.company}
          </span>
          <button type="button" className="text-sm text-muted underline" onClick={() => undo(toast.id)}>Annuler</button>
        </div>
      ) : null}

      {todayCount >= DAILY_CAP ? (
        <p className="border-[3px] border-[#b9831c] bg-[#3a2f17] p-3 text-[15px]">
          <span className="num">{todayCount}/{DAILY_CAP}</span> aujourd&apos;hui. Les suivantes comptent pour ton objectif, sans XP. Reviens demain pour en regagner.
        </p>
      ) : null}
    </div>
  );
}
