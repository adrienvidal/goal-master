"use server";
import { redirect } from "next/navigation";
import { parisDay } from "@/game/calendar";
import { validateOnboarding } from "@/lib/onboarding";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";

export type OnboardingState = { error: string } | null;

export async function createPlayer(_prev: OnboardingState, form: FormData): Promise<OnboardingState> {
  const user = await requireUser();
  const taken = (await db().player.findMany({ where: { id: { not: user.id } }, select: { color: true } })).map((p) => p.color);
  const field = (name: string): string => String(form.get(name) ?? "");
  const result = validateOnboarding(
    { pseudo: field("pseudo"), character: field("character"), color: field("color"), target: field("target"), deadline: field("deadline") },
    parisDay(new Date()),
    taken,
  );
  if (!result.ok) return { error: result.error };
  const { pseudo, character, color, target, deadline } = result.value;
  try {
    await db().$transaction([
      db().player.create({ data: { id: user.id, email: user.email, pseudo, character, color } }),
      db().goal.create({ data: { playerId: user.id, target, deadline: new Date(`${deadline}T12:00:00Z`) } }),
    ]);
  } catch {
    return { error: "Cette couleur vient d'être prise par ton binôme. Choisis-en une autre." };
  }
  redirect("/");
}
