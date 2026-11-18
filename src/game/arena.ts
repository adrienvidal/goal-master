// Arène : combat au tour par tour entre les deux joueurs (spec docs/specs/2026-11-17-arene-design.md).
// Tout est pur : seuls la provocation, la réponse et les actions (avec leur valeur tirée) sont stockés.
// L'état du combat (PV, PA, potions, tour, fin) se rejoue à chaque lecture, à partir de zéro.
// v2 (18/11) : jeu à part, rien ne vient des candidatures ni des relances. « energy » = les PA (points d'action).
import { addDays, parisDay } from "./calendar";
import { DUEL_HOUR, duelDayOf, parisTime } from "./duel";
import type { Form } from "./levels";

const H = 60 * 60 * 1000;
export const ANSWER_WITHIN_MS = 24 * H;
export const TURN_TIMEOUT_MS = 24 * H;
export const MAX_ENERGY = 6;
/** PA reçus au début de chaque tour : de quoi jouer un tour entier, ou garder pour la Botte. */
export const ENERGY_PER_TURN = 3;
/** PA rendu par une Parade qui encaisse un coup. */
export const PARRY_REFUND = 1;
export const START_POTIONS = 2;
export const ACTIONS_PER_TURN = 3;

export type ArenaStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED";
export type ArenaKind = "ATTACK" | "PARRY" | "THRUST" | "WHIRL" | "POTION" | "END";
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
  /** Version des règles du combat, figée à la création : un combat ne change jamais de règles en cours de route. */
  rules: number;
};
export type ArenaActionRow = { id: string; arenaId: string; playerId: string; kind: ArenaKind; value: number; createdAt: Date };
export type ArenaEntry = { arena: ArenaRow; actions: ArenaActionRow[] };
export type ArenaInput = ArenaEntry;

/** `whirlHit` : dégâts du Bambou tourbillon, en plus du soin (`whirl`). */
export type Stats = { maxHp: number; attack: [number, number]; thrust: [number, number]; pierce: boolean; whirl: number; whirlHit: number; stun: number };

export type Rules = {
  version: number;
  cost: Record<ArenaKind, number>;
  potionHeal: number;
  /** Actions du premier tour du lanceur, qui ouvre le combat. */
  openerActions: number;
  /** PA en réserve au départ pour celui qui répond à la provocation. */
  responderBonus: number;
  stats(form: number): Stats;
  /** PA en réserve au départ selon l'écart d'évolution (outsider). */
  startBonus(form: number, otherForm: number): number;
};

const tierOf = (form: number) => Math.ceil(form / 2);

/** v2 (18/11) : stats qui montent avec l'évolution, +1 PA pour l'outsider. Gardée pour rejouer les combats commencés avant la v3. */
const V2: Rules = {
  version: 2,
  cost: { ATTACK: 1, PARRY: 1, THRUST: 3, WHIRL: 3, POTION: 0, END: 0 },
  potionHeal: 6,
  openerActions: ACTIONS_PER_TURN,
  responderBonus: 0,
  stats: (form) => {
    const tier = tierOf(form);
    return { maxHp: 28 + 2 * form, attack: [3 + tier, 5 + tier], thrust: [10 + 2 * tier, 10 + 2 * tier], pierce: tier === 3, whirl: 6 + 2 * tier, whirlHit: 0, stun: tier === 3 ? 2 : 1 };
  },
  startBonus: (form, otherForm) => (form < otherForm ? 1 : 0),
};

/**
 * v3 (équilibrage du 18/11) : l'évolution change le style plus que la force (Parade percée au dernier palier),
 * celui qui ouvre n'a que 2 actions au premier tour et l'autre part avec 1 PA, la Botte coûte 2 PA,
 * le Bambou tourbillon blesse aussi, et les coups varient davantage pour que rien ne soit joué d'avance.
 * Cibles convenues avec Adrien, vérifiées par arena-balance.test.ts.
 */
const V3: Rules = {
  version: 3,
  cost: { ATTACK: 1, PARRY: 1, THRUST: 2, WHIRL: 2, POTION: 0, END: 0 },
  potionHeal: 6,
  openerActions: 2,
  responderBonus: 1,
  stats: (form) => {
    const tier = tierOf(form);
    return { maxHp: 48 + form, attack: [2, 8], thrust: [2 + tier, 10 + tier], pierce: tier === 3, whirl: 2 + tier, whirlHit: 4, stun: 1 };
  },
  startBonus: (form, otherForm) => Math.max(0, Math.ceil((otherForm - form) / 2)),
};

