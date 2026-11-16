"use server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { canLaunch, CHALLENGE_TARGETS, deadlineFor, openChallenge, phaseOf, type ChallengeWhen } from "@/game/challenge";
import { db } from "@/server/db";
import { loadGame } from "@/server/game";
import { notify } from "@/server/notify";
import { requirePlayer } from "@/server/session";

export type ChallengeResult = { ok: true } | { ok: false; error: string };

const UNTIL: Record<ChallengeWhen, string> = { tonight: "ce soir minuit", friday: "vendredi 18 h" };

/** Lance un défi au binôme (spec defi) : un ouvert à la fois, un lancement par jour et par personne. */
export async function launchChallenge(target: number, when: ChallengeWhen): Promise<ChallengeResult> {
  const player = await requirePlayer();
  if (!(CHALLENGE_TARGETS as readonly number[]).includes(target) || !Object.hasOwn(UNTIL, when)) return { ok: false, error: "Choisis une cible et une échéance." };
  const now = new Date();
  const deadline = deadlineFor(when, now);
  if (!deadline) return { ok: false, error: "Trop tard pour ce soir : choisis vendredi 18 h." };
  const game = await loadGame();
  const partner = game.players.find((p) => p.id !== player.id);
  if (!partner) return { ok: false, error: "Ton binôme ne s'est pas encore connecté." };
  const check = canLaunch(player.id, game.challenges, now);
  if (!check.ok) {
    const open = openChallenge(game.challenges, now);
    if (open?.challengerId === partner.id && phaseOf(open, now) === "pending") return { ok: false, error: `${partner.pseudo} vient de te défier : réponds à son défi.` };
    return { ok: false, error: check.reason === "open" ? "Un défi est déjà en cours." : "Tu as déjà lancé un défi aujourd'hui, reviens demain." };
  }
  const created = await db().challenge.create({ data: { challengerId: player.id, opponentId: partner.id, target, deadline } });
  // Deux défis lancés à la même seconde : le premier enregistré l'emporte.
  const first = await db().challenge.findFirst({
    where: { status: { in: ["PENDING", "ACCEPTED"] }, winnerId: null, deadline: { gt: now } },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (first && first.id !== created.id) {
    await db().challenge.delete({ where: { id: created.id } });
    revalidatePath("/");
    return { ok: false, error: `${partner.pseudo} vient de te défier : réponds à son défi.` };
  }
  after(() => notify(partner.id, { kind: "challenge", challengeId: created.id, from: player.pseudo, target, until: UNTIL[when] }));
  revalidatePath("/");
  return { ok: true };
}

/** Relever le défi ou passer son tour, tant qu'il est en attente. */
export async function respondChallenge(id: string, accept: boolean): Promise<ChallengeResult> {
  const player = await requirePlayer();
  const now = new Date();
  const { count } = await db().challenge.updateMany({
    where: { id, opponentId: player.id, status: "PENDING", deadline: { gt: now } },
    data: accept ? { status: "ACCEPTED", acceptedAt: now } : { status: "DECLINED", closedAt: now },
  });
  revalidatePath("/");
  if (count === 1) return { ok: true };
  const row = await db().challenge.findUnique({ where: { id }, select: { status: true, challenger: { select: { pseudo: true } } } });
  return { ok: false, error: row?.status === "CANCELLED" ? `${row.challenger.pseudo} a annulé son défi.` : "Ce défi n'est plus ouvert." };
}

/** Le lanceur retire son défi tant qu'il n'a pas été relevé. */
export async function cancelChallenge(id: string): Promise<ChallengeResult> {
  const player = await requirePlayer();
  const { count } = await db().challenge.updateMany({
    where: { id, challengerId: player.id, status: "PENDING" },
    data: { status: "CANCELLED", closedAt: new Date() },
  });
  revalidatePath("/");
  return count === 1 ? { ok: true } : { ok: false, error: "Ton binôme vient de répondre : le défi n'est plus en attente." };
}
