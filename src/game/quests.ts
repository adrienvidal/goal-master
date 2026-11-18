// Quêtes et compagnons (spec docs/specs/2026-11-18-quetes-design.md). Tout est pur : la quête, l'offre du
// coffre et le compagnon adopté sont stockés ; la collection et les XP se déduisent des quêtes validées.

export const XP_QUEST_DONE = 20;
export const XP_QUEST_GIVEN = 5;
export const QUEST_TEXT_MAX = 120;
export const CHEST_OFFER_SIZE = 3;
export const COMPANION_IDS = ["cat", "dog", "fox", "owl", "rabbit", "dragon"] as const;
export type CompanionId = (typeof COMPANION_IDS)[number];

export type QuestStatus = "OPEN" | "DONE" | "VALIDATED" | "CANCELLED";
export type QuestRow = {
  id: string;
  giverId: string;
  receiverId: string;
  text: string;
  link: string | null;
  status: QuestStatus;
  offer: string[];
  companion: string | null;
  createdAt: Date;
  doneAt: Date | null;
  validatedAt: Date | null;
  closedAt: Date | null;
};

export function isCompanion(value: string): value is CompanionId {
  return (COMPANION_IDS as readonly string[]).includes(value);
}

const isRunning = (q: QuestRow) => q.status === "OPEN" || q.status === "DONE";

/** La quête en cours de `giverId` vers `receiverId` : une seule par sens. */
export function openQuest(giverId: string, receiverId: string, quests: QuestRow[]): QuestRow | null {
  const mine = quests.filter((q) => q.giverId === giverId && q.receiverId === receiverId && isRunning(q));
  return mine.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;
}

export function checkQuestText(raw: string): { ok: true; text: string } | { ok: false; error: string } {
  const text = raw.trim();
  if (!text) return { ok: false, error: "Écris la quête avant de la lancer." };
  if (text.length > QUEST_TEXT_MAX) return { ok: false, error: `${QUEST_TEXT_MAX} caractères au plus : raccourcis un peu.` };
  return { ok: true, text };
}

/** Lien de preuve facultatif : http ou https seulement, jamais `javascript:`. */
export function checkLink(raw: string): { ok: true; link: string | null } | { ok: false; error: string } {
  const value = raw.trim();
  if (!value) return { ok: true, link: null };
  const error = "Ce lien n'est pas une adresse web. Il doit commencer par https://";
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? { ok: true, link: value } : { ok: false, error };
  } catch {
    return { ok: false, error };
  }
}

const byValidation = (a: QuestRow, b: QuestRow) => (a.validatedAt?.getTime() ?? 0) - (b.validatedAt?.getTime() ?? 0);

function validatedFor(playerId: string, quests: QuestRow[]): QuestRow[] {
  return quests.filter((q) => q.receiverId === playerId && q.status === "VALIDATED").sort(byValidation);
}

/** Compagnons adoptés, dans l'ordre des validations. */
export function ownedCompanions(playerId: string, quests: QuestRow[]): CompanionId[] {
  return validatedFor(playerId, quests)
    .map((q) => q.companion)
    .filter((c): c is CompanionId => c !== null && isCompanion(c));
}

/** Le coffre à ouvrir avant l'accueil : le plus ancien validé dont aucun compagnon n'est encore adopté. */
export function pendingChest(playerId: string, quests: QuestRow[]): QuestRow | null {
  return validatedFor(playerId, quests).find((q) => q.offer.length > 0 && q.companion === null) ?? null;
}

/** Tirage du coffre : jusqu'à 3 compagnons ni possédés, ni déjà proposés dans un coffre pas encore ouvert. */
export function drawOffer(playerId: string, quests: QuestRow[], random: () => number = Math.random): CompanionId[] {
  const taken = new Set<string>(ownedCompanions(playerId, quests));
  for (const q of validatedFor(playerId, quests)) if (q.companion === null) q.offer.forEach((c) => taken.add(c));
  const pool = COMPANION_IDS.filter((c) => !taken.has(c));
  const offer: CompanionId[] = [];
  while (offer.length < CHEST_OFFER_SIZE && pool.length > 0) offer.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  return offer;
}

/** XP des quêtes validées (jusqu'à `at` si donné) : 20 pour celui qui l'a faite, 5 pour celui qui l'a donnée. */
export function questXp(playerId: string, quests: QuestRow[], at?: Date): number {
  let xp = 0;
  for (const q of quests) {
    if (q.status !== "VALIDATED" || !q.validatedAt || (at && q.validatedAt > at)) continue;
    if (q.receiverId === playerId) xp += XP_QUEST_DONE;
    if (q.giverId === playerId) xp += XP_QUEST_GIVEN;
  }
  return xp;
}

export function questsGivenValidated(playerId: string, quests: QuestRow[]): number {
  return quests.filter((q) => q.giverId === playerId && q.status === "VALIDATED").length;
}
