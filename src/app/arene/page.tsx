import Link from "next/link";
import { companionLabel, isCompanion, type CompanionId } from "@/game/quests";
import { redirect } from "next/navigation";
import { ArenaMoves, type Move } from "@/components/Arena";
import { ArenaJournal, ArenaLive, ArenaPresence, ArenaStageBox, StageFighterView, type JournalLine, type StageFighter, type StageHit } from "@/components/ArenaStage";
import { LiveRefresh } from "@/components/LiveRefresh";
import { ACTIONS_PER_TURN, arenaPhase, arenaState, canPlay, ENERGY_PER_TURN, isStunned, finishedArenas, MAX_ENERGY, rulesFor, statsFor, type ArenaState, type Rules, type LogEntry } from "@/game/arena";
import { timeLeft } from "@/game/challenge";
import { ofName } from "@/lib/french";
import { buildPlayerView, type PlayerView } from "@/lib/playerView";
import { db } from "@/server/db";
import { arenaInputs, loadGame } from "@/server/game";
import { requirePlayer } from "@/server/session";

const TIME = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
const DAY = new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: "Europe/Paris" });
const BOTTE = { KNIGHT: "Coup d'estoc", PANDA: "Bambou tourbillon" } as const;
/** Le binôme est « dans l'Arène » s'il l'a affichée il y a moins de 10 s (rafraîchie toutes les 3 s). */
const PRESENT_MS = 10_000;
const LIVE_MS = 3000;
const ENDED_STAY_MS = 60 * 60 * 1000;
const VISIBLE = ["ATTACK", "THRUST", "WHIRL", "PARRY", "POTION"] as const;
type Visible = (typeof VISIBLE)[number];

/** Ce que coûte le Bambou tourbillon à l'adversaire, selon les règles du combat. */
function stunText(rules: Rules, stun: number, foeName: string): string {
  if (rules.stunTakes === "energy") return `${foeName} reçoit ${stun} PA de moins au tour suivant`;
  return `${foeName} perd ${stun} action${stun > 1 ? "s" : ""}`;
}

/** « 4 à 12 », ou « 14 » quand la valeur est fixe. */
function range([min, max]: [number, number]): string {
  return min === max ? `${min}` : `${min} à ${max}`;
}

/** Une ligne du journal, vue par `meId`. */
function logLine(e: LogEntry, meId: string, foeName: string): string {
  const me = e.playerId === meId;
  const who = me ? "Tu" : foeName;
  switch (e.kind) {
    case "ATTACK":
      return me ? `Tu attaques : ${e.amount} dégâts.` : `${who} attaque : ${e.amount} dégâts.`;
    case "THRUST":
      return me ? `Tu lances Coup d'estoc : ${e.amount} dégâts.` : `${who} lance Coup d'estoc : ${e.amount} dégâts.`;
    case "WHIRL":
      return me
        ? `Tu lances Bambou tourbillon : ${e.dealt ? `${e.dealt} dégâts, ` : ""}+${e.amount} PV, ${foeName} est étourdi.`
        : `${who} lance Bambou tourbillon : ${e.dealt ? `${e.dealt} dégâts, ` : ""}+${e.amount} PV, tu es étourdi.`;
    case "PARRY":
      return me ? "Tu te mets en garde." : `${who} se met en garde.`;
    case "POTION":
      return me ? `Tu bois une potion : +${e.amount} PV.` : `${who} boit une potion : +${e.amount} PV.`;
    case "END":
      return me ? "Tu passes la main." : `${who} passe la main.`;
    case "TIMEOUT":
      return me ? "Tu n'as pas joué en 24 h : Parade automatique." : `${who} n'a pas joué en 24 h : Parade automatique.`;
    case "ENERGY":
      if (e.amount === 0) return me ? "Ton tour commence : tes PA sont déjà au maximum (6)." : `${who} commence son tour, PA au maximum.`;
      return me ? `Ton tour commence : +${e.amount} PA.` : `${who} commence son tour : +${e.amount} PA.`;
    case "REFUND":
      return me ? `Ta Parade encaisse le coup : +${e.amount} PA.` : `La Parade ${ofName(foeName)} encaisse le coup : +${e.amount} PA.`;
  }
}

