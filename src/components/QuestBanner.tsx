import { LinkButton } from "@/components/LinkButton";
import type { QuestRow } from "@/game/quests";

// Bandeau parchemin (maquette quetes v2) : seulement quand une quête reçue est en cours.
// Une quête revenue après « pas encore » (ouverte mais déjà marquée faite une fois) le dit clairement.
export function QuestBanner({ quest, partnerName, children }: { quest: QuestRow; partnerName: string; children: React.ReactNode }): React.ReactElement {
  const done = quest.status === "DONE";
  const sentBack = quest.status === "OPEN" && quest.doneAt !== null;
  return (
    <div className="qbanner">
      {children}
      <p className="min-w-0">
        <b>{sentBack ? `📜 ${partnerName} dit « pas encore »` : `📜 ${partnerName} te lance une quête`}</b>
        <q>{quest.text}</q>
        {done ? <small className="qstate wait">Faite · en attente</small> : null}
        {sentBack ? <small className="qstate todo">{quest.link ? "À refaire · vérifie ton lien" : "À refaire"}</small> : null}
      </p>
      <LinkButton href={`/quete/${quest.id}`} className="btn sm no-underline">Voir</LinkButton>
    </div>
  );
}
