"use server";
import { isJobFinderOrigin, newWidgetKey } from "@/lib/widgetLink";
import { db } from "@/server/db";
import { requirePlayer } from "@/server/session";

export type LinkResult = { ok: true; key: string } | { ok: false; error: string };

/** Relie job-finder au joueur connecté : nouvelle clé, la précédente est révoquée. La clé n'est renvoyée qu'ici, une fois. */
export async function linkWidget(origin: string): Promise<LinkResult> {
  const player = await requirePlayer();
  if (!isJobFinderOrigin(origin)) return { ok: false, error: "Adresse de job-finder refusée." };
  const { key, hash } = newWidgetKey();
  const now = new Date();
  await db().$transaction([
    db().widgetKey.updateMany({ where: { playerId: player.id, revokedAt: null }, data: { revokedAt: now } }),
    db().widgetKey.create({ data: { playerId: player.id, hash } }),
  ]);
  return { ok: true, key };
}
