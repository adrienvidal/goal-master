// Date limite commune aux deux joueurs : celle de l'objectif actif du binôme, s'il en a un.
import { parisDay, type Day } from "@/game/calendar";
import { db } from "./db";

export async function partnerDeadline(playerId: string): Promise<Day | null> {
  const goal = await db().goal.findFirst({
    where: { playerId: { not: playerId }, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: { deadline: true },
  });
  if (!goal) return null;
  const day = parisDay(goal.deadline);
  // Date déjà passée : l'objectif du binôme est en « Temps écoulé », on laisse choisir une nouvelle date.
  return day > parisDay(new Date()) ? day : null;
}
