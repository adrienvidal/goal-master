import Link from "next/link";
import { redirect } from "next/navigation";
import { ArenaMoves, type Move } from "@/components/Arena";
import { Bar } from "@/components/Bar";
import { LiveRefresh } from "@/components/LiveRefresh";
import { Sprite } from "@/components/Sprite";
import { arenaPhase, arenaState, canPlay, finishedArenas, MAX_ENERGY, POTION_HEAL, statsFor, type ArenaState, type LogEntry } from "@/game/arena";
import { timeLeft } from "@/game/challenge";
import { buildPlayerView, type PlayerView } from "@/lib/playerView";
import type { Pose } from "@/lib/sprites";
import { arenaInputs, loadGame } from "@/server/game";
import { requirePlayer } from "@/server/session";

const TIME = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
const DAY = new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: "Europe/Paris" });
const BOTTE = { KNIGHT: "Coup d'estoc", PANDA: "Bambou tourbillon" } as const;

/** Une ligne du journal, vue par `meId`. */
function logLine(e: LogEntry, meId: string, names: Record<string, string>): string {
  const me = e.playerId === meId;
  const who = me ? "Tu" : names[e.playerId];
  switch (e.kind) {
    case "ATTACK":
      return me ? `Tu attaques : ${e.amount} dégâts.` : `${who} attaque : ${e.amount} dégâts.`;
    case "THRUST":
      return `${who} ${me ? "lances" : "lance"} Coup d'estoc : ${e.amount} dégâts.`;
    case "WHIRL":
      return `${who} ${me ? "lances" : "lance"} Bambou tourbillon : +${e.amount} PV, ${me ? `${names[Object.keys(names).find((id) => id !== meId)!]} perd` : "tu perds"} une action.`;
    case "PARRY":
      return me ? "Tu te mets en garde." : `${who} se met en garde.`;
    case "POTION":
      return me ? `Tu bois une potion : +${e.amount} PV.` : `${who} boit une potion : +${e.amount} PV.`;
    case "END":
      return me ? "Tu passes la main." : `${who} passe la main.`;
    case "TIMEOUT":
      return me ? "Tu n'as pas joué en 24 h : Parade automatique." : `${who} n'a pas joué en 24 h : Parade automatique.`;
    case "ENERGY":
      return me ? "Tu gagnes 1 ⚡ (candidature)." : `${who} gagne 1 ⚡ (candidature).`;
    case "POTION_GAIN":
      return "Relance réussie : une potion chacun.";
  }
}

/** Pose et effet de chaque héros d'après le dernier coup joué. */
function staging(s: ArenaState, id: string): { pose: Pose; className: string; float: { text: string; heal: boolean } | null } {
  const last = [...s.log].reverse().find((e) => e.kind !== "ENERGY" && e.kind !== "POTION_GAIN");
  const stunned = s.turn?.playerId === id && s.turn.max < 3;
  const base = { pose: (s.parry[id] ? "parry" : "rest") as Pose, className: stunned ? "arena-stun" : "", float: null };
  if (!last) return base;
  if (last.playerId === id) {
    if (last.kind === "ATTACK" || last.kind === "THRUST" || last.kind === "WHIRL") return { ...base, pose: "action", float: last.kind === "WHIRL" ? { text: `+${last.amount}`, heal: true } : null };
    if (last.kind === "POTION") return { ...base, pose: "potion", float: { text: `+${last.amount}`, heal: true } };
    return base;
  }
  if (last.kind === "ATTACK" || last.kind === "THRUST") return { ...base, className: `${base.className} arena-hit`, float: { text: `-${last.amount}`, heal: false } };
  return base;
}

function Fighter({ view, s, right, isMe }: { view: PlayerView; s: ArenaState; right: boolean; isMe: boolean }): React.ReactElement {
  const st = staging(s, view.id);
  const low = s.hp[view.id] <= s.maxHp[view.id] / 3;
  return (
    <div className={`flex flex-col gap-2 ${right ? "items-end text-right" : ""}`}>
      <div className={`flex flex-wrap items-baseline gap-1.5 text-sm ${right ? "justify-end" : ""}`}>
        <b>{isMe ? "Toi" : view.pseudo}</b>
        <span className="text-[13px] text-muted">Évol. {view.levelForm}</span>
      </div>
      <div className="w-full max-w-[180px]">
        <Bar value={s.hp[view.id]} max={s.maxHp[view.id]} tone="green" color={low ? "#ff6b6b" : undefined} label={`PV : ${isMe ? "toi" : view.pseudo}`} />
        <span className="num">{s.hp[view.id]}/{s.maxHp[view.id]}</span>
      </div>
      <div className={`relative flex min-h-[72px] items-end ${right ? "arena-flip" : ""} ${st.className}`}>
        <Sprite character={view.character} color={view.color} form={view.displayedForm} mood={view.mood} pose={st.pose} px={4} label={view.title} />
        {st.float ? <span className={`arena-dmg ${st.float.heal ? "heal" : ""}`}>{st.float.text}</span> : null}
      </div>
    </div>
  );
}

