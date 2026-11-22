import { Sprite } from "@/components/Sprite";
import { formForLevel, levelFromXp } from "@/game/levels";
import { totalXp } from "@/game/xp";
import { isJobFinderOrigin } from "@/lib/widgetLink";
import { loadGame } from "@/server/game";
import { requirePlayer } from "@/server/session";
import { LinkPanel } from "./LinkPanel";

// Fenêtre ouverte par le bouton « Relier » de l'encart job-finder (maquette encart-job-finder, écran 2).
export default async function LinkPage({ searchParams }: { searchParams: Promise<{ origin?: string }> }): Promise<React.ReactElement> {
  const origin = (await searchParams).origin ?? null;
  if (!isJobFinderOrigin(origin)) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
        <div className="device flex flex-col gap-4">
          <h1 className="h-title">Lien impossible</h1>
          <p className="text-muted">Cette page s&apos;ouvre depuis l&apos;encart Goal Master de job-finder.</p>
        </div>
      </main>
    );
  }
  const player = await requirePlayer(`/relier?origin=${encodeURIComponent(origin)}`);
  const game = await loadGame();
  const form = formForLevel(levelFromXp(totalXp(player.id, game.apps, game.nudges, game.quests)).level);
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <LinkPanel origin={origin} pseudo={player.pseudo} hero={<Sprite character={player.character} color={player.color} form={form} pose="victory" px={4} />} />
    </main>
  );
}
