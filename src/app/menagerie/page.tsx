import { LinkButton } from "@/components/LinkButton";
import { COMPANION_IDS, companionLabel, ownedCompanions } from "@/game/quests";
import { loadGame } from "@/server/game";
import { requirePlayer } from "@/server/session";
import { Menagerie } from "./Menagerie";

// Ménagerie (maquette quetes, écran 6) : compagnons adoptés, l'affiché en or, silhouettes du reste.
export default async function MenageriePage(): Promise<React.ReactElement> {
  const player = await requirePlayer();
  const game = await loadGame();
  const owned = ownedCompanions(player.id, game.quests);
  const partner = game.players.find((p) => p.id !== player.id);
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 md:py-10">
      <div className="device flex flex-col gap-4">
        <h1 className="h-title">Ta Ménagerie <span className="num text-muted">{owned.length}/{COMPANION_IDS.length}</span></h1>
        <Menagerie owned={owned} shown={player.companion} names={Object.fromEntries(owned.map((c) => [c, companionLabel(player.id, c, game.quests)]))} />
        <p className="text-sm text-muted">
          {owned.length === 0
            ? `Aucun compagnon pour l'instant. Accomplis une quête de ${partner?.pseudo ?? "ton binôme"} pour ouvrir ton premier coffre.`
            : "Chaque quête validée ouvre un coffre. Touche un compagnon pour l'afficher à côté de ton héros."}
        </p>
        <LinkButton href="/" className="btn ghost no-underline md:max-w-xs">Retour</LinkButton>
      </div>
    </main>
  );
}
