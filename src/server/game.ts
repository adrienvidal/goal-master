// Charge les données des deux joueurs et les met dans la forme attendue par le moteur de jeu (src/game).
import { earnedAchievements } from "@/game/achievements";
import { finishedArenas, type ArenaEntry, type ArenaInput } from "@/game/arena";
import { bestWinStreak, type ChallengeRow } from "@/game/challenge";
import { parisDay } from "@/game/calendar";
import { pastDuels, type DuelInput } from "@/game/duel";
import { formForLevel, levelFromXp } from "@/game/levels";
import type { NudgeRow } from "@/game/nudges";
import { ownedCompanions, questsGivenValidated, type QuestRow } from "@/game/quests";
import { totalXp, type Application } from "@/game/xp";
import type { Player } from "@/generated/prisma/client";
import { db } from "./db";

/** Objectif actif d'un joueur (le plus récent s'il y en a plusieurs). */
export type ActiveGoal = { playerId: string; target: number; deadline: Date; createdAt: Date };

export type GameData = { players: Player[]; apps: Application[]; nudges: NudgeRow[]; challenges: ChallengeRow[]; arenas: ArenaEntry[]; quests: QuestRow[]; goals: ActiveGoal[] };

export async function loadGame(): Promise<GameData> {
  // Une seule vague de lectures en parallèle : chaque aller-retour vers la base compte.
  const [players, rows, nudgeRows, challenges, arenas, quests, goals] = await Promise.all([
    db().player.findMany({ orderBy: { createdAt: "asc" } }),
    db().application.findMany(),
    db().nudge.findMany(),
    db().challenge.findMany({ orderBy: { createdAt: "desc" } }),
    db().arena.findMany({ orderBy: { createdAt: "desc" }, include: { actions: { orderBy: { createdAt: "asc" } } } }),
    db().quest.findMany({ orderBy: { createdAt: "asc" } }),
    db().goal.findMany({ where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" }, select: { playerId: true, target: true, createdAt: true, deadline: true } }),
  ]);
  return {
    players,
    apps: rows.map((r) => ({ id: r.id, userId: r.playerId, company: r.company, createdAt: r.createdAt, cancelledAt: r.cancelledAt, externalRef: r.externalRef, source: r.source })),
    nudges: nudgeRows.map((n) => ({ id: n.id, senderId: n.senderId, recipientId: n.recipientId, message: n.message, sentAt: n.sentAt })),
    challenges,
    arenas: arenas.map(({ actions, ...arena }) => ({ arena, actions })),
    quests,
    goals,
  };
}

/** Les Arènes à rejouer (v2 : leurs actions suffisent). */
export function arenaInputs(data: GameData): ArenaInput[] {
  return data.arenas;
}

/** Objectif actif d'un joueur, déjà chargé avec le jeu. */
export function activeGoal(data: GameData, playerId: string): ActiveGoal | null {
  return data.goals.find((g) => g.playerId === playerId) ?? null;
}

/** Objectifs actifs des deux joueurs, pour le duel de la semaine. */
export async function loadDuelInput(data: GameData): Promise<DuelInput> {
  return { goals: data.goals.map((g) => ({ ...g, deadline: parisDay(g.deadline) })), apps: data.apps, nudges: data.nudges, quests: data.quests };
}

/** Enregistre les succès gagnés ; un succès déjà débloqué n'est jamais retiré (cadrage §6.5). */
export async function syncAchievements(data: GameData, now: Date): Promise<void> {
  const today = parisDay(now);
  const won = pastDuels(await loadDuelInput(data), now).filter((d) => d.won);
  const arenas = finishedArenas(arenaInputs(data), now);
  for (const player of data.players) {
    const partner = data.players.find((p) => p.id !== player.id);
    const completed = await db().goal.count({ where: { playerId: player.id, status: "COMPLETED" } });
    // Un objectif actif dont la cible est atteinte compte déjà : le succès s'affiche sur l'écran de victoire.
    const active = await db().goal.findFirst({ where: { playerId: player.id, status: "ACTIVE" }, select: { target: true, createdAt: true } });
    const doneInActive = active ? data.apps.filter((a) => a.userId === player.id && a.cancelledAt === null && a.createdAt >= active.createdAt).length : 0;
    const goalsReached = completed + (active && doneInActive >= active.target ? 1 : 0);
    const levelForm = formForLevel(levelFromXp(totalXp(player.id, data.apps, data.nudges, data.quests)).level);
    const earned = earnedAchievements({ userId: player.id, partnerId: partner?.id ?? "", apps: data.apps, nudges: data.nudges, goalsReached, today, levelForm, bossesBeaten: won.filter((d) => d.fighters.some((f) => f.playerId === player.id)).length, challengeWinStreak: bestWinStreak(player.id, data.challenges, now), arenaWins: arenas.filter((a) => a.over.winnerId === player.id).length, arenaBotteKos: arenas.filter((a) => a.over.winnerId === player.id && a.over.byBotte).length, companions: ownedCompanions(player.id, data.quests).length, questsGiven: questsGivenValidated(player.id, data.quests) });
    if (earned.size === 0) continue;
    await db().unlockedAchievement.createMany({ data: [...earned].map((code) => ({ playerId: player.id, code })), skipDuplicates: true });
  }
}
