// Cron quotidien, appelé par n8n (workflow « Goal Master · cron quotidien » sur auto.webnrolls.com) à 18 h 01, heure de Paris :
// juste après le duel du vendredi 18 h. Chaque envoi est dédoublonné, un second appel ne renvoie rien.
// Jeudi : rappel si le boss tient encore. Vendredi : résultat du duel. Chaque jour : Arène, rouille, nouveauté, puis le
// bilan du jour par e-mail (src/server/digest.ts).
import { arenaPhase, arenaState } from "@/game/arena";
import { parisDay, type Day } from "@/game/calendar";
import { currentDuel, pastDuels } from "@/game/duel";
import { rustDue, type NotificationEvent } from "@/game/notifications";
import { INTRO_STEP_COUNT, LATEST_NEWS } from "@/lib/intro";
import { arenaEvents } from "@/server/arena";
import { arenaInputs, loadDuelInput, loadGame } from "@/server/game";
import { sendDigests } from "@/server/digest";
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
  // Arène : tours passés au temps (« À toi de jouer ») et fins au temps ; déjà envoyés = ignorés.
  for (const input of arenaInputs(game)) {
    if (arenaPhase(input.arena, input.actions, now) === "running") items.push(...arenaEvents(input, game, now));
    const over = arenaState(input, now).over;
    if (over && now.getTime() - over.at.getTime() < 7 * 24 * 60 * 60 * 1000) items.push(...arenaEvents(input, game, now));
  }
  // Plafonnés ensuite : la rouille passe avant la nouveauté.
  for (const p of game.players) {
    const rust = rustDue(p.id, game.apps, today);
    if (rust) items.push({ playerId: p.id, event: { kind: "rust", lastDay: rust.lastDay, idle: rust.idle, hero: HERO[p.character] } });
  }
  for (const p of game.players) items.push({ playerId: p.id, event: { kind: "news", step: INTRO_STEP_COUNT, title: LATEST_NEWS } });

  await notifyAll(items, now);
  // Bilan du jour en dernier : il reprend tout ce qui vient d'être noté, résultat du duel compris.
  const digests = await sendDigests(game, now);
  return Response.json({ considered: items.length, digests });
}
