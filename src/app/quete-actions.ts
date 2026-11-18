"use server";
// Quêtes (spec docs/specs/2026-11-18-quetes-design.md). Chaque passage d'état est une mise à jour conditionnelle :
// seul le bon joueur, depuis le bon état, peut le faire, et un double clic ne vaut qu'une fois.
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { checkLink, checkQuestText, drawOffer, isCompanion, openQuest, ownedCompanions } from "@/game/quests";
import { db } from "@/server/db";
import { loadGame } from "@/server/game";
import { notify } from "@/server/notify";
import { requirePlayer } from "@/server/session";

export type QuestResult = { ok: true; id?: string } | { ok: false; error: string };

const GONE = "Cette quête a changé entre-temps : recharge la page.";

function refresh(id?: string): void {
  revalidatePath("/");
  if (id) revalidatePath(`/quete/${id}`);
}

/** Lance une quête au binôme : une seule en cours dans chaque sens. */
export async function launchQuest(raw: string): Promise<QuestResult> {
  const player = await requirePlayer();
  const checked = checkQuestText(raw);
  if (!checked.ok) return checked;
  const game = await loadGame();
  const partner = game.players.find((p) => p.id !== player.id);
  if (!partner) return { ok: false, error: "Ton binôme ne s'est pas encore connecté." };
  if (openQuest(player.id, partner.id, game.quests)) return { ok: false, error: `${partner.pseudo} a déjà une quête de ta part. Attends qu'elle soit validée ou annule-la.` };
  const created = await db().quest.create({ data: { giverId: player.id, receiverId: partner.id, text: checked.text } });
  // Deux lancements à la même seconde : le premier enregistré l'emporte.
  const first = await db().quest.findFirst({
    where: { giverId: player.id, receiverId: partner.id, status: { in: ["OPEN", "DONE"] } },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (first && first.id !== created.id) {
    await db().quest.delete({ where: { id: created.id } });
    return { ok: false, error: `${partner.pseudo} a déjà une quête de ta part.` };
  }
  after(() => notify(partner.id, { kind: "quest", questId: created.id, from: player.pseudo, text: checked.text }));
  refresh();
  return { ok: true, id: created.id };
}

/** Le destinataire la marque faite, avec un lien de preuve facultatif. */
export async function markQuestDone(id: string, rawLink: string): Promise<QuestResult> {
  const player = await requirePlayer();
  const link = checkLink(rawLink);
  if (!link.ok) return link;
  const now = new Date();
  const { count } = await db().quest.updateMany({ where: { id, receiverId: player.id, status: "OPEN" }, data: { status: "DONE", doneAt: now, link: link.link } });
  refresh(id);
  if (count !== 1) return { ok: false, error: GONE };
  const quest = await db().quest.findUniqueOrThrow({ where: { id }, select: { giverId: true, text: true } });
  after(() => notify(quest.giverId, { kind: "quest-done", questId: id, round: now.getTime(), from: player.pseudo, text: quest.text }));
  return { ok: true };
}

/** Le donneur valide : XP pour les deux, coffre tiré pour le destinataire (compagnon donné d'office s'il n'en reste qu'un). */
export async function validateQuest(id: string): Promise<QuestResult> {
  const player = await requirePlayer();
  const game = await loadGame();
  const quest = game.quests.find((q) => q.id === id && q.giverId === player.id && q.status === "DONE");
  if (!quest || !quest.doneAt) return { ok: false, error: GONE };
  const offer = drawOffer(quest.receiverId, game.quests);
  const companion = offer.length === 1 ? offer[0] : null;
  const { count } = await db().quest.updateMany({
    where: { id, giverId: player.id, status: "DONE" },
    data: { status: "VALIDATED", validatedAt: new Date(), offer, companion },
  });
  refresh(id);
  if (count !== 1) return { ok: false, error: GONE };
  if (companion) await db().player.updateMany({ where: { id: quest.receiverId, companion: null }, data: { companion } });
  const round = quest.doneAt.getTime();
  after(() => notify(quest.receiverId, { kind: "quest-end", questId: id, round, validated: true, partner: player.pseudo, text: quest.text }));
  return { ok: true };
}

/** « Pas encore » : la quête revient au destinataire, son lien reste visible. */
export async function refuseQuest(id: string): Promise<QuestResult> {
  const player = await requirePlayer();
  const quest = await db().quest.findFirst({ where: { id, giverId: player.id, status: "DONE" }, select: { receiverId: true, text: true, doneAt: true } });
  if (!quest?.doneAt) return { ok: false, error: GONE };
  const { count } = await db().quest.updateMany({ where: { id, giverId: player.id, status: "DONE" }, data: { status: "OPEN" } });
  refresh(id);
  if (count !== 1) return { ok: false, error: GONE };
  const round = quest.doneAt.getTime();
  after(() => notify(quest.receiverId, { kind: "quest-end", questId: id, round, validated: false, partner: player.pseudo, text: quest.text }));
  return { ok: true };
}

/** Le donneur retire sa quête tant qu'elle n'est pas validée. */
export async function cancelQuest(id: string): Promise<QuestResult> {
  const player = await requirePlayer();
  const quest = await db().quest.findFirst({ where: { id, giverId: player.id }, select: { receiverId: true, text: true } });
  const { count } = await db().quest.updateMany({ where: { id, giverId: player.id, status: { in: ["OPEN", "DONE"] } }, data: { status: "CANCELLED", closedAt: new Date() } });
  refresh(id);
  if (count !== 1 || !quest) return { ok: false, error: "Cette quête vient d'être validée : elle ne peut plus être annulée." };
  after(() => notify(quest.receiverId, { kind: "quest-cancel", questId: id, partner: player.pseudo, text: quest.text }));
  return { ok: true };
}

/** Adopter un compagnon du coffre : seulement l'un de ceux proposés, une seule fois. */
export async function adoptCompanion(questId: string, companion: string): Promise<QuestResult> {
  const player = await requirePlayer();
  if (!isCompanion(companion)) return { ok: false, error: "Ce compagnon n'existe pas." };
  const { count } = await db().quest.updateMany({
    where: { id: questId, receiverId: player.id, status: "VALIDATED", companion: null, offer: { has: companion } },
    data: { companion },
  });
  if (count !== 1) return { ok: false, error: "Ce coffre est déjà ouvert." };
  await db().player.update({ where: { id: player.id }, data: { companion } });
  revalidatePath("/");
  return { ok: true };
}

/** Changer le compagnon affiché, parmi ceux adoptés. */
export async function showCompanion(companion: string): Promise<QuestResult> {
  const player = await requirePlayer();
  const game = await loadGame();
  if (!isCompanion(companion) || !ownedCompanions(player.id, game.quests).includes(companion)) return { ok: false, error: "Ce compagnon n'est pas encore dans ta Ménagerie." };
  await db().player.update({ where: { id: player.id }, data: { companion } });
  revalidatePath("/");
  revalidatePath("/menagerie");
  return { ok: true };
}