/** Libellé court d'un coup, pour le bandeau de rejeu. */
function hitLabel(e: LogEntry & { kind: Visible }): string {
  if (e.kind === "ATTACK") return `⚔️ Attaque · ${e.amount} dégâts`;
  if (e.kind === "THRUST") return `✨ Coup d'estoc · ${e.amount} dégâts`;
  if (e.kind === "WHIRL") return `✨ Bambou tourbillon · ${e.dealt ? `${e.dealt} dégâts · ` : ""}+${e.amount} PV`;
  if (e.kind === "PARRY") return "🛡️ Parade";
  return `🧪 Potion · +${e.amount} PV`;
}

/** Les coups visibles du combat, avec les PV avant et après chacun, pour le rejeu pas à pas. */
function stageHits(s: ArenaState): StageHit[] {
  const hits: StageHit[] = [];
  s.log.forEach((e, i) => {
    if (!(VISIBLE as readonly string[]).includes(e.kind)) return;
    const v = e as LogEntry & { kind: Visible };
    const before = i > 0 ? s.log[i - 1].hp : s.maxHp;
    const logEnd = s.log[i + 1]?.kind === "REFUND" ? i + 1 : i;
    hits.push({ key: `${e.at.toISOString()}-${e.playerId}-${e.kind}`, by: e.playerId, kind: v.kind, amount: e.amount, at: e.at.toISOString(), label: hitLabel(v), hpBefore: before, hpAfter: s.log[logEnd].hp, logStart: i, logEnd, parried: s.log[i + 1]?.kind === "REFUND" });
  });
  return hits;
}

// Le combat (maquettes arene et arene-v2) : présence, scène, tour, PA, actions, journal rejoué.
const companionOf = (c: string | null): CompanionId | null => (c && isCompanion(c) ? c : null);

