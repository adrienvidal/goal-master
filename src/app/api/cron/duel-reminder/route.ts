// Rappel du jeudi soir (cron Vercel) : si le boss tient encore, coup de grâce compris, on prévient les combattants.
import { BOSSES, currentDuel } from "@/game/duel";
import { loadDuelInput, loadGame } from "@/server/game";
import { pushTo } from "@/server/push";

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const now = new Date();
  const duel = currentDuel(await loadDuelInput(await loadGame()), now);
  if (!duel || duel.won) return Response.json({ sent: 0 });
  const missing = duel.hp - duel.hits - duel.bonus;
  const body = `${BOSSES[duel.boss]} tient encore. Il manque ${missing} coup${missing > 1 ? "s" : ""} avant demain 18 h.`;
  await Promise.all(duel.fighters.map((f) => pushTo(f.playerId, { title: "Goal Master", body, url: "/" })));
  return Response.json({ sent: duel.fighters.length });
}
