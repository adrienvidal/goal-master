import { redirect } from "next/navigation";
import { ChallengeContinue } from "@/components/DuelWatcher";
import { Sprite } from "@/components/Sprite";
import { challengeScore, finishedChallenges } from "@/game/challenge";
import { buildPlayerView } from "@/lib/playerView";
import { loadGame, syncAchievements } from "@/server/game";
import { requirePlayer } from "@/server/session";

// Résultat du dernier défi terminé (maquette defi, écran 6) : victoire, défaite ou nul.
export default async function ChallengePage(): Promise<React.ReactElement> {
  const player = await requirePlayer();
  const game = await loadGame();
  const now = new Date();
  const finished = finishedChallenges(game.challenges, now);
  const challenge = finished[0];
  if (!challenge) redirect("/");
  await syncAchievements(game, now);
  const views = game.players.map((p) => buildPlayerView(p, game.apps, game.nudges, null, now));
  const me = views.find((v) => v.id === player.id);
  const partner = views.find((v) => v.id !== player.id);
  if (!me || !partner) redirect("/");
  const mine = challengeScore(me.id, challenge, game.apps);
  const theirs = challengeScore(partner.id, challenge, game.apps);
  const outcome = challenge.winnerId === me.id ? "won" : challenge.winnerId ? "lost" : "draw";
  const myWins = finished.filter((c) => c.winnerId === me.id).length;
  let run = 0;
  while (run < finished.length && finished[run].winnerId === me.id) run++;
  const badge = outcome === "won" ? (run === 3 ? "Invaincu · 3 défis gagnés d'affilée" : myWins === 1 ? "Duelliste · gagner un défi" : null) : null;
  const title = outcome === "won" ? `Tu as battu ${partner.pseudo} !` : outcome === "lost" ? `${partner.pseudo} l'emporte.` : `Personne n'a atteint ${challenge.target}.`;
  const crowned = (id: string) => challenge.winnerId === id;

  return (
    <main className="mx-auto grid min-h-dvh max-w-xl content-center px-4 py-8">
      {outcome === "won" ? <div className="duel-flash" aria-hidden /> : null}
      <div className={`device flex flex-col items-center gap-5 text-center ${outcome === "won" ? "!border-gold" : ""}`}>
        <h1 className={`h-title text-balance ${outcome === "won" ? "text-gold" : "text-muted"}`}>{title}</h1>
        <div className="flex items-end justify-center gap-6">
          {[me, partner].map((v) => (
            <Sprite key={v.id} character={v.character} color={v.color} form={v.displayedForm} mood={v.mood} pose={crowned(v.id) ? "victory" : "rest"} crown={crowned(v.id)} px={crowned(v.id) ? 5 : 3} label={v.title} />
          ))}
        </div>
        <p className="num !text-5xl leading-none">
          {mine} – {theirs}
        </p>
        {outcome === "won" ? <p className="text-sm text-muted">Ta couronne reste sur ton avatar jusqu&apos;à demain minuit.</p> : null}
        {outcome === "lost" ? <p className="text-sm text-muted">Tes {mine} candidature{mine > 1 ? "s" : ""} comptent quand même pour ton XP et pour le boss de la semaine.</p> : null}
        {outcome === "draw" ? <p className="text-sm text-muted">Pas de couronne cette fois. Toutes vos candidatures comptent pour l&apos;XP et pour le boss.</p> : null}
        {badge ? <p className="border-[3px] border-gold px-3 py-2 text-sm">🏆 Succès débloqué : {badge}</p> : null}
        <ChallengeContinue id={challenge.id} />
      </div>
    </main>
  );
}
