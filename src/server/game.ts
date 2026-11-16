// Charge les données des deux joueurs et les met dans la forme attendue par le moteur de jeu (src/game).
import { earnedAchievements } from "@/game/achievements";
import { parisDay } from "@/game/calendar";
import { formForLevel, levelFromXp } from "@/game/levels";
import { totalXp, type Application, type Nudge } from "@/game/xp";
import type { Player } from "@/generated/prisma/client";
import { db } from "./db";

export type GameData = { players: Player[]; apps: Application[]; nudges: Nudge[] };

export async function loadGame(): Promise<GameData> {
  const [players, rows, nudgeRows] = await Promise.all([
    db().player.findMany({ orderBy: { createdAt: "asc" } }),
    db().application.findMany(),
    db().nudge.findMany(),
  ]);
  return {
    players,
    apps: rows.map((r) => ({ id: r.id, userId: r.playerId, company: r.company, createdAt: r.createdAt, cancelledAt: r.cancelledAt })),
    nudges: nudgeRows.map((n) => ({ id: n.id, senderId: n.senderId, recipientId: n.recipientId, sentAt: n.sentAt })),
  };
}

/** Enregistre les succès gagnés ; un succès déjà débloqué n'est jamais retiré (cadrage §6.5). */
export async function syncAchievements(data: GameData, now: Date): Promise<void> {
  const today = parisDay(now);
  for (const player of data.players) {
    const partner = data.players.find((p) => p.id !== player.id);
    const goalsReached = await db().goal.count({ where: { playerId: player.id, status: "COMPLETED" } });
    const levelForm = formForLevel(levelFromXp(totalXp(player.id, data.apps, data.nudges)).level);
    const earned = earnedAchievements({ userId: player.id, partnerId: partner?.id ?? "", apps: data.apps, nudges: data.nudges, goalsReached, today, levelForm });
    if (earned.size === 0) continue;
    await db().unlockedAchievement.createMany({ data: [...earned].map((code) => ({ playerId: player.id, code })), skipDuplicates: true });
  }
}
