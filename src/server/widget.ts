import type { Player } from "@/generated/prisma/client";
import { parisDay } from "@/game/calendar";
import { currentDuel } from "@/game/duel";
import { sentToday } from "@/game/nudges";
import { companionLabel, isCompanion, ownedCompanions } from "@/game/quests";
import { buildPlayerView } from "@/lib/playerView";
import { bearerKey, hashWidgetKey } from "@/lib/widgetLink";
import { widgetBoss, widgetFriend, widgetState, type WidgetState } from "@/lib/widgetState";
import { db } from "./db";
import { activeGoal, loadDuelInput, type GameData } from "./game";

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

export async function stateOf(game: GameData, player: Player, now: Date): Promise<WidgetState> {
  const row = game.players.find((p) => p.id === player.id) ?? player;
  const view = buildPlayerView(row, game.apps, game.nudges, game.quests, activeGoal(game, player.id), now);
  const owned = ownedCompanions(player.id, game.quests);
  const companions = row.walkers.filter(isCompanion).filter((c) => owned.includes(c)).map((id) => ({ id, name: companionLabel(player.id, id, game.quests) }));
  // L'ami se lit (seule exception au filtrage par joueur courant) : il passe dans la scène du mode libre.
  const partner = game.players.find((p) => p.id !== player.id);
  const partnerView = partner ? buildPlayerView(partner, game.apps, game.nudges, game.quests, activeGoal(game, partner.id), now) : null;
  const friend = partner && partnerView ? widgetFriend(partnerView, game.apps, partner.seenForm) : null;
  const boss = widgetBoss(currentDuel(await loadDuelInput(game), now));
  const canNudge = !!friend && friend.today === 0 && !sentToday(player.id, game.nudges, parisDay(now));
  return widgetState(view, game.apps, player.id, row.seenForm, companions, { friend, boss, canNudge });
}

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function UNAUTHORIZED(): Response {
  return json({ error: "unauthorized" }, 401);
}
