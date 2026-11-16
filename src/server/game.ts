// Charge les données des deux joueurs et les met dans la forme attendue par le moteur de jeu (src/game).
import { earnedAchievements } from "@/game/achievements";
import { parisDay } from "@/game/calendar";
import { pastDuels, type DuelInput } from "@/game/duel";
import { formForLevel, levelFromXp } from "@/game/levels";
import type { NudgeRow } from "@/game/nudges";
import { totalXp, type Application } from "@/game/xp";
import type { Player } from "@/generated/prisma/client";
import { db } from "./db";

export type GameData = { players: Player[]; apps: Application[]; nudges: NudgeRow[] };

export async function loadGame(): Promise<GameData> {
  const [players, rows, nudgeRows] = await Promise.all([
    db().player.findMany({ orderBy: { createdAt: "asc" } }),
    db().application.findMany(),
    db().nudge.findMany(),
  ]);
  return {
    players,
    apps: rows.map((r) => ({ id: r.id, userId: r.playerId, company: r.company, createdAt: r.createdAt, cancelledAt: r.cancelledAt })),
    nudges: nudgeRows.map((n) => ({ id: n.id, senderId: n.senderId, recipientId: n.recipientId, message: n.message, sentAt: n.sentAt })),
  };
}

/** Objectifs actifs des deux joueurs, pour le duel de la semaine. */
export async function loadDuelInput(data: GameData): Promise<DuelInput> {
  const goals = await db().goal.findMany({ where: { status: "ACTIVE" }, select: { playerId: true, target: true, createdAt: true, deadline: true } });
  return { goals: goals.map((g) => ({ ...g, deadline: parisDay(g.deadline) })), apps: data.apps, nudges: data.nudges };
}

/** Enregistre les succès gagnés ; un succès déjà débloqué n'est jamais retiré (cadrage §6.5). */
export async function syncAchievements(data: GameData, now: Date): Promise<void> {
  const today = parisDay(now);
  const won = pastDuels(await loadDuelInput(data), now).filter((d) => d.won);
  for (const player of data.players) {
    const partner = data.players.find((p) => p.id !== player.id);
    const completed = await db().goal.count({ where: { playerId: player.id, status: "COMPLETED" } });
    // Un objectif actif dont la cible est atteinte compte déjà : le succès s'affiche sur l'écran de victoire.
    const active = await db().goal.findFirst({ where: { playerId: player.id, status: "ACTIVE" }, select: { target: true, createdAt: true } });
    const doneInActive = active ? data.apps.filter((a) => a.userId === player.id && a.cancelledAt === null && a.createdAt >= active.createdAt).length : 0;
    const goalsReached = completed + (active && doneInActive >= active.target ? 1 : 0);
    const levelForm = formForLevel(levelFromXp(totalXp(player.id, data.apps, data.nudges)).level);
    const earned = earnedAchievements({ userId: player.id, partnerId: partner?.id ?? "", apps: data.apps, nudges: data.nudges, goalsReached, today, levelForm, bossesBeaten: won.filter((d) => d.fighters.some((f) => f.playerId === player.id)).length });
    if (earned.size === 0) continue;
    await db().unlockedAchievement.createMany({ data: [...earned].map((code) => ({ playerId: player.id, code })), skipDuplicates: true });
  }
}
