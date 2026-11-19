// État du héros pour l'encart job-finder (clé en Authorization: Bearer).
import { loadGame } from "@/server/game";
import { json, playerForKey, stateOf, UNAUTHORIZED } from "@/server/widget";

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const player = await playerForKey(req);
  if (!player) return UNAUTHORIZED();
  return json(await stateOf(await loadGame(), player, new Date()));
}
