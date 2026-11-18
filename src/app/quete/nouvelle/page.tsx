import Link from "next/link";
import { redirect } from "next/navigation";
import { openQuest } from "@/game/quests";
import { loadGame } from "@/server/game";
import { requirePlayer } from "@/server/session";
import { QuestForm } from "./QuestForm";

// Lancer une quête (maquette quetes, écran 2).
export default async function NewQuestPage(): Promise<React.ReactElement> {
  const player = await requirePlayer();
  const game = await loadGame();
  const partner = game.players.find((p) => p.id !== player.id);
  if (!partner) redirect("/");
  const running = openQuest(player.id, partner.id, game.quests);
  return (
    <main className="mx-auto max-w-xl px-4 py-6 md:py-10">
      <div className="device flex flex-col gap-4">
        <h1 className="h-title">Une quête pour {partner.pseudo}</h1>
        {running ? (
          <>
            <p className="note">{partner.pseudo} a déjà une quête de ta part : « {running.text} ». Attends qu&apos;elle soit validée ou annule-la.</p>
            <span className="btn off" aria-disabled="true">Lancer la quête</span>
            <Link href={`/quete/${running.id}`} className="btn ghost no-underline">Voir sa quête en cours</Link>
          </>
        ) : (
          <>
            <p className="text-sm leading-snug text-muted">Une action qui rapproche {partner.pseudo} d&apos;un poste, autre qu&apos;une candidature. Tu valideras quand c&apos;est fait.</p>
            <QuestForm partnerName={partner.pseudo} />
          </>
        )}
        <Link href="/" className="btn ghost no-underline">Retour</Link>
      </div>
    </main>
  );
}
