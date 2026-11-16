import { MyAvatar } from "@/components/MyAvatar";
import { Sprite } from "@/components/Sprite";
import { Bar } from "@/components/Bar";
import { Flame } from "@/components/Flame";
import { NudgeButton } from "@/components/NudgeButton";
import { PushSetup } from "@/components/PushSetup";
import { BossCard } from "@/components/BossCard";
import { DecorView } from "@/components/DecorView";
import { NudgeBanner, NudgeWinBanner } from "@/components/Banners";
import { DuelWatcher } from "@/components/DuelWatcher";
import { LiveRefresh } from "@/components/LiveRefresh";
import { bossInSentence, currentDuel, pastDuels, type Duel } from "@/game/duel";
import { parisDay } from "@/game/calendar";
import { justWonNudge, NUDGE_MESSAGES, pendingNudge, sentToday } from "@/game/nudges";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { INTRO_COOKIE, INTRO_STEP_COUNT, introStepsSeen } from "@/lib/intro";
import { devLogout } from "./connexion/dev-actions";
import { devLoginEnabled } from "@/lib/devLogin";
import { formName } from "@/lib/forms";
import { goalOutcome } from "@/lib/goal";
import { buildPlayerView, removalImpact, splitCompany, type FeedItem, type PlayerView } from "@/lib/playerView";
import { DAILY_XP_CAP } from "@/game/levels";
import { db } from "@/server/db";
import { loadDuelInput, loadGame } from "@/server/game";
import { requirePlayer } from "@/server/session";
import AddApplication from "./AddApplication";
import TodayList, { type TodayItem } from "./TodayList";

const TIME = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

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

/** Ligne d'état du binôme inactif (cadrage §6.3 bis et ter). */
function partnerStatus(p: PlayerView): string {
  const panda = p.character === "PANDA";
  if (p.mood === "exhausted") return panda ? `${p.pseudo} a perdu sa robe de ${formName(p.character, p.levelForm)}` : `${p.pseudo} a perdu son armure de ${formName(p.character, p.levelForm)}`;
  if (p.mood === "tired") return panda ? `Le bambou de ${p.pseudo} se fend` : `L'armure de ${p.pseudo} rouille`;
  return `${p.pseudo} s'est endormi · rien depuis ${p.idleWorkdays} jours ouvrés`;
}

type FeedLine = FeedItem | { kind: "duel"; day: string; won: boolean; boss: string };

/** Le dernier duel s'intercale dans le fil du binôme, à sa date. */
function withDuelLine(feed: FeedItem[], duel: Duel | null): FeedLine[] {
  const items: FeedLine[] = [...feed];
  if (duel) {
    const at = items.findIndex((it) => it.day <= duel.id);
    items.splice(at === -1 ? items.length : at, 0, { kind: "duel", day: duel.id, won: duel.won, boss: bossInSentence(duel.boss) });
  }
  return items.slice(0, 5);
}

