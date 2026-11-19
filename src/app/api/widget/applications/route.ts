// Candidature passée à « envoyée » dans job-finder (cadrage encart-job-finder). Appelée par le serveur local de job-finder.
import { Prisma } from "@/generated/prisma/client";
import { intakeDecision } from "@/lib/widgetIntake";
import { createApplication, MAX_COMPANY } from "@/server/applications";
import { db } from "@/server/db";
import { loadGame } from "@/server/game";
import { json, playerForKey, stateOf, UNAUTHORIZED } from "@/server/widget";

export const dynamic = "force-dynamic";

const MAX_REF = 64;

export async function POST(req: Request): Promise<Response> {
  const player = await playerForKey(req);
  if (!player) return UNAUTHORIZED();
  const body = (await req.json().catch(() => null)) as { company?: unknown; ref?: unknown } | null;
  const company = typeof body?.company === "string" ? body.company.trim() : "";
  const ref = typeof body?.ref === "string" ? body.ref.trim() : "";
  if (company.length === 0 || company.length > MAX_COMPANY) return json({ error: "Indique le nom de l'entreprise." }, 400);
  if (ref.length === 0 || ref.length > MAX_REF) return json({ error: "Référence de l'offre manquante." }, 400);

  const game = await loadGame();
  const decision = intakeDecision({ company, ref, playerId: player.id, apps: game.apps, now: new Date() });
  let added = false;
  if (decision.kind === "attach") {
    // Déjà saisie à la main aujourd'hui : on la rattache sans la recompter ni en faire une victoire (pas de `source`).
    await db().application.update({ where: { id: decision.id }, data: { externalRef: ref } });
  } else if (decision.kind === "create") {
    try {
      await createApplication(player.id, company, game, { externalRef: ref, source: "job-finder" });
      added = true;
    } catch (e) {
      // Deux envois simultanés de la même offre : le second trouve la contrainte unique, la candidature existe déjà.
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
    }
  }
  return json({ added, attached: decision.kind === "attach", state: stateOf(await loadGame(), player, new Date()) });
}