// Le combat (maquette arene, écrans 5 et 6) : scène, tour, énergie, actions, journal.
export default async function ArenaPage(): Promise<React.ReactElement> {
  const player = await requirePlayer();
  const game = await loadGame();
  const now = new Date();
  const inputs = arenaInputs(game).filter((i) => i.arena.challengerId === player.id || i.arena.opponentId === player.id);
  const input = inputs.find((i) => arenaPhase(i.arena, i.actions, now) === "running");
  if (!input) redirect(finishedArenas(inputs, now).length ? "/arene/resultat" : "/");
  const s = arenaState(input, now);
  const views = game.players.map((p) => buildPlayerView(p, game.apps, game.nudges, null, now));
  const me = views.find((v) => v.id === player.id)!;
  const foe = views.find((v) => v.id !== player.id)!;
  const names = Object.fromEntries(views.map((v) => [v.id, v.pseudo]));
  const myForm = (player.id === input.arena.challengerId ? input.arena.challengerForm : input.arena.opponentForm) ?? 1;
  const st = statsFor(myForm);
  const myTurn = s.turn?.playerId === player.id;
  const special = player.character === "PANDA" ? "WHIRL" : "THRUST";
  const off = (kind: Parameters<typeof canPlay>[2]) => !canPlay(s, player.id, kind).ok;
  const potions = s.potions[player.id];
  const moves: Move[] = [
    { kind: "ATTACK", label: "⚔️ Attaque", cost: "1 ⚡", detail: `${st.attack[0]} à ${st.attack[1]} dégâts`, disabled: off("ATTACK") },
    { kind: "PARRY", label: "🛡️ Parade", cost: "1 ⚡", detail: "Le prochain coup reçu est divisé par deux", disabled: off("PARRY") },
    {
      kind: special,
      label: `✨ ${BOTTE[player.character]}`,
      cost: "3 ⚡",
      detail: special === "THRUST" ? `${st.thrust} dégâts${st.pierce ? ", perce la Parade" : ""}` : `+${st.whirl} PV, ${foe.pseudo} perd ${st.stun} action${st.stun > 1 ? "s" : ""}`,
      disabled: off(special),
      special: true,
    },
    { kind: "POTION", label: "🧪 Potion", cost: `×${potions}`, detail: potions ? `+${POTION_HEAL} PV` : "Une relance réussie t'en donne une", disabled: off("POTION") },
  ];
  const turnEnds = s.turn ? `${DAY.format(s.turn.endsAt)} ${TIME.format(s.turn.endsAt)}` : "";
  const log = [...s.log].reverse().slice(0, 12);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 md:py-10">
      <LiveRefresh />
      <div className="device flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="h-title">🛡️ Arène</h1>
          <Link href="/" className="text-sm text-muted underline">Accueil</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] md:items-start">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="arena-stage">
              <Fighter view={me} s={s} right={false} isMe />
              <Fighter view={foe} s={s} right isMe={false} />
            </div>
            <div className={`flex flex-wrap items-center justify-between gap-2 border-[3px] px-3 py-2 ${myTurn ? "border-gold bg-[#3a2f17]" : "border-edge bg-night"}`}>
              <span className="font-display text-[10px] leading-relaxed">{myTurn ? "À toi de jouer" : `${foe.pseudo} réfléchit…`}</span>
              <span className="num text-muted">jusqu&apos;à {turnEnds} · fin dans {timeLeft(input.arena.deadline!.getTime() - now.getTime())}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1" aria-label={`Énergie : ${s.energy[player.id]}`}>
              <span className="mr-1.5 text-[13px] uppercase tracking-wider text-muted">Énergie</span>
              {Array.from({ length: MAX_ENERGY }, (_, i) => <i key={i} className={`energy-cell ${i < s.energy[player.id] ? "" : "empty"}`} />)}
              <span className="num ml-1.5">{s.energy[player.id]}</span>
            </div>
            {myTurn && s.turn && s.turn.max < 3 ? <p className="border-l-4 border-energy bg-[#13283a] px-2.5 py-1.5 text-sm">Bambou tourbillon t&apos;a étourdi : ce tour, {s.turn.max} action{s.turn.max > 1 ? "s" : ""} au plus.</p> : null}
            {myTurn && s.energy[player.id] === 0 ? <p className="border-l-4 border-energy bg-[#13283a] px-2.5 py-1.5 text-sm">Chaque candidature te donne 1 ⚡. Tu peux en envoyer une et revenir : ton tour t&apos;attend jusqu&apos;à {turnEnds}.</p> : null}
            <ArenaMoves id={input.arena.id} moves={moves} used={s.turn?.used ?? 0} max={s.turn?.max ?? 3} myTurn={myTurn} />
            {!myTurn ? <p className="text-sm text-muted">Tes candidatures d&apos;ici là rechargent ton énergie pour ton prochain tour.</p> : null}
            <Link href="/" className="btn">+ Candidature</Link>
          </div>
          <div className="flex flex-col gap-1.5 border-[3px] border-edge bg-night px-3 py-2.5">
            <span className="text-[13px] uppercase tracking-wider text-muted">Journal</span>
            <ol className="flex flex-col gap-1.5 text-sm">
              {log.length === 0 ? <li className="text-muted">Le combat commence : {input.arena.challengerId === player.id ? "tu ouvres" : `${foe.pseudo} ouvre`}.</li> : null}
              {log.map((e, i) => (
                <li key={i} className="grid grid-cols-[52px_1fr] gap-2">
                  <time className="num text-muted">{TIME.format(e.at)}</time>
                  <span className={e.kind === "ENERGY" || e.kind === "POTION_GAIN" || e.kind === "TIMEOUT" ? "italic text-muted" : e.playerId === player.id ? "text-[#5aa9ff]" : "text-[#e5533d]"}>{logLine(e, player.id, names)}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </main>
  );
}
