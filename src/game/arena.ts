// Arène : combat au tour par tour entre les deux joueurs (spec docs/specs/2026-11-17-arene-design.md).
// Tout est pur : seuls la provocation, la réponse et les actions (avec leur valeur tirée) sont stockés.
// L'état du combat (PV, énergie, potions, tour, fin) se rejoue à chaque lecture, à partir de zéro.
import { addDays, parisDay } from "./calendar";
import { DUEL_HOUR, duelDayOf, parisTime } from "./duel";
import type { Form } from "./levels";
import { activeApplications, type Application, type Nudge } from "./xp";

const H = 60 * 60 * 1000;
export const ANSWER_WITHIN_MS = 24 * H;
export const TURN_TIMEOUT_MS = 24 * H;
export const MAX_ENERGY = 6;
/** Énergie gagnée par candidature : de quoi jouer presque un tour entier (2 actions sur 3). */
export const ENERGY_PER_APP = 2;
export const MAX_POTIONS = 2;
export const ACTIONS_PER_TURN = 3;
export const POTION_HEAL = 6;
export const COST = { ATTACK: 1, PARRY: 1, THRUST: 3, WHIRL: 3, POTION: 0, END: 0 } as const;

export type ArenaStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED";
export type ArenaKind = keyof typeof COST;
export type ArenaRow = {
  id: string;
  challengerId: string;
  opponentId: string;
  status: ArenaStatus;
  createdAt: Date;
  acceptedAt: Date | null;
  deadline: Date | null;
  challengerForm: number | null;
  opponentForm: number | null;
  challengerEnergy: number | null;
  opponentEnergy: number | null;
};
export type ArenaActionRow = { id: string; arenaId: string; playerId: string; kind: ArenaKind; value: number; createdAt: Date };
export type ArenaInput = { arena: ArenaRow; actions: ArenaActionRow[]; apps: Application[]; nudges: Nudge[] };
export type ArenaEntry = { arena: ArenaRow; actions: ArenaActionRow[] };

export type Stats = { maxHp: number; attack: [number, number]; thrust: number; pierce: boolean; whirl: number; stun: number };

/** Stats d'une évolution : écarts modestes, trois paliers (évolutions 1-2, 3-4, 5-6). */
export function statsFor(form: number): Stats {
  const tier = Math.ceil(form / 2);
  return {
    maxHp: 28 + 2 * form,
    attack: [3 + tier, 5 + tier],
    thrust: 10 + 2 * tier,
    pierce: tier === 3,
    whirl: 6 + 2 * tier,
    stun: tier === 3 ? 2 : 1,
  };
}

/** Énergie de départ : 2, +1 pour le moins évolué (outsider), 0 pour un héros rouillé ou déchu. */
export function startEnergy(form: Form | number, otherForm: Form | number, rusty: boolean): number {
  if (rusty) return 0;
  return form < otherForm ? 3 : 2;
}

/** Vendredi 18 h (Paris) qui suit l'acceptation ; le suivant s'il reste moins de 48 h. */
export function arenaDeadline(acceptedAt: Date): Date {
  const friday = duelDayOf(acceptedAt);
  const end = parisTime(friday, DUEL_HOUR);
  return end.getTime() - acceptedAt.getTime() < 48 * H ? parisTime(addDays(friday, 7), DUEL_HOUR) : end;
}

export type LogEntry = { at: Date; playerId: string; kind: ArenaKind | "TIMEOUT" | "ENERGY" | "POTION_GAIN"; amount: number };
export type Turn = { playerId: string; number: number; startedAt: Date; used: number; max: number; endsAt: Date };
/** `byBotte` : K.O. porté pendant le tour où le gagnant a joué sa Botte (Coup de maître, à la portée des deux personnages). */
export type Over = { winnerId: string | null; ko: boolean; byBotte: boolean; at: Date };
export type ArenaState = {
  maxHp: Record<string, number>;
  hp: Record<string, number>;
  energy: Record<string, number>;
  potions: Record<string, number>;
  parry: Record<string, boolean>;
  turn: Turn | null;
  /** Le tour qui vient de se terminer, pour résumer ce qu'a fait l'adversaire. */
  previous: { playerId: string; startedAt: Date; endedAt: Date } | null;
  over: Over | null;
  log: LogEntry[];
};

type Event = { at: Date; order: number; kind: "energy" | "potion" | "action"; playerId?: string; action?: ArenaActionRow };

/** Moments où une relance réussie (candidature du destinataire dans les 24 h) tombe. */
function nudgeSuccesses(nudges: Nudge[], apps: Application[]): Date[] {
  const active = activeApplications(apps);
  return nudges.flatMap((n) => {
    const first = active
      .filter((a) => a.userId === n.recipientId && a.createdAt > n.sentAt && a.createdAt.getTime() <= n.sentAt.getTime() + 24 * H)
      .sort((x, y) => x.createdAt.getTime() - y.createdAt.getTime())[0];
    return first ? [first.createdAt] : [];
  });
}

