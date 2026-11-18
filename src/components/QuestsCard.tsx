import Link from "next/link";
import { ofName } from "@/lib/french";
import type { QuestRow } from "@/game/quests";

// Carte « Quêtes » de l'accueil (maquette quetes, écran 1) : la quête reçue et la quête donnée.
export function QuestsCard({ received, given, partnerName }: { received: QuestRow | null; given: QuestRow | null; partnerName: string }): React.ReactElement {
  return (
    <section className="quests" aria-label="Quêtes">
      <h2>Quêtes</h2>
      <div className="qline">
        <span className="lbl">Pour toi{received ? ` · ${ofName(partnerName)}` : ""}</span>
        {received ? (
          <>
            <span className="txt">
              {received.text}
              <small>{received.status === "DONE" ? <span className="qstate wait">Faite · en attente</span> : "À toi de jouer"}</small>
            </span>
            <Link href={`/quete/${received.id}`} className="btn sm no-underline">Voir</Link>
          </>
        ) : (
          <span className="txt">Rien pour l&apos;instant.<small>{partnerName} peut t&apos;en lancer une.</small></span>
        )}
      </div>
      <div className="qline">
        <span className="lbl">Pour {partnerName}</span>
        {given ? (
          <>
            <span className="txt">
              {given.text}
              <small>{given.status === "DONE" ? <span className="qstate todo">Faite · à valider</span> : <span className="qstate wait">En cours</span>}</small>
            </span>
            <Link href={`/quete/${given.id}`} className={`btn sm no-underline ${given.status === "DONE" ? "" : "ghost"}`}>{given.status === "DONE" ? "Valider" : "Voir"}</Link>
          </>
        ) : (
          <>
            <span className="txt">Pousse {partnerName} vers ce qui attire les recruteurs : un post, un contact, un salon.<small>Un compagnon pour {partnerName}, +5 XP pour toi.</small></span>
            <Link href="/quete/nouvelle" className="btn sm no-underline">Lancer</Link>
          </>
        )}
      </div>
    </section>
  );
}
