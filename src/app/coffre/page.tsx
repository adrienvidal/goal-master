import { redirect } from "next/navigation";
import { levelFromXp } from "@/game/levels";
import { chestChoices, ownedCompanions, pendingChest, XP_QUEST_DONE } from "@/game/quests";
import { totalXp } from "@/game/xp";
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
  const owned = ownedCompanions(player.id, game.quests);
  // L'XP de la quête compte déjà : la barre part d'avant la quête pour monter de +20 sous les yeux du joueur.
  const total = totalXp(player.id, game.apps, game.nudges, game.quests);
  const xp = { before: levelFromXp(Math.max(0, total - XP_QUEST_DONE)), after: levelFromXp(total) };
  const giver = await db().player.findUnique({ where: { id: chest.giverId }, select: { pseudo: true } });
  return (
    <main className="chest-screen grid min-h-dvh place-items-center px-4 py-8">
      <Chest key={chest.id} questId={chest.id} giver={giver?.pseudo ?? "Ton binôme"} text={chest.text} offer={chestChoices(chest, owned)} owned={owned} xp={xp} character={player.character} color={player.color} form={me.displayedForm} />
    </main>
  );
}
