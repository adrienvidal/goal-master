import { redirect } from "next/navigation";
import { BossSprite } from "@/components/BossSprite";
import { BossUltimate } from "@/components/BossUltimate";
import { DuelContinue } from "@/components/DuelWatcher";
import { Sprite } from "@/components/Sprite";
import { BOSSES, currentDuel, fightersMeFirst, pastDuels } from "@/game/duel";
import { buildPlayerView } from "@/lib/playerView";
import { loadDuelInput, loadGame, syncAchievements } from "@/server/game";
import { requirePlayer } from "@/server/session";

// Résultat du dernier duel, en plein écran (maquette decor-et-duel, écrans 5 et 6).
export default async function DuelPage(): Promise<React.ReactElement> {
  const player = await requirePlayer();
  const game = await loadGame();
  const now = new Date();
  const input = await loadDuelInput(game);
  const past = pastDuels(input, now);
  const duel = past[0];
  if (!duel) redirect("/");
  await syncAchievements(game, now);
  const firstWin = duel.won && past.filter((d) => d.won).length === 1;
  const next = currentDuel(input, now);
  const views = game.players.map((p) => buildPlayerView(p, game.apps, game.nudges, game.quests, null, now));
  const name = (id: string) => views.find((v) => v.id === id)?.pseudo ?? "?";
  const fighters = fightersMeFirst(duel.fighters, player.id);
  const levels = fighters.map((f) => views.find((v) => v.id === f.playerId)?.level).filter(Boolean);
  const boss = BOSSES[duel.boss];
  const meFirst = [...views].sort((a, b) => (a.id === player.id ? -1 : b.id === player.id ? 1 : 0));
  const look = (v: (typeof views)[number]) => ({ character: v.character, color: v.color, form: v.displayedForm });

  return (
    <main className="mx-auto grid min-h-dvh max-w-xl content-center px-4 py-8">
      {duel.won ? <div className="duel-flash" aria-hidden /> : null}
      <div className={`device flex flex-col items-center gap-5 text-center ${duel.won ? "!border-gold" : "!border-danger"}`}>
        <h1 className={`h-title text-balance ${duel.won ? "text-gold" : "text-danger"}`}>{duel.won ? "Boss vaincu !" : `${boss} vous met K.O.`}</h1>
        {duel.won ? (
          <div className="flex items-end justify-center gap-4 sm:gap-6">
            {meFirst[0] ? <Sprite character={meFirst[0].character} color={meFirst[0].color} form={meFirst[0].displayedForm} pose="victory" px={4} label={meFirst[0].title} /> : null}
            <span className="boss-down"><BossSprite boss={duel.boss} px={4} /></span>
            {meFirst[1] ? <Sprite character={meFirst[1].character} color={meFirst[1].color} form={meFirst[1].displayedForm} pose="victory" px={4} label={meFirst[1].title} /> : null}
          </div>
        ) : (
          <BossUltimate boss={duel.boss} me={look(meFirst[0])} partner={meFirst[1] ? look(meFirst[1]) : null} />
        )}
        <dl className="flex w-full flex-col gap-1 text-[15px]">
          {fighters.map((f) => (
            <div key={f.playerId} className="flex justify-between border-b-2 border-dotted border-stone-2 pb-1">
              <dt>{name(f.playerId)}</dt>
              <dd className="num">{f.hits} coup{f.hits > 1 ? "s" : ""}{f.support > 0 ? ` (dont ${f.support} d'entraide)` : ""}</dd>
            </div>
          ))}
          <div className="flex justify-between border-b-2 border-dotted border-stone-2 pb-1">
            <dt>Coup de grâce (niv. {levels.join(" et ")})</dt>
            <dd className="num">+{duel.bonus}</dd>
          </div>
          <div className="flex justify-between font-semibold">
            <dt>Total contre {duel.hp} PV</dt>
            <dd className={`num ${duel.won ? "" : "text-danger"}`}>{duel.hits + duel.bonus}</dd>
          </div>
        </dl>
        {firstWin ? <p className="border-[3px] border-gold px-3 py-2 text-sm">🏆 Succès débloqué : Premier boss</p> : null}
        {!duel.won ? <p className="text-sm text-muted">Vous êtes blessés jusqu&apos;à votre prochaine victoire. Aucune XP, aucun niveau, aucun succès perdu.</p> : null}
        {next ? <p className="text-sm text-muted">Prochain boss : {BOSSES[next.boss]}, {next.hp} PV, vendredi 18 h.</p> : null}
        <DuelContinue id={duel.id} />
      </div>
    </main>
  );
}
