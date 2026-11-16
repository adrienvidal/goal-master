"use server";
import { redirect } from "next/navigation";
import { parisDay } from "@/game/calendar";
import { extendedDeadline, validateNewGoal } from "@/lib/goal";
import { db } from "@/server/db";
import { requirePlayer } from "@/server/session";

const noon = (day: string): Date => new Date(`${day}T12:00:00Z`);

/** Temps écoulé : on prolonge la date limite de 4 semaines, sans pénalité. */
export async function extendGoal(): Promise<void> {
  const player = await requirePlayer();
  await db().goal.updateMany({ where: { playerId: player.id, status: "ACTIVE" }, data: { deadline: noon(extendedDeadline(parisDay(new Date()))) } });
  redirect("/");
}

/** Victoire : on range l'objectif atteint pour en fixer un nouveau. */
export async function completeGoal(): Promise<void> {
  const player = await requirePlayer();
  await db().goal.updateMany({ where: { playerId: player.id, status: "ACTIVE" }, data: { status: "COMPLETED", closedAt: new Date() } });
  redirect("/objectif/nouveau");
}

/** Temps écoulé : on clôt l'objectif pour en fixer un nouveau. */
export async function abandonGoal(): Promise<void> {
  const player = await requirePlayer();
  await db().goal.updateMany({ where: { playerId: player.id, status: "ACTIVE" }, data: { status: "EXPIRED", closedAt: new Date() } });
  redirect("/objectif/nouveau");
}

export type NewGoalState = { error: string } | null;

/** Nouvel objectif, seul moment où l'on peut changer de personnage (cadrage §4.4). */
export async function createGoal(_prev: NewGoalState, form: FormData): Promise<NewGoalState> {
  const player = await requirePlayer();
  const field = (name: string): string => String(form.get(name) ?? "");
  const result = validateNewGoal({ target: field("target"), deadline: field("deadline"), character: field("character") }, parisDay(new Date()));
  if (!result.ok) return { error: result.error };
  const active = await db().goal.count({ where: { playerId: player.id, status: "ACTIVE" } });
  if (active > 0) redirect("/");
  const { target, deadline, character } = result.value;
  await db().$transaction([
    db().player.update({ where: { id: player.id }, data: { character } }),
    db().goal.create({ data: { playerId: player.id, target, deadline: noon(deadline) } }),
  ]);
  redirect("/");
}
