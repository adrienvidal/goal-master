// Victoire d'un défi : posée une seule fois, par une mise à jour conditionnelle (spec defi).
import { challengeScore, openChallenge, reachedTarget, type ChallengeRow } from "@/game/challenge";
import type { NotificationEvent } from "@/game/notifications";
import { db } from "./db";
import type { GameData } from "./game";

/**
 * Si la candidature qu'on vient d'ajouter fait atteindre la cible du défi en cours, enregistre la victoire,
 * met `game` à jour et renvoie les notifications de résultat pour les deux joueurs.
 */
export async function settleChallenge(playerId: string, game: GameData, now: Date): Promise<{ playerId: string; event: NotificationEvent }[]> {
  const open = openChallenge(game.challenges, now);
  if (!open || !reachedTarget(open, playerId, game.apps, now)) return [];
  const { count } = await db().challenge.updateMany({
    where: { id: open.id, status: "ACCEPTED", winnerId: null, deadline: { gt: now } },
    data: { winnerId: playerId, wonAt: now },
  });
  if (count !== 1) return [];
  const won: ChallengeRow = { ...open, winnerId: playerId, wonAt: now };
  game.challenges = game.challenges.map((c) => (c.id === open.id ? won : c));
  const loserId = open.challengerId === playerId ? open.opponentId : open.challengerId;
  const pseudo = (id: string) => game.players.find((p) => p.id === id)?.pseudo ?? "Ton binôme";
  const mine = challengeScore(playerId, won, game.apps);
  const theirs = challengeScore(loserId, won, game.apps);
  return [
    { playerId, event: { kind: "challenge-end", challengeId: open.id, won: true, partner: pseudo(loserId), mine, theirs } },
    { playerId: loserId, event: { kind: "challenge-end", challengeId: open.id, won: false, partner: pseudo(playerId), mine: theirs, theirs: mine } },
  ];
}
