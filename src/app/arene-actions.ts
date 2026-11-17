"use server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { ANSWER_WITHIN_MS, arenaDeadline, arenaState, canPlay, canProvoke, mustPass, openArena, rollValue, startEnergy, type ArenaKind } from "@/game/arena";
import { buildPlayerView } from "@/lib/playerView";
import { arenaEvents } from "@/server/arena";
import { db } from "@/server/db";
import { arenaInputs, loadGame, type GameData } from "@/server/game";
import { notify, notifyAll } from "@/server/notify";
import { requirePlayer } from "@/server/session";
import type { Player } from "@/generated/prisma/client";

export type ArenaResult = { ok: true } | { ok: false; error: string };

const KINDS: ArenaKind[] = ["ATTACK", "PARRY", "THRUST", "WHIRL", "POTION", "END"];
const SPECIAL = { KNIGHT: "THRUST", PANDA: "WHIRL" } as const;

function heroOf(p: Player, game: GameData, now: Date): { form: number; rusty: boolean } {
  const v = buildPlayerView(p, game.apps, game.nudges, null, now);
  return { form: v.levelForm, rusty: v.mood === "tired" || v.mood === "exhausted" };
}

/** Provoquer le binôme : une Arène ouverte à la fois, une provocation par jour et par personne. */
export async function provokeArena(): Promise<ArenaResult> {
  const player = await requirePlayer();
  const now = new Date();
  const game = await loadGame();
  const partner = game.players.find((p) => p.id !== player.id);
  if (!partner) return { ok: false, error: "Ton binôme ne s'est pas encore connecté." };
  const check = canProvoke(player.id, game.arenas, now);
  if (!check.ok) return { ok: false, error: check.reason === "open" ? "Un combat est déjà en cours." : "Tu as déjà ouvert une Arène aujourd'hui, reviens demain." };
  const created = await db().arena.create({ data: { challengerId: player.id, opponentId: partner.id } });
  // Deux provocations à la même seconde : la première enregistrée l'emporte.
  const fresh = await loadGame();
  const first = openArena([...fresh.arenas].sort((x, y) => x.arena.createdAt.getTime() - y.arena.createdAt.getTime()), now);
  if (first && first.arena.id !== created.id) {
    await db().arena.delete({ where: { id: created.id } });
    revalidatePath("/");
    return { ok: false, error: `${partner.pseudo} vient de te provoquer : réponds-lui.` };
  }
  const rusty = heroOf(partner, game, now).rusty;
  after(() => notify(partner.id, { kind: "arena", arenaId: created.id, from: player.pseudo, rusty }));
  revalidatePath("/");
  return { ok: true };
}

/** Entrer dans l'Arène ou passer son tour, dans les 24 h. Stats et énergie de départ figées ici. */
export async function respondArena(id: string, accept: boolean): Promise<ArenaResult> {
  const player = await requirePlayer();
  const now = new Date();
  const open = { id, opponentId: player.id, status: "PENDING" as const, createdAt: { gt: new Date(now.getTime() - ANSWER_WITHIN_MS) } };
  let data: Parameters<ReturnType<typeof db>["arena"]["updateMany"]>[0]["data"] = { status: "DECLINED" };
  if (accept) {
    const game = await loadGame();
    const row = game.arenas.find((e) => e.arena.id === id)?.arena;
    const challenger = game.players.find((p) => p.id === row?.challengerId);
    if (!row || !challenger) return { ok: false, error: "Cette provocation n'est plus ouverte." };
    const a = heroOf(challenger, game, now);
    const b = heroOf(player, game, now);
    data = {
      status: "ACCEPTED",
      acceptedAt: now,
      deadline: arenaDeadline(now),
      challengerForm: a.form,
      opponentForm: b.form,
      challengerEnergy: startEnergy(a.form, b.form, a.rusty),
      opponentEnergy: startEnergy(b.form, a.form, b.rusty),
    };
  }
  const { count } = await db().arena.updateMany({ where: open, data });
  revalidatePath("/");
  if (count === 1) return { ok: true };
  const row = await db().arena.findUnique({ where: { id }, select: { status: true, challenger: { select: { pseudo: true } } } });
  return { ok: false, error: row?.status === "CANCELLED" ? `${row.challenger.pseudo} a retiré sa provocation.` : "Cette provocation n'est plus ouverte." };
}

/** Le lanceur retire sa provocation tant qu'elle est en attente. */
export async function cancelArena(id: string): Promise<ArenaResult> {
  const player = await requirePlayer();
  const { count } = await db().arena.updateMany({ where: { id, challengerId: player.id, status: "PENDING" }, data: { status: "CANCELLED" } });
  revalidatePath("/");
  return count === 1 ? { ok: true } : { ok: false, error: "Ton binôme vient de répondre : la provocation n'est plus en attente." };
}

const REFUSED: Record<"over" | "turn" | "energy" | "potion", string> = {
  over: "Le combat est terminé.",
  turn: "Ce n'est pas ton tour.",
  energy: "Pas assez d'énergie : une candidature te donne 1 ⚡.",
  potion: "Plus de potion : une relance réussie t'en donne une.",
};

/** Jouer une action : le tour et l'énergie sont revérifiés au moment d'écrire, dans une transaction. */
export async function playArena(id: string, kind: ArenaKind): Promise<ArenaResult> {
  const player = await requirePlayer();
  if (!KINDS.includes(kind)) return { ok: false, error: "Action inconnue." };
  if ((kind === "THRUST" || kind === "WHIRL") && SPECIAL[player.character] !== kind) return { ok: false, error: "Ce n'est pas ta Botte." };
  const game = await loadGame();
  const now = new Date();
  try {
    await db().$transaction(
      async (tx) => {
        const row = await tx.arena.findUnique({ where: { id }, include: { actions: { orderBy: { createdAt: "asc" } } } });
        if (!row || (row.challengerId !== player.id && row.opponentId !== player.id)) throw new Error("over");
        const { actions, ...arena } = row;
        const state = arenaState({ arena, actions, apps: game.apps, nudges: game.nudges }, now);
        const check = canPlay(state, player.id, kind);
        if (!check.ok) throw new Error(check.reason);
        const form = (player.id === arena.challengerId ? arena.challengerForm : arena.opponentForm) ?? 1;
        const played = await tx.arenaAction.create({ data: { arenaId: id, playerId: player.id, kind, value: rollValue(kind, form), createdAt: now } });
        const next = arenaState({ arena, actions: [...actions, played], apps: game.apps, nudges: game.nudges }, now);
        if (mustPass(next, player.id)) {
          await tx.arenaAction.create({ data: { arenaId: id, playerId: player.id, kind: "END", value: 0, createdAt: new Date(now.getTime() + 1) } });
        }
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    const reason = (error as Error).message as keyof typeof REFUSED;
    revalidatePath("/arene");
    return { ok: false, error: REFUSED[reason] ?? "Ton coup n'est pas parti. Vérifie ta connexion : ton énergie n'a pas été dépensée." };
  }
  // Les notifications partent après la réponse : le coup s'affiche sans attendre le rechargement de la partie.
  after(async () => {
    const later = new Date(now.getTime() + 1);
    const fresh = await loadGame();
    const input = arenaInputs(fresh).find((i) => i.arena.id === id);
    if (!input) return;
    const s = arenaState(input, later);
    if (s.over || s.turn?.playerId !== player.id) await notifyAll(arenaEvents(input, fresh, later), later);
  });
  revalidatePath("/arene");
  revalidatePath("/");
  return { ok: true };
}