const ALL_RULES: Record<number, Rules> = { 2: V2, 3: V3 };
export const CURRENT_RULES = V3;

/** Règles d'une version ; une version inconnue retombe sur les règles actuelles. */
export function rulesFor(version: number | null | undefined): Rules {
  return (version != null && ALL_RULES[version]) || CURRENT_RULES;
}

/** PA en réserve au départ : bonus d'outsider, plus le bonus de celui qui répond (le lanceur ouvre). */
export function startEnergy(rules: Rules, form: number, otherForm: number, responder: boolean): number {
  return Math.min(MAX_ENERGY, rules.startBonus(form, otherForm) + (responder ? rules.responderBonus : 0));
}

/** Stats d'une évolution selon les règles (actuelles par défaut). */
export function statsFor(form: number, rules: Rules = CURRENT_RULES): Stats {
  return rules.stats(form);
}

/** PA en réserve au départ pour l'outsider, selon les règles (actuelles par défaut). */
export function startBonus(form: Form | number, otherForm: Form | number, rules: Rules = CURRENT_RULES): number {
  return rules.startBonus(form, otherForm);
}

/** Vendredi 18 h (Paris) qui suit l'acceptation ; le suivant s'il reste moins de 48 h. */
export function arenaDeadline(acceptedAt: Date): Date {
  const friday = duelDayOf(acceptedAt);
  const end = parisTime(friday, DUEL_HOUR);
  return end.getTime() - acceptedAt.getTime() < 48 * H ? parisTime(addDays(friday, 7), DUEL_HOUR) : end;
}