export default async function ArenaPage(): Promise<React.ReactElement> {
  const player = await requirePlayer();
  const game = await loadGame();
  const now = new Date();
  const inputs = arenaInputs(game).filter((i) => i.arena.challengerId === player.id || i.arena.opponentId === player.id);
  // Un combat fini il y a moins d'une heure reste affiché ici : le coup du K.O. se rejoue avant le résultat.
  const recent = finishedArenas(inputs, now).find((f) => now.getTime() - f.over.at.getTime() < ENDED_STAY_MS)?.input;
  const input = inputs.find((i) => arenaPhase(i.arena, i.actions, now) === "running") ?? recent;
  if (!input) redirect(finishedArenas(inputs, now).length ? "/arene/resultat" : "/");
  // Présence : chaque affichage (toutes les 3 s) note que ce joueur a l'Arène ouverte.
  await db().player.update({ where: { id: player.id }, data: { arenaSeenAt: now } });
  const s = arenaState(input, now);
  const views = game.players.map((p) => buildPlayerView(p, game.apps, game.nudges, game.quests, null, now));
  const me = views.find((v) => v.id === player.id)!;
  const foe = views.find((v) => v.id !== player.id)!;
  const foeSeen = game.players.find((p) => p.id === foe.id)?.arenaSeenAt;
  const foeHere = !!foeSeen && now.getTime() - foeSeen.getTime() < PRESENT_MS;
  const myForm = (player.id === input.arena.challengerId ? input.arena.challengerForm : input.arena.opponentForm) ?? 1;
  const rules = rulesFor(input.arena.rules);
  const st = statsFor(myForm, rules);
  const myTurn = s.turn?.playerId === player.id;
  const special = player.character === "PANDA" ? "WHIRL" : "THRUST";
  /** Message affiché quand on touche une action indisponible pendant son tour. */
  const blocked = (kind: Parameters<typeof canPlay>[2], name: string): string | null => {
    const check = canPlay(s, player.id, kind);
    if (check.ok || !myTurn) return null;
    if (check.reason === "potion") return "Plus de potion pour ce combat.";
    if (check.reason === "energy") return `Il te manque ${rules.cost[kind] - pa} PA pour ${name}.`;
    return null;
  };
  const potions = s.potions[player.id];
  const pa = s.energy[player.id];
  const botte = special === "THRUST" ? `${range(st.thrust)} dégâts${st.pierce ? ", perce la Parade" : ""}` : `${st.whirlHit ? `${st.whirlHit} dégâts, ` : ""}+${st.whirl} PV, ${stunText(rules, st.stun, foe.pseudo)}`;
  // Règles v2 seulement : un compte d'actions par tour, en plus des PA.
  const actionsLeft = s.turn?.max != null ? s.turn.max - s.turn.used : null;
  /** Raison affichée sous une action grisée pendant mon tour. */
  const why = (kind: Parameters<typeof canPlay>[2]): string | null => {
    const check = canPlay(s, player.id, kind);
    if (!myTurn || check.ok) return null;
    if (check.reason === "potion") return "Plus de potion pour ce combat";
    if (check.reason === "energy") return `Il te manque ${rules.cost[kind] - pa} PA`;
    return null;
  };
  const moves: Move[] = [
    { kind: "ATTACK", label: "⚔️ Attaque", cost: "1 PA", detail: why("ATTACK") ?? `${st.attack[0]} à ${st.attack[1]} dégâts`, blocked: blocked("ATTACK", "attaquer") },
    { kind: "PARRY", label: "🛡️ Parade", cost: "1 PA", detail: why("PARRY") ?? "Divise le prochain coup · +1 PA s'il arrive", blocked: blocked("PARRY", "parer") },
    {
      kind: special,
      label: `✨ ${BOTTE[player.character]}`,
      cost: `${rules.cost[special]} PA`,
      detail: why(special) ?? botte,
      blocked: blocked(special, BOTTE[player.character]),
      special: true,
    },
    { kind: "POTION", label: "🧪 Potion", cost: `×${potions}`, detail: why("POTION") ?? (potions ? `+${rules.potionHeal} PV · ${potions} pour tout le combat` : "Plus de potion pour ce combat"), blocked: blocked("POTION", "boire une potion") },
  ];
  // Jauge : au début de mon tour, les PA gardés du tour d'avant et ceux que le tour vient de donner.
  const turnGain = myTurn && s.turn?.used === 0 ? (s.log.findLast((e) => e.kind === "ENERGY" && e.playerId === player.id)?.amount ?? 0) : 0;
  const kept = pa - turnGain;
  const turnEnds = s.turn ? `${DAY.format(s.turn.endsAt)} ${TIME.format(s.turn.endsAt)}` : "";
  const lines: JournalLine[] = s.log
    .map((e, index) => ({ e, index }))
    .filter(({ e }) => e.kind !== "ENERGY" || e.playerId === player.id)
    .reverse()
    .map(({ e, index }) => ({
      index,
      time: TIME.format(e.at),
      text: logLine(e, player.id, foe.pseudo),
      tone: e.kind === "ENERGY" || e.kind === "TIMEOUT" || e.kind === "REFUND" ? "sys" : e.playerId === player.id ? "me" : "foe",
    }));
  const petOf = (id: string) => companionOf(game.players.find((p) => p.id === id)?.companion ?? null);
  const stageOf = (v: PlayerView): StageFighter => ({
    id: v.id, name: v.pseudo, levelForm: (v.id === input.arena.challengerId ? input.arena.challengerForm : input.arena.opponentForm) ?? v.levelForm, character: v.character, color: v.color, displayedForm: v.displayedForm, mood: v.mood, title: v.title,
    hp: s.hp[v.id], maxHp: s.maxHp[v.id], parry: s.parry[v.id], stunned: isStunned(s, v.id),
    companion: petOf(v.id),
    companionName: ((c) => (c ? companionLabel(v.id, c, game.quests) : null))(petOf(v.id)),
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 md:py-10">
      <LiveRefresh every={LIVE_MS} />
      <div className="device flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="h-title">🛡️ Arène</h1>
          <Link href="/" className="text-sm text-muted underline">Accueil</Link>
        </div>
        <ArenaLive arenaId={input.arena.id} meId={player.id} foeName={foe.pseudo} hits={stageHits(s)} ended={s.over ? (s.over.ko ? "ko" : "time") : null} fighters={[stageOf(me), stageOf(foe)]}>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] md:items-start">
            <div className="flex min-w-0 flex-col gap-3">
              <ArenaPresence name={foe.pseudo} here={foeHere} />
              <ArenaStageBox>
                <StageFighterView f={stageOf(me)} right={false} isMe />
                <StageFighterView f={stageOf(foe)} right isMe={false} />
              </ArenaStageBox>
              <div className={`flex flex-wrap items-center justify-between gap-2 border-[3px] px-3 py-2 ${myTurn ? "border-gold bg-[#3a2f17]" : "border-edge bg-night"}`}>
                <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <span className="font-display text-[10px] leading-relaxed">{s.over ? "Combat terminé" : myTurn ? "À toi de jouer" : `${foe.pseudo} joue…${s.turn?.max != null ? ` ${s.turn.used}/${s.turn.max}` : ""}`}</span>
                  {myTurn && actionsLeft !== null ? <span className="num text-gold">{actionsLeft} action{actionsLeft > 1 ? "s" : ""}</span> : null}
                  {s.turn && isStunned(s, player.id) ? (
                    <details className="arena-state">
                      <summary>💫 étourdi</summary>
                      <span>
                        {rules.stunTakes === "energy"
                          ? `Bambou tourbillon : ${s.turn.stunned} PA de moins au début de ce tour.`
                          : `Bambou tourbillon : ${s.turn.max} action${s.turn.max! > 1 ? "s" : ""} ce tour au lieu de ${ACTIONS_PER_TURN}. Tes PA ne changent pas.`}
                      </span>
                    </details>
                  ) : null}
                </span>
                {s.over ? null : <span className="num text-muted">jusqu&apos;à {turnEnds} · fin dans {timeLeft(input.arena.deadline!.getTime() - now.getTime())}</span>}
              </div>
              <div className="flex flex-wrap items-center gap-1" aria-label={`PA : ${pa}`}>
                <span className="mr-1.5 text-[13px] uppercase tracking-wider text-muted">PA</span>
                {Array.from({ length: MAX_ENERGY }, (_, i) => <i key={i} className={`energy-cell ${i < kept ? (turnGain ? "kept" : "") : i < pa ? "gain" : "empty"}`} />)}
                <span className="num ml-1.5">{pa}</span>
                <span className="basis-full text-[13px] text-muted">+{ENERGY_PER_TURN} PA à chaque tour · ce que tu ne dépenses pas se garde, {MAX_ENERGY} au plus</span>
              </div>
              {myTurn && pa === 0 && potions > 0 ? <p className="border-l-4 border-energy bg-[#13283a] px-2.5 py-1.5 text-sm">Plus de PA : bois une potion ou finis ton tour.</p> : null}
              <ArenaMoves id={input.arena.id} moves={moves} myTurn={myTurn} waiting={!myTurn && !s.over ? `C'est au tour ${ofName(foe.pseudo)}. Tu joueras dès qu'il a fini : on te préviendra.` : null} />
              {!myTurn && !s.over ? <p className="text-sm text-muted">Au début de ton tour : +{Math.min(ENERGY_PER_TURN, MAX_ENERGY - pa)} PA (tu en gardes {pa}, {MAX_ENERGY} au plus).</p> : null}
            </div>
            <div className="flex flex-col gap-1.5 border-[3px] border-edge bg-night px-3 py-2.5">
              <span className="text-[13px] uppercase tracking-wider text-muted">Journal</span>
              <ArenaJournal lines={lines} empty={`Le combat commence : ${input.arena.challengerId === player.id ? "tu ouvres" : `${foe.pseudo} ouvre`}.`} />
            </div>
          </div>
        </ArenaLive>
      </div>
    </main>
  );
}
