import Link from "next/link";
import { notFound } from "next/navigation";
import { XP_QUEST_GIVEN } from "@/game/quests";
import { db } from "@/server/db";
import { requirePlayer } from "@/server/session";
import { CancelQuest, MarkDone, ReviewQuest } from "./QuestActions";

const DATE = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "2-digit", month: "2-digit" });
const TIME = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });

function Steps({ on }: { on: 0 | 1 | 2 }): React.ReactElement {
  return (
    <div className="qsteps" aria-label="Avancement">
      {["Lancée", "Faite", "Validée"].map((s, i) => (
        <span key={s} className={i === on ? "on" : ""}>{s}</span>
      ))}
    </div>
  );
}

// Une quête, vue du destinataire ou du donneur (maquette quetes, écrans 3 et 4).
export default async function QuestPage({ params }: { params: Promise<{ id: string }> }): Promise<React.ReactElement> {
  const { id } = await params;
  const player = await requirePlayer();
  const quest = await db().quest.findUnique({ where: { id }, include: { giver: { select: { pseudo: true } }, receiver: { select: { pseudo: true } } } });
  if (!quest || (quest.giverId !== player.id && quest.receiverId !== player.id)) notFound();
  const mine = quest.receiverId === player.id;
  const partner = mine ? quest.giver.pseudo : quest.receiver.pseudo;
  const step = quest.status === "VALIDATED" ? 2 : quest.status === "DONE" ? 1 : 0;
  const from = mine ? `Quête de ${partner} · ${DATE.format(quest.createdAt)}` : `Ta quête pour ${partner} · ${quest.status === "DONE" && quest.doneAt ? `faite le ${DATE.format(quest.doneAt)} à ${TIME.format(quest.doneAt)}` : `lancée ${DATE.format(quest.createdAt)}`}`;

  return (
    <main className="mx-auto max-w-xl px-4 py-6 md:py-10">
      <div className="device flex flex-col gap-4">
        {quest.status === "CANCELLED" ? null : <Steps on={step} />}
        <div className="scroll">
          <span className="from">{from}</span>
          <q>{quest.text}</q>
          {quest.link && quest.status !== "VALIDATED" ? <a href={quest.link} target="_blank" rel="noopener noreferrer nofollow">{quest.link}</a> : null}
        </div>

        {quest.status === "CANCELLED" ? <p className="note">{mine ? `${partner} a retiré cette quête.` : "Tu as annulé cette quête."}</p> : null}

        {mine && quest.status === "OPEN" ? (
          <>
            {quest.doneAt ? <p className="note">{partner} dit « pas encore ». Vérifie ton lien et renvoie.</p> : null}
            <MarkDone id={quest.id} link={quest.link ?? ""} />
          </>
        ) : null}
        {mine && quest.status === "DONE" ? <p className="text-sm text-muted">C&apos;est envoyé à {partner}. Dès sa validation, un coffre t&apos;attend.</p> : null}
        {mine && quest.status === "VALIDATED" ? <p className="text-sm text-muted">Quête validée : +20 XP. Ton compagnon t&apos;attend dans ta Ménagerie.</p> : null}

        {!mine && quest.status === "DONE" ? (
          <>
            <p className="text-sm text-muted">{quest.link ? "Vérifie le lien, puis valide." : "Pas de lien : fie-toi à ce que tu as vu."}</p>
            <ReviewQuest id={quest.id} />
          </>
        ) : null}
        {!mine && quest.status === "OPEN" ? (
          <>
            <p className="text-sm text-muted">{partner} ne l&apos;a pas encore marquée faite.</p>
            <CancelQuest id={quest.id} partnerName={partner} />
          </>
        ) : null}
        {!mine && quest.status === "VALIDATED" ? (
          <>
            <p className="num text-center text-2xl text-gold">+{XP_QUEST_GIVEN} XP</p>
            <p className="text-sm text-muted">{partner} ouvrira son coffre à sa prochaine visite. Tu peux lui lancer une nouvelle quête.</p>
            <Link href="/quete/nouvelle" className="btn no-underline">Nouvelle quête</Link>
          </>
        ) : null}
        <Link href="/" className="btn ghost no-underline">Retour</Link>
      </div>
    </main>
  );
}
