import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/server/auth";

// Le gestionnaire se crée à la requête (auth() lit la base et le secret), pas au build
export async function GET(request: Request): Promise<Response> {
  return toNextJsHandler(auth()).GET(request);
}

export async function POST(request: Request): Promise<Response> {
  return toNextJsHandler(auth()).POST(request);
}
