// Scène 8 bits d'un e-mail : sprites décrits par des jetons validés (public : personnage, couleur, forme seulement).
import { parseScene, scenePng } from "@/lib/emailArt";

export function GET(request: Request): Response {
  const actors = parseScene(new URL(request.url).searchParams.get("s"));
  if (!actors) return new Response("Scène invalide", { status: 400 });
  return new Response(new Uint8Array(scenePng(actors)), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" } });
}
