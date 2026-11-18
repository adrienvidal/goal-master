import { LinkButton } from "@/components/LinkButton";
import type { QuestRow } from "@/game/quests";

// Bandeau parchemin (maquette quetes v2) : seulement quand une quête reçue est en cours.
export function QuestBanner({ quest, partnerName, children }: { quest: QuestRow; partnerName: string; children: React.ReactNode }): React.ReactElement {
  const done = quest.status === "DONE";
  return (
    <div className="qbanner">
      {children}
      <p className="min-w-0">
        <b>📜 {partnerName} te lance une quête</b>
        <q>{quest.text}</q>
        {done ? <small className="qstate wait">Faite · en attente</small> : null}
      </p>
      <LinkButton href={`/quete/${quest.id}`} className="btn sm no-underline">Voir</LinkButton>
    </div>
  );
}
