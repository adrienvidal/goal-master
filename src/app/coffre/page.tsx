import { redirect } from "next/navigation";
import { isCompanion, pendingChest } from "@/game/quests";
import { buildPlayerView } from "@/lib/playerView";
import { db } from "@/server/db";
import { loadGame } from "@/server/game";
import { requirePlayer } from "@/server/session";
import { Chest } from "./Chest";

// Coffre plein écran, avant l'accueil (maquette quetes, écran 5) : on n'en sort qu'en adoptant.
export default async function ChestPage(): Promise<React.ReactElement> {
  const player = await requirePlayer();
  const game = await loadGame();
  const chest = pendingChest(player.id, game.quests);
  if (!chest) redirect("/");
  const me = buildPlayerView(player, game.apps, game.nudges, game.quests, null, new Date());
  const giver = await db().player.findUnique({ where: { id: chest.giverId }, select: { pseudo: true } });
  return (
    <main className="chest-screen grid min-h-dvh place-items-center px-4 py-8">
      <Chest questId={chest.id} giver={giver?.pseudo ?? "Ton binôme"} text={chest.text} offer={chest.offer.filter(isCompanion)} character={player.character} color={player.color} form={me.displayedForm} />
    </main>
  );
}
