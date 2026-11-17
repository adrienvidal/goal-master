import { MyAvatar } from "@/components/MyAvatar";
import { Sprite } from "@/components/Sprite";
import { Bar } from "@/components/Bar";
import { Flame } from "@/components/Flame";
import { ChallengeClosedBanner, ChallengeIncoming, ChallengePending, PartnerActions, type LaunchState } from "@/components/Challenge";
import { PushSetup } from "@/components/PushSetup";
import { BossCard } from "@/components/BossCard";
import { DecorView } from "@/components/DecorView";
import { NudgeBanner, NudgeWinBanner } from "@/components/Banners";
import { ArenaWatcher, ChallengeWatcher, DuelWatcher } from "@/components/DuelWatcher";
import { ArenaIncoming, ArenaPending, type ArenaLaunch } from "@/components/Arena";
import { ANSWER_WITHIN_MS, arenaCrowns, arenaPhase, arenaState, canProvoke, finishedArenas, MAX_ENERGY, openArena, startEnergy, statsFor, type ArenaEntry, type ArenaInput } from "@/game/arena";
import { LiveRefresh } from "@/components/LiveRefresh";
import { canLaunch, challengeScore, crownHolder, deadlineFor, lastFinished, openChallenge, phaseOf, timeLeft, untilLabel, type ChallengeRow } from "@/game/challenge";
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
import { COLOR_HEX } from "@/lib/sprites";
import { goalOutcome } from "@/lib/goal";
import { buildPlayerView, removalImpact, splitCompany, type FeedItem, type PlayerView } from "@/lib/playerView";
import { DAILY_XP_CAP } from "@/game/levels";
import { db } from "@/server/db";
import { arenaInputs, loadDuelInput, loadGame } from "@/server/game";
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

const DAY_MS = 24 * 60 * 60 * 1000;

/** Mon dernier défi refusé ou expiré dans les dernières 24 h, à signaler tant qu'aucun autre n'est ouvert. */
function closedChallenge(playerId: string, partnerName: string, challenges: ChallengeRow[], now: Date): { id: string; text: string } | null {
  if (openChallenge(challenges, now)) return null;
  const last = challenges.find((c) => c.challengerId === playerId);
  if (!last || now.getTime() - (last.closedAt ?? last.deadline).getTime() >= DAY_MS) return null;
  const phase = phaseOf(last, now);
  if (phase === "declined") return { id: last.id, text: `${partnerName} passe son tour pour ce défi. Tu peux en lancer un autre.` };
  if (phase === "expired") return { id: last.id, text: `Ton défi a expiré : ${partnerName} ne l'a pas relevé à temps.` };
  return null;
}

/** Ce que le bouton « Défier » propose : les échéances encore possibles, ou la raison du refus. */
function launchState(playerId: string, challenges: ChallengeRow[], now: Date): LaunchState {
  const check = canLaunch(playerId, challenges, now);
  if (check.ok) {
    const left = (deadline: Date) => timeLeft(deadline.getTime() - now.getTime());
    const tonight = deadlineFor("tonight", now);
    return { ok: true, tonightLeft: tonight ? left(tonight) : null, fridayLeft: left(deadlineFor("friday", now)!) };
  }
  if (check.reason === "today") return { ok: false, reason: "Tu as déjà lancé un défi aujourd'hui, reviens demain." };
  const open = openChallenge(challenges, now);
  const waiting = open !== null && phaseOf(open, now) === "pending";
  return { ok: false, reason: waiting ? "Un défi attend une réponse." : "Un défi est déjà en cours." };
}