/** Rejoue le combat jusqu'à `now`. Les actions stockées font foi : elles ont été validées à l'écriture. */
export function arenaState(input: ArenaInput, now: Date): ArenaState {
  const { arena: r } = input;
  const ids = [r.challengerId, r.opponentId];
  const other = (id: string) => (id === r.challengerId ? r.opponentId : r.challengerId);
  const form = (id: string) => (id === r.challengerId ? r.challengerForm : r.opponentForm) ?? 1;
  const stats = Object.fromEntries(ids.map((id) => [id, statsFor(form(id))]));
  const s: ArenaState = {
    maxHp: Object.fromEntries(ids.map((id) => [id, stats[id].maxHp])),
    hp: Object.fromEntries(ids.map((id) => [id, stats[id].maxHp])),
    energy: { [r.challengerId]: r.challengerEnergy ?? 2, [r.opponentId]: r.opponentEnergy ?? 2 },
    potions: Object.fromEntries(ids.map((id) => [id, 0])),
    parry: Object.fromEntries(ids.map((id) => [id, false])),
    turn: null,
    previous: null,
    over: null,
    log: [],
  };
  if (r.status !== "ACCEPTED" || !r.acceptedAt || !r.deadline) return s;

  const start = r.acceptedAt;
  const end = now < r.deadline ? now : r.deadline;
  const stun: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));
  let turn: Turn = { playerId: r.challengerId, number: 1, startedAt: start, used: 0, max: ACTIONS_PER_TURN, endsAt: new Date(start.getTime() + TURN_TIMEOUT_MS) };

  let botteInTurn = false;
  const passTurn = (at: Date) => {
    botteInTurn = false;
    s.previous = { playerId: turn.playerId, startedAt: turn.startedAt, endedAt: at };
    const next = other(turn.playerId);
    const max = Math.max(1, ACTIONS_PER_TURN - stun[next]);
    stun[next] = 0;
    turn = { playerId: next, number: turn.number + 1, startedAt: at, used: 0, max, endsAt: new Date(at.getTime() + TURN_TIMEOUT_MS) };
  };
  const timeouts = (until: Date) => {
    while (turn.endsAt <= until) {
      if (turn.used === 0) {
        s.parry[turn.playerId] = true;
        s.log.push({ at: turn.endsAt, playerId: turn.playerId, kind: "TIMEOUT", amount: 0 });
      }
      passTurn(turn.endsAt);
    }
  };
  const hit = (target: string, amount: number, pierce: boolean) => {
    const dealt = s.parry[target] && !pierce ? Math.floor(amount / 2) : amount;
    s.parry[target] = false;
    s.hp[target] = Math.max(0, s.hp[target] - dealt);
    return dealt;
  };

  const inFight = (d: Date) => d > start && d <= end;
  const events: Event[] = [
    ...activeApplications(input.apps)
      .filter((a) => ids.includes(a.userId) && inFight(a.createdAt))
      .map((a) => ({ at: a.createdAt, order: 0, kind: "energy" as const, playerId: a.userId })),
    ...nudgeSuccesses(input.nudges, input.apps)
      .filter(inFight)
      .map((at) => ({ at, order: 1, kind: "potion" as const })),
    ...input.actions
      .filter((a) => a.createdAt >= start && a.createdAt <= end)
      .map((a) => ({ at: a.createdAt, order: 2, kind: "action" as const, action: a })),
  ].sort((x, y) => x.at.getTime() - y.at.getTime() || x.order - y.order);

  for (const e of events) {
    timeouts(e.at);
    if (e.kind === "energy") {
      const id = e.playerId!;
      const gained = Math.min(MAX_ENERGY, s.energy[id] + ENERGY_PER_APP) - s.energy[id];
      s.energy[id] += gained;
      s.log.push({ at: e.at, playerId: id, kind: "ENERGY", amount: gained });
      continue;
    }
    if (e.kind === "potion") {
      for (const id of ids) s.potions[id] = Math.min(MAX_POTIONS, s.potions[id] + 1);
      s.log.push({ at: e.at, playerId: r.challengerId, kind: "POTION_GAIN", amount: 1 });
      continue;
    }
    const a = e.action!;
    if (a.playerId !== turn.playerId) continue;
    const me = a.playerId;
    const foe = other(me);
    s.energy[me] = Math.max(0, s.energy[me] - COST[a.kind]);
    let amount = a.value;
    if (a.kind === "ATTACK") amount = hit(foe, a.value, false);
    if (a.kind === "THRUST") amount = hit(foe, a.value, stats[me].pierce);
    if (a.kind === "PARRY") s.parry[me] = true;
    if (a.kind === "POTION") {
      s.potions[me] = Math.max(0, s.potions[me] - 1);
      s.hp[me] = Math.min(s.maxHp[me], s.hp[me] + a.value);
    }
    if (a.kind === "WHIRL") {
      s.hp[me] = Math.min(s.maxHp[me], s.hp[me] + a.value);
      stun[foe] = stats[me].stun;
    }
    s.log.push({ at: a.createdAt, playerId: me, kind: a.kind, amount });
    if (a.kind === "THRUST" || a.kind === "WHIRL") botteInTurn = true;
    if (s.hp[foe] === 0) {
      s.over = { winnerId: me, ko: true, byBotte: botteInTurn, at: a.createdAt };
      return s;
    }
    if (a.kind === "END") passTurn(a.createdAt);
    else if (++turn.used >= turn.max) passTurn(a.createdAt);
  }
  timeouts(end);
  if (now >= r.deadline) {
    const [x, y] = ids;
    const winnerId = s.hp[x] === s.hp[y] ? null : s.hp[x] > s.hp[y] ? x : y;
    s.over = { winnerId, ko: false, byBotte: false, at: r.deadline };
    return s;
  }
  s.turn = turn;
  return s;
}

