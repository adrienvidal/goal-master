import type { Player } from "@/generated/prisma/client";
import { buildPlayerView } from "@/lib/playerView";
import { bearerKey, hashWidgetKey } from "@/lib/widgetLink";
import { widgetState, type WidgetState } from "@/lib/widgetState";
import { db } from "./db";
import { activeGoal, type GameData } from "./game";

// Encart job-finder : la clé remplace la session (l'encart vit dans un autre site, sans cookies fiables).

/** Joueur de la clé portée par la requête, ou null (absente, mal formée, inconnue, révoquée). */
export async function playerForKey(req: Request): Promise<Player | null> {
  const key = bearerKey(req.headers.get("authorization"));
  const hash = key ? hashWidgetKey(key) : null;
  if (!hash) return null;
  const row = await db().widgetKey.findUnique({ where: { hash }, include: { player: true } });
  if (!row || row.revokedAt) return null;
  await db().widgetKey.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } });
  return row.player;
}

export function stateOf(game: GameData, player: Player, now: Date): WidgetState {
  const row = game.players.find((p) => p.id === player.id) ?? player;
  const view = buildPlayerView(row, game.apps, game.nudges, game.quests, activeGoal(game, player.id), now);
  return widgetState(view, game.apps, player.id);
}

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function UNAUTHORIZED(): Response {
  return json({ error: "unauthorized" }, 401);
}