/** Course du défi en cours, le joueur courant en premier (maquette defi, écran 5). */
function ChallengeRace({ challenge, views, apps, now }: { challenge: ChallengeRow; views: PlayerView[]; apps: Parameters<typeof challengeScore>[2]; now: Date }): React.ReactElement {
  return (
    <div className="flex flex-col gap-3 border-[3px] border-ember bg-night p-3" aria-label="Défi en cours">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="h-title !text-[10px]">🏁 Défi · {challenge.target} candidatures</span>
        <span className="num text-ember">reste {timeLeft(challenge.deadline.getTime() - now.getTime())}</span>
      </div>
      {views.map((v, i) => {
        const score = challengeScore(v.id, challenge, apps);
        return (
          <div key={v.id} className="grid grid-cols-[1fr_auto] items-center gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-sm">{i === 0 ? "Toi" : v.pseudo}</span>
              <Bar value={score} max={challenge.target} color={COLOR_HEX[v.color]} label={`Défi : ${i === 0 ? "toi" : v.pseudo}`} />
            </div>
            <span className="num text-2xl">{score}/{challenge.target}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Ma dernière provocation refusée ou effacée dans les 48 dernières heures, à signaler tant qu'aucune Arène n'est ouverte. */
function closedArena(playerId: string, partnerName: string, entries: ArenaEntry[], now: Date): { id: string; text: string } | null {
  const last = entries.find((e) => e.arena.challengerId === playerId);
  if (!last || now.getTime() - last.arena.createdAt.getTime() >= 2 * DAY_MS) return null;
  const phase = arenaPhase(last.arena, last.actions, now);
  if (phase === "declined") return { id: last.arena.id, text: `${partnerName} décline l'Arène pour cette fois. Tu peux en ouvrir une autre.` };
  if (phase === "expired") return { id: last.arena.id, text: `Ta provocation s'est effacée : ${partnerName} n'a pas répondu dans les 24 h.` };
  return null;
}

/** Ce que le bouton « Arène » propose : les stats comparées, ou la raison du refus. */
function arenaLaunch(me: PlayerView, partner: PlayerView, entries: ArenaEntry[], now: Date): ArenaLaunch {
  const check = canProvoke(me.id, entries, now);
  if (!check.ok) {
    if (check.reason === "today") return { ok: false, reason: "Tu as déjà ouvert une Arène aujourd'hui, reviens demain." };
    const open = openArena(entries, now);
    const waiting = open !== null && arenaPhase(open.arena, open.actions, now) === "pending";
    return waiting ? { ok: false, reason: "Une provocation attend une réponse." } : { ok: false, reason: "Un combat est en cours.", enter: true };
  }
  const rusty = (v: PlayerView) => v.mood === "tired" || v.mood === "exhausted";
  const [a, b] = [statsFor(me.levelForm), statsFor(partner.levelForm)];
  return {
    ok: true,
    compare: {
      myForm: me.levelForm, theirForm: partner.levelForm, myHp: a.maxHp, theirHp: b.maxHp,
      myAttack: `${a.attack[0]}-${a.attack[1]}`, theirAttack: `${b.attack[0]}-${b.attack[1]}`,
      myEnergy: startEnergy(me.levelForm, partner.levelForm, rusty(me)), theirEnergy: startEnergy(partner.levelForm, me.levelForm, rusty(partner)),
      partnerRusty: rusty(partner),
    },
  };
}

/** Carte compacte du combat en cours, au-dessus de « + Candidature » : toute la carte mène à /arene. */
function ArenaCard({ input, meId, views, now }: { input: ArenaInput; meId: string; views: PlayerView[]; now: Date }): React.ReactElement {
  const s = arenaState(input, now);
  const mine = s.turn?.playerId === meId;
  const foe = views.find((v) => v.id !== meId);
  const cells = Array.from({ length: MAX_ENERGY }, (_, i) => i < s.energy[meId]);
  return (
    <Link href="/arene" className="flex flex-col gap-2.5 border-[3px] border-magic bg-night p-3 no-underline" aria-label="Arène en cours">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="h-title !text-[10px]">🛡️ Arène</span>
        <span className={`num ${mine ? "arena-go text-gold" : "text-magic"}`}>{mine ? "À toi de jouer" : `${foe?.pseudo ?? "Ton binôme"} réfléchit…`}</span>
      </div>
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
        {views.map((v) => (
          <span key={v.id} className="contents">
            <span className="text-sm">{v.id === meId ? "Toi" : v.pseudo}</span>
            <Bar value={s.hp[v.id]} max={s.maxHp[v.id]} tone="green" label={`PV : ${v.id === meId ? "toi" : v.pseudo}`} />
            <span className="num">{s.hp[v.id]}/{s.maxHp[v.id]}</span>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-1" aria-label={`Ton énergie : ${s.energy[meId]}`}>
        <span className="mr-1.5 text-[13px] uppercase tracking-wider text-muted">Ton énergie</span>
        {cells.map((on, i) => <i key={i} className={`energy-cell ${on ? "" : "empty"}`} />)}
      </div>
      {mine && s.energy[meId] === 0 ? <p className="text-sm text-muted">Envoie une candidature pour recharger 1 ⚡. Sinon, tu peux finir ton tour.</p> : null}
      <span className="btn arena">{mine ? "Entrer et jouer" : "Entrer dans l'Arène"}</span>
    </Link>
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
  const arenas = arenaInputs(game);
  const crownIds = new Set([crownHolder(game.challenges, now), ...arenaCrowns(arenas, now)].filter((id): id is string => id !== null));
  const openFight = openArena(game.arenas, now);
  const fightPhase = openFight ? arenaPhase(openFight.arena, openFight.actions, now) : null;
  const arenaIncoming = openFight && fightPhase === "pending" && openFight.arena.opponentId === player.id ? openFight.arena : null;
  const arenaOutgoing = openFight && fightPhase === "pending" && openFight.arena.challengerId === player.id ? openFight.arena : null;
  const arenaRunning = openFight && fightPhase === "running" ? arenas.find((a) => a.arena.id === openFight.arena.id) ?? null : null;
  const lastArena = finishedArenas(arenas, now)[0] ?? null;
  const arenaClosed = openFight ? null : closedArena(player.id, partnerRow?.pseudo ?? "Ton binôme", game.arenas, now);
  const open = openChallenge(game.challenges, now);
  const openPhase = open ? phaseOf(open, now) : null;
  const incoming = open && openPhase === "pending" && open.opponentId === player.id ? open : null;
  const outgoing = open && openPhase === "pending" && open.challengerId === player.id ? open : null;
  const running = open && openPhase === "running" ? open : null;
  const closed = closedChallenge(player.id, partnerRow?.pseudo ?? "ton binôme", game.challenges, now);
  const launch = launchState(player.id, game.challenges, now);
  const lastChallenge = lastFinished(game.challenges, now);
  const names = Object.fromEntries(game.players.map((p) => [p.id, p.pseudo]));
  const walkers = [me, ...(partner ? [partner] : [])].map((v) => ({
    pseudo: v.pseudo, level: v.level, character: v.character, color: v.color, form: v.displayedForm, mood: v.mood, hurt: wounded, crown: crownIds.has(v.id),
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
      {lastChallenge ? <ChallengeWatcher id={lastChallenge.id} /> : null}
      {lastArena ? <ArenaWatcher id={lastArena.input.arena.id} /> : null}
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
          {incoming && partner ? (
            <ChallengeIncoming id={incoming.id}>
              <Sprite character={partner.character} color={partner.color} form={partner.displayedForm} pose="victory" px={2} crown={crownIds.has(partner.id)} />
              <p className="min-w-0 text-[15px]">
                <b className="text-ember">{partner.pseudo} te défie :</b> le premier à {incoming.target} candidatures avant {untilLabel(incoming.deadline)} gagne la couronne.
              </p>
            </ChallengeIncoming>
          ) : null}
          {closed ? <ChallengeClosedBanner id={closed.id} text={closed.text} /> : null}
          {arenaIncoming && partner ? (
            <ArenaIncoming id={arenaIncoming.id} rusty={me.mood === "tired" || me.mood === "exhausted"}>
              <Sprite character={partner.character} color={partner.color} form={partner.displayedForm} pose="action" px={2} crown={crownIds.has(partner.id)} />
              <p className="min-w-0 text-[15px]">
                <b className="text-magic">{partner.pseudo} te provoque en Arène.</b> Tour par tour, tes candidatures font tes coups.
              </p>
            </ArenaIncoming>
          ) : null}
          {arenaClosed ? <ChallengeClosedBanner id={arenaClosed.id} text={arenaClosed.text} storageKey="gm-arena-closed" /> : null}
          <div className="flex items-end gap-4 pr-9">
            <MyAvatar id={me.id} character={me.character} color={me.color} form={me.displayedForm} level={me.level} mood={me.mood} fallen={me.fallen} hurt={wounded} crown={crownIds.has(me.id)} />
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
          {outgoing && partner ? <ChallengePending id={outgoing.id} partnerName={partner.pseudo} target={outgoing.target} until={untilLabel(outgoing.deadline)} /> : null}
          {running && partner ? <ChallengeRace challenge={running} views={[me, partner]} apps={game.apps} now={now} /> : null}
          {arenaOutgoing && partner ? <ArenaPending id={arenaOutgoing.id} partnerName={partner.pseudo} expires={`demain ${TIME.format(new Date(arenaOutgoing.createdAt.getTime() + ANSWER_WITHIN_MS))}`} /> : null}
          {arenaRunning && partner ? <ArenaCard input={arenaRunning} meId={player.id} views={[me, partner]} now={now} /> : null}
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
                <Sprite character={partner.character} color={partner.color} form={partner.displayedForm} mood={partner.mood} px={3} label={partner.title} hurt={wounded} crown={crownIds.has(partner.id)} />
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
              <PartnerActions partnerName={partner.pseudo} nudgeSentToday={sentToday(player.id, game.nudges, parisDay(now))} blink={partner.idleWorkdays >= 2} launch={launch} arena={arenaLaunch(me, partner, game.arenas, now)} />
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
