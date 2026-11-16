// Version déployée, comparée par l'app ouverte pour proposer de recharger.
import { appVersion } from "@/lib/version";

export const dynamic = "force-dynamic";

export function GET(): Response {
  return Response.json({ version: appVersion() }, { headers: { "Cache-Control": "no-store" } });
}
