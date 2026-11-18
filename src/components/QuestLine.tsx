import Link from "next/link";
import type { QuestRow } from "@/game/quests";

// Ligne « Ta quête pour X » dans la carte du binôme (maquette quetes v2), tant que la quête donnée est en cours.
export function QuestLine({ quest, partnerName }: { quest: QuestRow; partnerName: string }): React.ReactElement {
  const done = quest.status === "DONE";
  return (
    <div className="qmini">
      <span className="lbl">Ta quête pour {partnerName}</span>
      <span className="txt">{quest.text}</span>
      <span className={`qstate ${done ? "todo" : "wait"}`}>{done ? "Faite · à valider" : "En cours"}</span>
      <Link href={`/quete/${quest.id}`} className={`btn sm no-underline ${done ? "ok" : "ghost"}`}>{done ? "Valider" : "Voir"}</Link>
    </div>
  );
}
