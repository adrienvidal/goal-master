// Quêtes et compagnons (spec docs/specs/2026-11-18-quetes-design.md). Tout est pur : la quête, l'offre du
// coffre et le compagnon adopté sont stockés ; la collection et les XP se déduisent des quêtes validées.

export const XP_QUEST_DONE = 20;
export const XP_QUEST_GIVEN = 5;
export const QUEST_TEXT_MAX = 120;
export const CHEST_OFFER_SIZE = 3;
export const COMPANION_NAME_MAX = 16;
export const COMPANION_IDS = ["cat", "dog", "fox", "owl", "rabbit", "dragon"] as const;
export type CompanionId = (typeof COMPANION_IDS)[number];
/** Nom affiché, avec son article défini (« le renard »). */
export const COMPANION_NAMES: Record<CompanionId, { name: string; the: string }> = {
  cat: { name: "Chat", the: "le chat" },
  dog: { name: "Chien", the: "le chien" },
  fox: { name: "Renard", the: "le renard" },
  owl: { name: "Hibou", the: "le hibou" },
  rabbit: { name: "Lapin", the: "le lapin" },
  dragon: { name: "Petit dragon", the: "le petit dragon" },
};

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
  companionName: string | null;
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

/** Ce que le coffre propose encore : son offre, moins les compagnons adoptés depuis dans un autre coffre. */
export function chestChoices(chest: QuestRow, owned: readonly string[]): CompanionId[] {
  return chest.offer.filter((c): c is CompanionId => isCompanion(c) && !owned.includes(c));
}

/** Le coffre à ouvrir avant l'accueil : le plus ancien validé, pas encore ouvert, qui a encore un compagnon à offrir. */
export function pendingChest(playerId: string, quests: QuestRow[]): QuestRow | null {
  const owned = ownedCompanions(playerId, quests);
  return validatedFor(playerId, quests).find((q) => q.companion === null && chestChoices(q, owned).length > 0) ?? null;
}

/**
 * Tirage du coffre : jusqu'à 3 compagnons pas encore possédés, en évitant d'abord ceux déjà proposés dans un coffre
 * pas encore ouvert ; s'il n'en reste pas assez, on complète avec ceux-là (le coffre ne reste jamais vide à tort).
 */
export function drawOffer(playerId: string, quests: QuestRow[], random: () => number = Math.random): CompanionId[] {
  const owned = new Set<string>(ownedCompanions(playerId, quests));
  const pending = new Set<string>();
  for (const q of validatedFor(playerId, quests)) if (q.companion === null) q.offer.forEach((c) => pending.add(c));
  const offer: CompanionId[] = [];
  for (const pool of [COMPANION_IDS.filter((c) => !owned.has(c) && !pending.has(c)), COMPANION_IDS.filter((c) => !owned.has(c) && pending.has(c))]) {
    while (offer.length < CHEST_OFFER_SIZE && pool.length > 0) offer.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  }
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

/** Nom choisi pour un compagnon : vide ou identique à l'espèce = pas de nom propre (null). */
export function checkCompanionName(raw: unknown, id: CompanionId): { ok: true; name: string | null } | { ok: false; error: string } {
  const name = typeof raw === "string" ? raw.trim() : "";
  if (name.length > COMPANION_NAME_MAX) return { ok: false, error: `${COMPANION_NAME_MAX} caractères au plus.` };
  return { ok: true, name: name && name !== COMPANION_NAMES[id].name ? name : null };
}

/** Nom affiché d'un compagnon du joueur : celui qu'il lui a donné, sinon l'espèce. */
export function companionLabel(playerId: string, id: CompanionId, quests: QuestRow[]): string {
  const q = validatedFor(playerId, quests).find((x) => x.companion === id);
  return q?.companionName ?? COMPANION_NAMES[id].name;
}

export function questsGivenValidated(playerId: string, quests: QuestRow[]): number {
  return quests.filter((q) => q.giverId === playerId && q.status === "VALIDATED").length;
}
