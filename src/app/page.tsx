import { AvatarBox } from "@/components/AvatarBox";
import { Bar } from "@/components/Bar";
import { Flame } from "@/components/Flame";
import { buildPlayerView, type PlayerView } from "@/lib/playerView";
import { db } from "@/server/db";
import { loadGame } from "@/server/game";
import { requirePlayer } from "@/server/session";
import AddApplication from "./AddApplication";

function shortDate(day: string): string {
  const [, m, d] = day.split("-");
  return `${d}/${m}`;
}

function Streak({ days }: { days: number }): React.ReactElement {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap font-display text-[11px] text-ember">
      <Flame />
      {days} j
    </span>
  );
}

async function goalFor(playerId: string): Promise<{ target: number; deadline: Date; createdAt: Date } | null> {
  return db().goal.findFirst({ where: { playerId, status: "ACTIVE" }, orderBy: { createdAt: "desc" }, select: { target: true, deadline: true, createdAt: true } });
}

function GoalBlock({ view }: { view: PlayerView }): React.ReactElement | null {
  if (!view.goal) return null;
  const { done, target, deadline, daysLeft } = view.goal;
  return (
    <div className="flex flex-col gap-2 bg-stone-2 p-3">
      <p className="font-display text-xl">
        <span className="num">{done}</span> <small className="text-[11px] text-muted">/ {target} candidatures</small>
      </p>
      <Bar value={done} max={target} tone="green" label="Progression de l'objectif" />
      <p className="flex justify-between gap-2 text-sm text-muted">
        <span>Avant le {shortDate(deadline)}</span>
        <span className="num">J-{daysLeft} · il en reste {Math.max(0, target - done)}</span>
      </p>
    </div>
  );
}

export default async function HomePage(): Promise<React.ReactElement> {
  const player = await requirePlayer();
  const game = await loadGame();
  const now = new Date();
  const me = buildPlayerView(player, game.apps, game.nudges, await goalFor(player.id), now);
  const partnerRow = game.players.find((p) => p.id !== player.id);
  const partner = partnerRow ? buildPlayerView(partnerRow, game.apps, game.nudges, await goalFor(partnerRow.id), now) : null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 md:py-10">
      <div className="device grid gap-6 md:grid-cols-[1.3fr_1fr]">
        <section className="flex flex-col gap-4" aria-label="Ma quête">
          <div className="flex items-end gap-4">
            <AvatarBox character={me.character} color={me.color} form={me.displayedForm} mood={me.mood} size={88} />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-[11px] leading-relaxed">{me.pseudo} · Niv. {me.level}</span>
                <Streak days={me.streak} />
              </div>
              <span className="text-sm text-muted">{me.title}</span>
              <Bar value={me.xpInLevel} max={me.xpForNext} label="Expérience du niveau" />
              <span className="num text-sm text-muted">{me.xpInLevel} / {me.xpForNext} XP</span>
            </div>
          </div>
          <GoalBlock view={me} />
          <AddApplication todayCount={me.today.count} />
          <p className="text-sm text-muted">
            Aujourd&apos;hui (<span className="num">{me.today.count}/15</span>)
            {me.today.companies.length ? <> : <b className="text-ink">{me.today.companies.join(", ")}</b></> : " : pas encore de candidature."}
          </p>
        </section>

        <section className="flex flex-col gap-3 border-[3px] border-stone-2 bg-night p-3" aria-label="Mon binôme">
          {partner ? (
            <>
              <div className="flex items-end gap-3">
                <AvatarBox character={partner.character} color={partner.color} form={partner.displayedForm} mood={partner.mood} size={72} />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="font-display text-[11px] leading-relaxed">{partner.pseudo} · Niv. {partner.level}</span>
                  <span className="text-sm text-muted">{partner.title} · série {partner.streak}</span>
                  {partner.idleWorkdays >= 2 ? <span className="text-sm text-danger">Rien depuis {partner.idleWorkdays} jours ouvrés</span> : null}
                </div>
              </div>
              {partner.goal ? <Bar value={partner.goal.done} max={partner.goal.target} tone="green" label={`Progression de ${partner.pseudo}`} /> : null}
              {partner.goal ? (
                <p className="flex justify-between text-sm text-muted">
                  <span className="num">{partner.goal.done} / {partner.goal.target}</span>
                  <span>Avant le {shortDate(partner.goal.deadline)}</span>
                </p>
              ) : null}
              <ul className="flex flex-col gap-1.5 text-sm">
                {partner.recent.length === 0 ? <li className="text-muted">Pas encore de candidature.</li> : null}
                {partner.recent.map((r, i) => (
                  <li key={i} className="flex justify-between gap-2 border-b-2 border-dotted border-stone-2 pb-1">
                    <span>{partner.pseudo} → <b>{r.company}</b></span>
                    <time className="text-muted">{shortDate(r.day)}</time>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-muted">Ton binôme ne s&apos;est pas encore connecté. Sa carte apparaîtra ici dès son premier lancement.</p>
          )}
        </section>
      </div>
    </main>
  );
}
