"use server";
import { revalidatePath } from "next/cache";
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
