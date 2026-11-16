import { redirect } from "next/navigation";
import { addDays, parisDay } from "@/game/calendar";
import { buildPlayerView } from "@/lib/playerView";
import { defaultDeadline } from "@/lib/onboarding";
import { db } from "@/server/db";
import { loadGame } from "@/server/game";
import { requirePlayer } from "@/server/session";
import { partnerDeadline } from "@/server/sharedGoal";
import NewGoalForm from "./NewGoalForm";

export default async function NewGoalPage(): Promise<React.ReactElement> {
  const player = await requirePlayer();
  if (await db().goal.count({ where: { playerId: player.id, status: "ACTIVE" } })) redirect("/");
  const game = await loadGame();
  const now = new Date();
  const me = buildPlayerView(player, game.apps, game.nudges, null, now);
  const today = parisDay(now);
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <NewGoalForm
        character={me.character}
        color={me.color}
        form={me.levelForm}
        defaultDeadline={defaultDeadline(today)}
        minDeadline={addDays(today, 1)}
        sharedDeadline={await partnerDeadline(player.id)}
      />
    </main>
  );
}
