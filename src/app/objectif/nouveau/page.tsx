import { redirect } from "next/navigation";
import { addDays, parisDay } from "@/game/calendar";
import { buildPlayerView } from "@/lib/playerView";
import { defaultDeadline, DEFAULT_TARGET } from "@/lib/onboarding";
import { db } from "@/server/db";
import { loadGame } from "@/server/game";
import { requirePlayer } from "@/server/session";
import NewGoalForm from "./NewGoalForm";

export default async function NewGoalPage(): Promise<React.ReactElement> {
  const player = await requirePlayer();
  if (await db().goal.count({ where: { playerId: player.id, status: "ACTIVE" } })) redirect("/");
  const game = await loadGame();
  const now = new Date();
  const me = buildPlayerView(player, game.apps, game.nudges, null, now);
  const last = await db().goal.findFirst({ where: { playerId: player.id }, orderBy: { createdAt: "desc" }, select: { target: true } });
  const today = parisDay(now);
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <p className="h-title mb-6 text-gold">Nouvel objectif</p>
      <NewGoalForm
        character={me.character}
        color={me.color}
        form={me.levelForm}
        defaultTarget={last?.target ?? DEFAULT_TARGET}
        defaultDeadline={defaultDeadline(today)}
        minDeadline={addDays(today, 1)}
      />
    </main>
  );
}
