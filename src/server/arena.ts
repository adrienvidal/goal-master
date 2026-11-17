// Arène : notifications de tour et de fin, communes aux actions de jeu et au cron (spec arene).
import { arenaState, type ArenaInput, type ArenaState, type LogEntry } from "@/game/arena";
import type { NotificationEvent } from "@/game/notifications";
import type { GameData } from "./game";

type Item = { playerId: string; event: NotificationEvent };

/** Résumé du tour que vient de jouer `from`, vu par son adversaire. */
export function turnSummary(from: string, entries: LogEntry[]): string {
  const sum = (kinds: string[]) => entries.filter((e) => kinds.includes(e.kind)).reduce((n, e) => n + e.amount, 0);
  const parts: string[] = [];
  const dealt = sum(["ATTACK", "THRUST"]);
  const healed = sum(["WHIRL", "POTION"]);
  if (dealt > 0) parts.push(`t'a infligé ${dealt} dégât${dealt > 1 ? "s" : ""}`);
  if (healed > 0) parts.push(`s'est soigné de ${healed}`);
  if (entries.some((e) => e.kind === "PARRY" || e.kind === "TIMEOUT")) parts.push("s'est mis en garde");
  if (entries.some((e) => e.kind === "WHIRL")) parts.push("t'a étourdi");
  if (parts.length === 0) return `${from} a passé son tour.`;
  const last = parts.pop()!;
  return `${from} ${parts.length ? `${parts.join(", ")} et ${last}` : last}.`;
}

/** Notifications dues pour une Arène : « À toi de jouer » au début de chaque tour, résultat à la fin. Dédoublonnées par clé. */
export function arenaEvents(input: ArenaInput, game: GameData, now: Date): Item[] {
  const s: ArenaState = arenaState(input, now);
  const pseudo = (id: string) => game.players.find((p) => p.id === id)?.pseudo ?? "Ton binôme";
  const { challengerId, opponentId } = input.arena;
  if (s.over) {
    return [challengerId, opponentId].map((id) => {
      const foe = id === challengerId ? opponentId : challengerId;
      return { playerId: id, event: { kind: "arena-end", arenaId: input.arena.id, won: s.over!.winnerId === null ? null : s.over!.winnerId === id, ko: s.over!.ko, partner: pseudo(foe) } };
    });
  }
  if (!s.turn || !s.previous) return [];
  const { playerId: foe, startedAt, endedAt } = s.previous;
  const played = s.log.filter((e) => e.playerId === foe && e.at >= startedAt && e.at <= endedAt && e.kind !== "ENERGY" && e.kind !== "POTION_GAIN");
  return [{ playerId: s.turn.playerId, event: { kind: "arena-turn", arenaId: input.arena.id, turn: s.turn.number, partner: pseudo(foe), summary: turnSummary(pseudo(foe), played), hp: s.hp[s.turn.playerId] } }];
}

