// Bandeau 8 bits des e-mails (public : aucune donnée personnelle), mis en cache un an.
import { headerPng } from "@/lib/emailArt";

let cached: Buffer | null = null;

export function GET(): Response {
  cached ??= headerPng();
  return new Response(new Uint8Array(cached), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" } });
}
