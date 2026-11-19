import { redirect } from "next/navigation";
import { BossFinale } from "@/components/BossFinale";
import { SubmitButton } from "@/components/LinkButton";
import { Sprite } from "@/components/Sprite";
import { parisDay } from "@/game/calendar";
import { currentDuel, pastDuels } from "@/game/duel";
import { buildFinale } from "@/game/finale";
import { extendedDeadline, goalOutcome } from "@/lib/goal";
import { buildPlayerView } from "@/lib/playerView";
import { db } from "@/server/db";
import { loadDuelInput, loadGame } from "@/server/game";
import { requirePlayer } from "@/server/session";
import { abandonGoal, completeGoal, extendGoal } from "../actions";

const DAY_MS = 24 * 60 * 60 * 1000;
const short = (day: string): string => `${day.slice(8, 10)}/${day.slice(5, 7)}`;

// Fin d'objectif (cadrage §4.4) : victoire, ou « Temps écoulé » sans pénalité.
export default async function GoalEndPage(): Promise<React.ReactElement> {
  const player = await requirePlayer();
  const goal = await db().goal.findFirst({ where: { playerId: player.id, status: "ACTIVE" }, orderBy: { createdAt: "desc" } });
  if (!goal) redirect("/objectif/nouveau");
  const game = await loadGame();
  const now = new Date();
  const me = buildPlayerView(player, game.apps, game.nudges, game.quests, goal, now);
  const g = me.goal!;
  const outcome = goalOutcome(g.done, g.target, g.deadline, parisDay(now));
  if (outcome === "active") redirect("/");

  // Boss final : la quête rejouée à partir des duels du vendredi (cadrage boss-finale).
  const duelInput = await loadDuelInput(game);
  const current = currentDuel(duelInput, now);
  const partnerRow = game.players.find((p) => p.id !== player.id) ?? null;
  const partner = partnerRow ? buildPlayerView(partnerRow, game.apps, game.nudges, game.quests, null, now) : null;
  const finale = buildFinale([...pastDuels(duelInput, now), ...(current ? [current] : [])], player.id, partner?.id ?? null, outcome === "won" ? "won" : "expired");
  const arena = (form: typeof me.displayedForm) =>
    finale ? (
      <BossFinale
        finale={finale}
        me={{ character: me.character, color: me.color, form }}
        partner={partner ? { character: partner.character, color: partner.color, form: partner.displayedForm } : null}
        names={[me.pseudo, partner?.pseudo ?? ""]}
      />
    ) : null;

  if (outcome === "won") {
    const days = Math.max(1, Math.round((now.getTime() - goal.createdAt.getTime()) / DAY_MS));
    return (
      <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-4 py-10">
        <div className="device evo-end flex flex-col items-center gap-5 text-center">
          {arena(me.levelForm) ?? <Sprite character={me.character} color={me.color} form={me.levelForm} pose="victory" px={6} label={me.title} />}
          <p className="h-title text-gold">Mission accomplie !</p>
          <p className="num text-lg">
            {g.done} candidatures · Niv. {me.level} · {days} j de quête
          </p>
          <p className="text-muted">Succès « Mission accomplie » débloqué. Tu gardes ton XP, ton niveau et tes succès.</p>
          <form action={completeGoal} className="w-full max-w-md">
            <SubmitButton className="btn">Nouvel objectif</SubmitButton>
          </form>
          <small className="text-muted">Au nouvel objectif, tu peux changer de personnage.</small>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-4 py-10">
      <div className="device flex flex-col items-center gap-5 text-center">
        {arena(me.displayedForm) ?? <Sprite character={me.character} color={me.color} form={me.displayedForm} mood={me.mood} px={5} label={me.title} />}
        <p className="h-title text-gold">Temps écoulé</p>
        <p>
          <span className="num">{g.done}</span> candidatures sur <span className="num">{g.target}</span> au {short(g.deadline)}. {finale ? "Le boss est sonné. " : ""}Ton avatar garde tout ce qu&apos;il a gagné.
        </p>
        <form action={extendGoal} className="w-full max-w-md">
          <SubmitButton className="btn">Reprendre le combat jusqu&apos;au <span className="whitespace-nowrap">{short(extendedDeadline(parisDay(now)))}</span></SubmitButton>
        </form>
        <form action={abandonGoal} className="w-full max-w-md">
          <SubmitButton className="btn ghost">Nouvel objectif</SubmitButton>
        </form>
      </div>
    </main>
  );
}
