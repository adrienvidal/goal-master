"use server";
import { revalidatePath } from "next/cache";
import { isCategory } from "@/game/notifications";
import { isLandscape } from "@/lib/landscapes";
import { db } from "@/server/db";
import { requirePlayer } from "@/server/session";

/** Fond d'écran personnel : chacun choisit le sien, l'autre n'est pas concerné. */
export async function setLandscape(landscape: string): Promise<void> {
  const player = await requirePlayer();
  if (!isLandscape(landscape)) return;
  await db().player.update({ where: { id: player.id }, data: { landscape } });
  revalidatePath("/", "layout");
}

/** Coupe ou rétablit une catégorie de notifications, sur les deux canaux (push et bilan du jour). */
export async function setCategoryMuted(category: string, muted: boolean): Promise<void> {
  const player = await requirePlayer();
  if (!isCategory(category)) return;
  const current = (await db().player.findUnique({ where: { id: player.id }, select: { mutedCategories: true } }))?.mutedCategories ?? [];
  const next = muted ? [...new Set([...current, category])] : current.filter((c) => c !== category);
  await db().player.update({ where: { id: player.id }, data: { mutedCategories: next } });
  revalidatePath("/reglages");
}

/** Coupe le lien avec job-finder : la clé est révoquée, les candidatures déjà comptées restent. */
export async function unlinkWidget(): Promise<void> {
  const player = await requirePlayer();
  await db().widgetKey.updateMany({ where: { playerId: player.id, revokedAt: null }, data: { revokedAt: new Date() } });
  revalidatePath("/reglages");
}