/** `hp` : les PV des deux après la ligne, pour rejouer le combat pas à pas. ENERGY = PA du début de tour, REFUND = PA rendu par la Parade. */
export type LogEntry = { at: Date; playerId: string; kind: ArenaKind | "TIMEOUT" | "ENERGY" | "REFUND"; amount: number; hp: Record<string, number>; dealt?: number };
export type Turn = { playerId: string; number: number; startedAt: Date; used: number; max: number; endsAt: Date };
/** `byBotte` : K.O. porté pendant le tour où le gagnant a joué sa Botte (Coup de maître, à la portée des deux personnages). */
export type Over = { winnerId: string | null; ko: boolean; byBotte: boolean; at: Date };
export type ArenaState = {
  /** Version des règles du combat (voir `rulesFor`). */
  rulesVersion: number;
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

/** Rejoue le combat jusqu'à `now`. Les actions stockées font foi : elles ont été validées à l'écriture. */
export function arenaState(input: ArenaInput, now: Date): ArenaState {
  const { arena: r } = input;
  const ids = [r.challengerId, r.opponentId];
  const other = (id: string) => (id === r.challengerId ? r.opponentId : r.challengerId);
  const form = (id: string) => (id === r.challengerId ? r.challengerForm : r.opponentForm) ?? 1;
  const rules = rulesFor(r.rules);
  const stats = Object.fromEntries(ids.map((id) => [id, statsFor(form(id), rules)]));
  const s: ArenaState = {
    rulesVersion: rules.version,
    maxHp: Object.fromEntries(ids.map((id) => [id, stats[id].maxHp])),
    hp: Object.fromEntries(ids.map((id) => [id, stats[id].maxHp])),
    energy: Object.fromEntries(ids.map((id) => [id, startEnergy(rules, form(id), form(other(id)), id === r.opponentId)])),
    potions: Object.fromEntries(ids.map((id) => [id, START_POTIONS])),
    parry: Object.fromEntries(ids.map((id) => [id, false])),
    turn: null,
    previous: null,
    over: null,
    log: [],
  };
  if (r.status !== "ACCEPTED" || !r.acceptedAt || !r.deadline) return s;

  const log = (at: Date, playerId: string, kind: LogEntry["kind"], amount: number, dealt?: number) =>
    s.log.push({ at, playerId, kind, amount, hp: { ...s.hp }, ...(dealt ? { dealt } : {}) });
  const gain = (id: string, n: number) => {
    const got = Math.min(MAX_ENERGY, s.energy[id] + n) - s.energy[id];
    s.energy[id] += got;
    return got;
  };
  const start = r.acceptedAt;
  const end = now < r.deadline ? now : r.deadline;
  const stun: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));
  let turn: Turn = { playerId: r.challengerId, number: 1, startedAt: start, used: 0, max: rules.openerActions, endsAt: new Date(start.getTime() + TURN_TIMEOUT_MS) };
  log(start, turn.playerId, "ENERGY", gain(turn.playerId, ENERGY_PER_TURN));

  let botteInTurn = false;
  const passTurn = (at: Date) => {
    botteInTurn = false;
    s.previous = { playerId: turn.playerId, startedAt: turn.startedAt, endedAt: at };
    const next = other(turn.playerId);
    const max = Math.max(1, ACTIONS_PER_TURN - stun[next]);
    stun[next] = 0;
    turn = { playerId: next, number: turn.number + 1, startedAt: at, used: 0, max, endsAt: new Date(at.getTime() + TURN_TIMEOUT_MS) };
    log(at, next, "ENERGY", gain(next, ENERGY_PER_TURN));
  };
  const timeouts = (until: Date) => {
    while (turn.endsAt <= until) {
      if (turn.used === 0) {
        s.parry[turn.playerId] = true;
        log(turn.endsAt, turn.playerId, "TIMEOUT", 0);
      }
      passTurn(turn.endsAt);
    }
  };
  /** Un coup sur une Parade est divisé par deux et lui rend 1 PA ; un coup qui la perce la consomme sans rien rendre. */
  const hit = (target: string, amount: number, pierce: boolean): { dealt: number; refund: number } => {
    const parried = s.parry[target] && !pierce;
    s.parry[target] = false;
    const dealt = parried ? Math.floor(amount / 2) : amount;
    s.hp[target] = Math.max(0, s.hp[target] - dealt);
    return { dealt, refund: parried ? gain(target, PARRY_REFUND) : 0 };
  };

  for (const a of input.actions.filter((x) => x.createdAt >= start && x.createdAt <= end)) {
    timeouts(a.createdAt);
    // Un coup enregistré a été validé à l'écriture (parfois sous les règles d'avant) : il garde sa main.
    if (a.playerId !== turn.playerId) passTurn(a.createdAt);
    const me = a.playerId;
    const foe = other(me);
    s.energy[me] = Math.max(0, s.energy[me] - rules.cost[a.kind]);
    let amount = a.value;
    let refund = 0;
    /** Dégâts du Bambou tourbillon (v3), en plus de son soin. */
    let whirlDealt = 0;
    if (a.kind === "ATTACK" || a.kind === "THRUST") ({ dealt: amount, refund } = hit(foe, a.value, a.kind === "THRUST" && stats[me].pierce));
    if (a.kind === "PARRY") s.parry[me] = true;
    if (a.kind === "POTION") {
      s.potions[me] = Math.max(0, s.potions[me] - 1);
      s.hp[me] = Math.min(s.maxHp[me], s.hp[me] + a.value);
    }
    if (a.kind === "WHIRL") {
      s.hp[me] = Math.min(s.maxHp[me], s.hp[me] + a.value);
      stun[foe] = stats[me].stun;
      if (stats[me].whirlHit) ({ dealt: whirlDealt, refund } = hit(foe, stats[me].whirlHit, false));
    }
    log(a.createdAt, me, a.kind, amount, whirlDealt);
    if (refund) log(a.createdAt, foe, "REFUND", refund);
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

/** Phase d'une Arène : la fin (K.O. ou temps) ne dépend que des actions. */
export function arenaPhase(r: ArenaRow, actions: ArenaActionRow[], now: Date): ArenaPhase {
  if (r.status === "DECLINED") return "declined";
  if (r.status === "CANCELLED") return "cancelled";
  if (r.status === "PENDING") return now.getTime() - r.createdAt.getTime() >= ANSWER_WITHIN_MS ? "expired" : "pending";
  return arenaState({ arena: r, actions }, now).over ? "over" : "running";
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
  if (state.energy[playerId] < rulesFor(state.rulesVersion).cost[kind]) return { ok: false, reason: "energy" };
  return { ok: true };
}

/** Plus rien à jouer ce tour (ni PA ni potion) : le tour se termine tout seul, l'autre n'attend pas. */
export function mustPass(state: ArenaState, playerId: string): boolean {
  return !state.over && state.turn?.playerId === playerId && state.energy[playerId] < 1 && state.potions[playerId] < 1;
}

/** Valeur tirée d'une action : dégâts d'attaque dans la fourchette, Botte et potion fixes. */
export function rollValue(kind: ArenaKind, form: number, rules: Rules = CURRENT_RULES, random: () => number = Math.random): number {
  const st = statsFor(form, rules);
  const roll = ([min, max]: [number, number]) => min + Math.floor(random() * (max - min + 1));
  if (kind === "ATTACK") return roll(st.attack);
  if (kind === "THRUST") return roll(st.thrust);
  if (kind === "WHIRL") return st.whirl;
  if (kind === "POTION") return rules.potionHeal;
  return 0;
}
