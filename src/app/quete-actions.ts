"use server";
// Quêtes (spec docs/specs/2026-11-18-quetes-design.md). Chaque passage d'état est une mise à jour conditionnelle :
// seul le bon joueur, depuis le bon état, peut le faire, et un double clic ne vaut qu'une fois.
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { questFormReached, type NotificationEvent } from "@/game/notifications";
import { checkCompanionName, checkLink, checkQuestText, checkWalkers, drawOffer, isCompanion, openQuest, ownedCompanions, walkersAfterAdopt, type QuestRow } from "@/game/quests";
import { formName } from "@/lib/forms";
import { db } from "@/server/db";
import { loadGame, syncAchievements } from "@/server/game";
import { notify, notifyAll } from "@/server/notify";
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
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
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

/** Le donneur valide : XP pour les deux, coffre tiré pour le destinataire. */
export async function validateQuest(id: string): Promise<QuestResult> {
  const player = await requirePlayer();
  const game = await loadGame();
  const quest = game.quests.find((q) => q.id === id && q.giverId === player.id && q.status === "DONE");
  if (!quest || !quest.doneAt) return { ok: false, error: GONE };
  // Un seul compagnon restant : le coffre le montre seul, sans choix ; aucun : XP seules, pas de coffre.
  const offer = drawOffer(quest.receiverId, game.quests);
  const now = new Date();
  const { count } = await db().quest.updateMany({
    where: { id, giverId: player.id, status: "DONE" },
    data: { status: "VALIDATED", validatedAt: now, offer },
  });
  refresh(id);
  if (count !== 1) return { ok: false, error: GONE };
  const round = quest.doneAt.getTime();
  const validated: QuestRow = { ...quest, status: "VALIDATED", validatedAt: now, offer };
  const updated = { ...game, quests: game.quests.map((q) => (q.id === id ? validated : q)) };
  await syncAchievements(updated, now);
  const items: { playerId: string; event: NotificationEvent }[] = [{ playerId: quest.receiverId, event: { kind: "quest-end", questId: id, round, validated: true, chest: offer.length > 0, partner: player.pseudo, text: quest.text } }];
  // Les XP de la quête peuvent faire changer de forme l'un ou l'autre : l'autre en est prévenu, comme pour une candidature.
  for (const who of updated.players) {
    const to = updated.players.find((p) => p.id !== who.id);
    const form = questFormReached(who.id, game.apps, game.nudges, game.quests, updated.quests);
    if (form && to) items.push({ playerId: to.id, event: { kind: "evo", partnerId: who.id, partner: who.pseudo, form, formName: formName(who.character, form) } });
    if (form) items.push({ playerId: who.id, event: { kind: "evo-me", form } });
  }
  after(() => notifyAll(items));
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
  if (count !== 1 || !quest) {
    const now = await db().quest.findUnique({ where: { id }, select: { status: true } });
    return { ok: false, error: now?.status === "VALIDATED" ? "Cette quête vient d'être validée : elle ne peut plus être annulée." : "Cette quête est déjà annulée." };
  }
  after(() => notify(quest.receiverId, { kind: "quest-cancel", questId: id, partner: player.pseudo, text: quest.text }));
  return { ok: true };
}

/** Adopter un compagnon du coffre : seulement l'un de ceux proposés, une seule fois. */
export async function adoptCompanion(questId: string, companion: string, rawName = ""): Promise<QuestResult> {
  const player = await requirePlayer();
  if (!isCompanion(companion)) return { ok: false, error: "Ce compagnon n'existe pas." };
  const named = checkCompanionName(rawName, companion);
  if (!named.ok) return named;
  const game = await loadGame();
  if (ownedCompanions(player.id, game.quests).includes(companion)) return { ok: false, error: "Ce compagnon est déjà dans ta Ménagerie : choisis-en un autre." };
  const { count } = await db().quest.updateMany({
    where: { id: questId, receiverId: player.id, status: "VALIDATED", companion: null, offer: { has: companion } },
    data: { companion, companionName: named.name },
  });
  if (count !== 1) return { ok: false, error: "Ce coffre est déjà ouvert." };
  await db().player.update({ where: { id: player.id }, data: { companion, walkers: walkersAfterAdopt(player.walkers, companion) } });
  await syncAchievements({ ...game, quests: game.quests.map((q) => (q.id === questId ? { ...q, companion } : q)) }, new Date());
  // Pas de revalidatePath("/") ici : la page du coffre se rechargerait et partirait sur l'accueil avant l'écran d'adoption.
  return { ok: true };
}

/** Renommer un de ses compagnons (vide = nom de l'espèce). */
export async function renameCompanion(companion: string, rawName: string): Promise<QuestResult> {
  const player = await requirePlayer();
  if (!isCompanion(companion)) return { ok: false, error: "Ce compagnon n'existe pas." };
  const named = checkCompanionName(rawName, companion);
  if (!named.ok) return named;
  const { count } = await db().quest.updateMany({ where: { receiverId: player.id, status: "VALIDATED", companion }, data: { companionName: named.name } });
  if (count === 0) return { ok: false, error: "Ce compagnon n'est pas encore dans ta Ménagerie." };
  revalidatePath("/");
  revalidatePath("/menagerie");
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

/** Choisir les compagnons qui se baladent dans job-finder (mode libre), 3 au plus, parmi ceux adoptés. */
export async function setWalkers(raw: unknown): Promise<QuestResult> {
  const player = await requirePlayer();
  const game = await loadGame();
  const checked = checkWalkers(raw, ownedCompanions(player.id, game.quests));
  if (!checked.ok) return checked;
  await db().player.update({ where: { id: player.id }, data: { walkers: checked.walkers } });
  revalidatePath("/menagerie");
  return { ok: true };
}
