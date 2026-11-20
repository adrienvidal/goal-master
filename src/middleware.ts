import { NextResponse, type NextRequest } from "next/server";
import { widgetFrameAncestors } from "@/lib/localOrigin";

// L'encart s'affiche dans job-finder, sur l'ordinateur du joueur ou une de ses machines Tailscale.
export function middleware(request: NextRequest): NextResponse {
  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy", widgetFrameAncestors(request.headers.get("referer")));
  return response;
}

export const config = { matcher: "/widget" };