function FeedText({ line, pseudo }: { line: FeedLine; pseudo: string }): React.ReactElement {
  switch (line.kind) {
    case "duel":
      return line.won ? <span className="text-[var(--ok)]">Victoire contre {line.boss}</span> : <span className="text-danger">Duel perdu contre {line.boss}</span>;
    case "evolution":
      return <span className="text-gold">{pseudo} est devenu {line.formName} ⚔️</span>;
    case "application":
      return <span>{pseudo} → <b>{line.company}</b></span>;
  }
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
  // Un nouvel écran d'intro (nouvelle fonctionnalité) s'affiche d'office à la prochaine ouverture.
  if (introStepsSeen((await cookies()).get(INTRO_COOKIE)?.value) < INTRO_STEP_COUNT) redirect("/intro");
  const game = await loadGame();
  const now = new Date();
  const myGoal = await goalFor(player.id);
  if (!myGoal) redirect("/objectif/nouveau");
  const me = buildPlayerView(player, game.apps, game.nudges, myGoal, now);
  if (me.goal && goalOutcome(me.goal.done, me.goal.target, me.goal.deadline, parisDay(now)) !== "active") redirect("/objectif/fin");
  const partnerRow = game.players.find((p) => p.id !== player.id);
  const partner = partnerRow ? buildPlayerView(partnerRow, game.apps, game.nudges, await goalFor(partnerRow.id), now) : null;
  const received = partner ? pendingNudge(player.id, game.nudges, game.apps, now) : null;
  const won = partner ? justWonNudge(player.id, game.nudges, game.apps, now) : null;
  const duelInput = await loadDuelInput(game);
  const duel = currentDuel(duelInput, now);
  const lastDuel = pastDuels(duelInput, now)[0] ?? null;
  const wounded = lastDuel ? !lastDuel.won : false;
  const names = Object.fromEntries(game.players.map((p) => [p.id, p.pseudo]));
  const walkers = [me, ...(partner ? [partner] : [])].map((v) => ({
    pseudo: v.pseudo, level: v.level, character: v.character, color: v.color, form: v.displayedForm, mood: v.mood, hurt: wounded,
    status: v.idleWorkdays >= 2 ? partnerStatus(v) : null,
  }));
  const todayItems: TodayItem[] = me.today.items.map((a) => {
    const { xp, nudgeLost } = removalImpact(a.id, player.id, game.apps, game.nudges);
    const warning = nudgeLost
      ? `Elle ne comptera plus : tu perds ${xp} XP, et ${partner?.pseudo ?? "ton binôme"} perd les 15 XP de la relance.`
      : xp > 0
        ? `Elle ne comptera plus, et ses ${xp} XP disparaissent.`
        : "Elle ne comptera plus pour ton objectif. Ton XP ne change pas.";
    return { id: a.id, ...splitCompany(a.company), time: TIME.format(a.at), warning };
  });
  const partnerFeed = partner ? withDuelLine(partner.feed, lastDuel) : [];

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 md:py-10">
      <LiveRefresh />
      {lastDuel ? <DuelWatcher id={lastDuel.id} /> : null}
      <div className="device grid gap-6 md:grid-cols-[1.3fr_1fr]">
        <DecorView walkers={walkers} />
        <section className="flex flex-col gap-4" aria-label="Ma quête">
          {received && partner ? (
            <NudgeBanner id={received.id}>
              <Sprite character={partner.character} color={partner.color} form={partner.displayedForm} pose="victory" px={2} />
              <p className="min-w-0 text-[15px]">
                <b className="text-ember">{partner.pseudo} te motive :</b> {NUDGE_MESSAGES[received.message]}
                <br /><small className="text-muted">Candidate dans les 24 h : +15 XP pour vous deux.</small>
              </p>
            </NudgeBanner>
          ) : null}
          {won && partner ? <NudgeWinBanner id={won.id} partner={partner.pseudo} /> : null}
          <div className="flex items-end gap-4 pr-9">
            <MyAvatar id={me.id} character={me.character} color={me.color} form={me.displayedForm} level={me.level} mood={me.mood} fallen={me.fallen} hurt={wounded} />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-[11px] leading-relaxed">{me.pseudo} · Niv. {me.level}</span>
                <Streak days={me.streak} />
              </div>
              <span className="text-sm text-muted">{me.title}{wounded ? " · blessé" : ""}</span>
              <Bar value={me.xpInLevel} max={me.xpForNext} label="Expérience du niveau" />
              <span className="num text-sm text-muted">{me.xpInLevel} / {me.xpForNext} XP</span>
            </div>
          </div>
          <GoalBlock view={me} />
          {duel ? <BossCard duel={duel} names={names} meId={player.id} wounded={wounded} now={now} /> : null}
          <AddApplication todayCount={me.today.count} />
          <div className="grid grid-cols-2 gap-2">
            <Link href="/succes" className="btn ghost !text-[10px]">Mes succès</Link>
            <Link href="/reglages" className="btn ghost !text-[10px]">Réglages</Link>
          </div>
          <TodayList items={todayItems} count={me.today.count} cap={DAILY_XP_CAP} />
        </section>

        <section className="flex flex-col gap-3 border-[3px] border-stone-2 bg-night p-3" aria-label="Mon binôme">
          {partner ? (
            <>
              <div className="flex items-end gap-3">
                <Sprite character={partner.character} color={partner.color} form={partner.displayedForm} mood={partner.mood} px={3} label={partner.title} hurt={wounded} />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="font-display text-[11px] leading-relaxed">{partner.pseudo} · Niv. {partner.level}</span>
                  <span className="text-sm text-muted">{partner.title} · {wounded ? "blessé" : `série ${partner.streak}`}</span>
                  {partner.idleWorkdays >= 2 ? <span className="text-sm text-danger">{partnerStatus(partner)}</span> : null}
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
                {partnerFeed.length === 0 ? <li className="text-muted">Pas encore de candidature.</li> : null}
                {partnerFeed.map((r, i) => (
                  <li key={i} className="flex justify-between gap-2 border-b-2 border-dotted border-stone-2 pb-1">
                    <FeedText line={r} pseudo={partner.pseudo} />
                    <time className="text-muted">{shortDate(r.day)}</time>
                  </li>
                ))}
              </ul>
              <NudgeButton partnerName={partner.pseudo} sentToday={sentToday(player.id, game.nudges, parisDay(now))} blink={partner.idleWorkdays >= 2} />
            </>
          ) : (
            <p className="text-muted">Ton binôme ne s&apos;est pas encore connecté. Sa carte apparaîtra ici dès son premier lancement.</p>
          )}
        </section>
      </div>
      <div className="mt-4"><PushSetup /></div>
      {devLoginEnabled(process.env) ? (
        <form action={devLogout} className="mt-4 text-right">
          <button type="submit" className="text-sm text-muted underline">Changer de joueur (local)</button>
        </form>
      ) : null}
    </main>
  );
}
