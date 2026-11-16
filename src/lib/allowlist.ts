/** Adresses autorisées, séparées par des virgules dans ALLOWED_EMAILS. */
export function parseAllowedEmails(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedEmail(email: unknown, allowed: string[]): boolean {
  return typeof email === "string" && allowed.includes(email.trim().toLowerCase());
}

export const NOT_ALLOWED_MESSAGE = "Cette adresse n'a pas accès à Goal Master.";
