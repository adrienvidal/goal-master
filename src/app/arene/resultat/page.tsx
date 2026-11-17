import { redirect } from "next/navigation";
import { ArenaContinue } from "@/components/DuelWatcher";
import { Sprite } from "@/components/Sprite";
import { arenaState, finishedArenas } from "@/game/arena";
import { activeApplications } from "@/game/xp";
import { buildPlayerView } from "@/lib/playerView";
import { arenaInputs, loadGame, syncAchievements } from "@/server/game";
import { requirePlayer } from "@/server/session";

const WHEN = new Intl.DateTimeFormat("fr-FR", { weekday: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

// Résultat de la dernière Arène terminée (maquette arene, écran 7) : K.O., défaite, victoire aux points, nul.
export default async function ArenaResultPage(): Promise<React.ReactElement> {
  const player = await requirePlayer();
  const game = await loadGame();
  const now = new Date();
  const mine = arenaInputs(game).filter((i) => i.arena.challengerId === player.id || i.arena.opponentId === player.id);
  const finished = finishedArenas(mine, now);
  const last = finished[0];
  if (!last) redirect("/");
  await syncAchievements(game, now);
  const { input, over } = last;
  const s = arenaState(input, now);
  const views = game.players.map((p) => buildPlayerView(p, game.apps, game.nudges, null, now));
  const me = views.find((v) => v.id === player.id);
  const partner = views.find((v) => v.id !== player.id);
  if (!me || !partner) redirect("/");
  const outcome = over.winnerId === me.id ? "won" : over.winnerId ? "lost" : "draw";
  const inFight = (id: string) => activeApplications(game.apps).filter((a) => a.userId === id && a.createdAt > input.arena.acceptedAt! && a.createdAt <= over.at).length;
  const dealt = (id: string) => s.log.filter((e) => e.playerId === id && (e.kind === "ATTACK" || e.kind === "THRUST")).reduce((n, e) => n + e.amount, 0);
  const wins = finished.filter((f) => f.over.winnerId === me.id).length;
  const badge = outcome === "won" ? (over.byBotte ? "Coup de maître · K.O. dans le tour de ta Botte" : wins === 1 ? "Gladiateur · gagner une Arène" : null) : null;
  const title =
    outcome === "won" ? (over.ko ? `K.O. ! Tu as battu ${partner.pseudo}.` : "Victoire aux points") : outcome === "lost" ? `${partner.pseudo} l'emporte.` : "Match nul";
  const winnerPose = (id: string) => (over.winnerId === id ? "victory" : over.ko ? "ko" : "rest");
  const myApps = inFight(me.id);

  return (
    <main className="mx-auto grid min-h-dvh max-w-xl content-center px-4 py-8">
      {outcome === "won" ? <div className="duel-flash" aria-hidden /> : null}
      <div className={`device flex flex-col items-center gap-5 text-center ${outcome === "won" ? "!border-gold" : ""}`}>
        <h1 className={`h-title text-balance ${outcome === "won" ? "text-gold" : "text-muted"}`}>{title}</h1>
        <div className="flex min-h-[110px] items-end justify-center gap-6">
          {[me, partner].map((v) => (
            <Sprite key={v.id} character={v.character} color={v.color} form={v.displayedForm} mood={v.mood} pose={winnerPose(v.id)} crown={over.winnerId === v.id} px={over.winnerId === v.id ? 5 : 4} label={v.title} />
          ))}
        </div>
        {over.ko ? <p className="text-sm text-muted">Fin du combat {WHEN.format(over.at)}.</p> : <p className="num !text-3xl">{s.hp[me.id]} PV – {s.hp[partner.id]} PV</p>}
        <div className="grid w-full max-w-[300px] grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1 text-left text-sm">
          <span />
          <span className="text-xs uppercase tracking-wider text-muted">Toi</span>
          <span className="text-xs uppercase tracking-wider text-muted">{partner.pseudo}</span>
          <span>PV restants</span><span className="num text-right">{s.hp[me.id]}</span><span className="num text-right">{s.hp[partner.id]}</span>
          <span>Candidatures</span><span className="num text-right">{myApps}</span><span className="num text-right">{inFight(partner.id)}</span>
          <span>Dégâts infligés</span><span className="num text-right">{dealt(me.id)}</span><span className="num text-right">{dealt(partner.id)}</span>
        </div>
        {outcome === "won" ? <p className="text-sm text-muted">Ta couronne reste sur ton avatar jusqu&apos;à demain minuit.</p> : null}
        {outcome === "lost" ? (
          <p className="text-sm text-muted">
            {myApps === 0 ? "Aucune candidature pendant ce combat : au prochain, chacune te donne 2 ⚡." : `${myApps === 1 ? "Ta candidature" : `Tes ${myApps} candidatures`} pendant le combat ${myApps === 1 ? "compte" : "comptent"} quand même pour ton XP et pour le boss.`}
          </p>
        ) : null}
        {outcome === "draw" ? <p className="text-sm text-muted">Même nombre de PV : pas de couronne cette fois.</p> : null}
        {badge ? <p className="border-[3px] border-gold px-3 py-2 text-sm">🏆 Succès débloqué : {badge}</p> : null}
        <ArenaContinue id={input.arena.id} />
      </div>
    </main>
  );
}
