// Connexion par code reçu par e-mail (Better Auth, greffon emailOTP), comme viloris-studio. Seules les
// adresses de ALLOWED_EMAILS reçoivent un code ; les autres reçoivent « Cette adresse n'a pas accès »
// (cadrage §4.1 : vous n'êtes que deux, rien à cacher). Créée à la première requête : le build n'exige ni
// base ni secret.
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
import { after } from "next/server";
import { isAllowedEmail, NOT_ALLOWED_MESSAGE, parseAllowedEmails } from "@/lib/allowlist";
import { db } from "./db";
import { loginCodeMail, sendMail } from "./mail";

const THIRTY_DAYS = 60 * 60 * 24 * 30;
const GUARDED_PATHS = ["/email-otp/send-verification-otp", "/sign-in/email-otp"];

// Aperçus Vercel : leur adresse n'est pas celle de la production, il faut l'autoriser explicitement
function trustedOrigins(): string[] {
  return [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]
    .filter(Boolean)
    .map((host) => `https://${host}`);
}

function create() {
  return betterAuth({
    database: prismaAdapter(db(), { provider: "postgresql" }),
    session: { expiresIn: THIRTY_DAYS, updateAge: 60 * 60 * 24 },
    trustedOrigins: trustedOrigins(),
    rateLimit: { enabled: true, storage: "database", window: 60, max: 20 },
    advanced: {
      ipAddress: { ipAddressHeaders: ["x-real-ip", "x-forwarded-for"] },
      backgroundTasks: { handler: (promise) => after(promise) },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (!GUARDED_PATHS.includes(ctx.path)) return;
        if (!isAllowedEmail(ctx.body?.email, parseAllowedEmails(process.env.ALLOWED_EMAILS))) {
          throw new APIError("FORBIDDEN", { message: NOT_ALLOWED_MESSAGE, code: "NOT_ALLOWED" });
        }
      }),
    },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 600,
        allowedAttempts: 3,
        storeOTP: "hashed",
        async sendVerificationOTP({ email, otp, type }) {
          if (type !== "sign-in") return;
          await sendMail(loginCodeMail(email, otp)).catch((e: unknown) => console.error(`[connexion] code non envoyé à ${email} :`, e));
        },
      }),
      nextCookies(),
    ],
  });
}

type Auth = ReturnType<typeof create>;
const store = globalThis as unknown as { auth?: Auth };

export function auth(): Auth {
  store.auth ??= create();
  return store.auth;
}