export type ArenaPhase = "pending" | "expired" | "declined" | "cancelled" | "running" | "over";

/** Phase d'une Arène. La fin (K.O. ou temps) ne dépend que des actions : le rejeu se fait sans candidatures. */
export function arenaPhase(r: ArenaRow, actions: ArenaActionRow[], now: Date): ArenaPhase {
  if (r.status === "DECLINED") return "declined";
  if (r.status === "CANCELLED") return "cancelled";
  if (r.status === "PENDING") return now.getTime() - r.createdAt.getTime() >= ANSWER_WITHIN_MS ? "expired" : "pending";
  return arenaState({ arena: r, actions, apps: [], nudges: [] }, now).over ? "over" : "running";
}

/** L'Arène en attente ou en cours, s'il y en a une (une seule à la fois pour les deux joueurs). */
export function openArena(entries: ArenaEntry[], now: Date): ArenaEntry | null {
  return entries.find((e) => ["pending", "running"].includes(arenaPhase(e.arena, e.actions, now))) ?? null;
}

export type ProvokeCheck = { ok: true } | { ok: false; reason: "open" | "today" };

/** Une Arène ouverte à la fois ; une provocation par jour et par personne (refusée ou expirée ne comptent pas). */
export function canProvoke(playerId: string, entries: ArenaEntry[], now: Date): ProvokeCheck {
  if (openArena(entries, now)) return { ok: false, reason: "open" };
  const today = parisDay(now);
  const counted = entries.some(
    (e) => e.arena.challengerId === playerId && parisDay(e.arena.createdAt) === today && !["declined", "expired"].includes(arenaPhase(e.arena, e.actions, now)),
  );
  return counted ? { ok: false, reason: "today" } : { ok: true };
}

/** Combats terminés, du plus récent au plus ancien, avec leur fin. */
export function finishedArenas(inputs: ArenaInput[], now: Date): { input: ArenaInput; over: Over }[] {
  return inputs
    .filter((i) => i.arena.status === "ACCEPTED")
    .map((input) => ({ input, over: arenaState(input, now).over }))
    .filter((x): x is { input: ArenaInput; over: Over } => x.over !== null)
    .sort((x, y) => y.over.at.getTime() - x.over.at.getTime());
}

/** Gagnants d'une Arène qui portent la couronne : jusqu'à la fin du lendemain de la victoire (Paris). */
export function arenaCrowns(inputs: ArenaInput[], now: Date): string[] {
  const today = parisDay(now);
  return [
    ...new Set(
      finishedArenas(inputs, now)
        .filter(({ over }) => over.winnerId && today <= addDays(parisDay(over.at), 1))
        .map(({ over }) => over.winnerId!),
    ),
  ];
}

export type MoveCheck = { ok: true } | { ok: false; reason: "over" | "turn" | "energy" | "potion" };

/** Le joueur peut-il jouer cette action maintenant ? */
export function canPlay(state: ArenaState, playerId: string, kind: ArenaKind): MoveCheck {
  if (state.over || !state.turn) return { ok: false, reason: "over" };
  if (state.turn.playerId !== playerId) return { ok: false, reason: "turn" };
  if (kind === "POTION" && state.potions[playerId] < 1) return { ok: false, reason: "potion" };
  if (state.energy[playerId] < COST[kind]) return { ok: false, reason: "energy" };
  return { ok: true };
}

/** Plus rien à jouer ce tour (ni énergie ni potion) : le tour se termine tout seul, l'autre n'attend pas. */
export function mustPass(state: ArenaState, playerId: string): boolean {
  return !state.over && state.turn?.playerId === playerId && state.energy[playerId] < 1 && state.potions[playerId] < 1;
}

/** Valeur tirée d'une action : dégâts d'attaque dans la fourchette, Botte et potion fixes. */
export function rollValue(kind: ArenaKind, form: number, random: () => number = Math.random): number {
  const st = statsFor(form);
  if (kind === "ATTACK") return st.attack[0] + Math.floor(random() * (st.attack[1] - st.attack[0] + 1));
  if (kind === "THRUST") return st.thrust;
  if (kind === "WHIRL") return st.whirl;
  if (kind === "POTION") return POTION_HEAL;
  return 0;
}
