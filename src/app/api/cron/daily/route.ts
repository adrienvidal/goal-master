// Cron quotidien (Vercel Hobby : une fois par jour, dans l'heure ; 17 h UTC = 18 h ou 19 h à Paris, après le duel).
// Jeudi : rappel si le boss tient encore. Vendredi : résultat du duel. Chaque jour : rouille et nouveauté.
import { parisDay, type Day } from "@/game/calendar";
import { currentDuel, pastDuels } from "@/game/duel";
import { rustDue, type NotificationEvent } from "@/game/notifications";
import { INTRO_STEP_COUNT, LATEST_NEWS } from "@/lib/intro";
import { loadDuelInput, loadGame } from "@/server/game";
import { notifyAll } from "@/server/notify";

const HERO = { KNIGHT: "chevalier", PANDA: "panda" } as const;

function weekday(day: Day): number {
  return new Date(`${day}T12:00:00Z`).getUTCDay();
}

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const now = new Date();
  const today = parisDay(now);
  const game = await loadGame();
  const input = await loadDuelInput(game);
  const items: { playerId: string; event: NotificationEvent }[] = [];

  if (weekday(today) === 4) {
    const duel = currentDuel(input, now);
    if (duel && !duel.won) {
      const missing = duel.hp - duel.hits - duel.bonus;
      for (const f of duel.fighters) items.push({ playerId: f.playerId, event: { kind: "remind", friday: duel.id, boss: duel.boss, missing } });
    }
  }
  if (weekday(today) === 5) {
    const last = pastDuels(input, now)[0];
    if (last?.id === today) {
      for (const f of last.fighters) items.push({ playerId: f.playerId, event: { kind: "duel", friday: last.id, won: last.won, boss: last.boss, total: last.hits + last.bonus, hp: last.hp } });
    }
  }
  // Plafonnés ensuite : la rouille passe avant la nouveauté.
  for (const p of game.players) {
    const rust = rustDue(p.id, game.apps, today);
    if (rust) items.push({ playerId: p.id, event: { kind: "rust", lastDay: rust.lastDay, idle: rust.idle, hero: HERO[p.character] } });
  }
  for (const p of game.players) items.push({ playerId: p.id, event: { kind: "news", step: INTRO_STEP_COUNT, title: LATEST_NEWS } });

  await notifyAll(items, now);
  return Response.json({ considered: items.length });
}
