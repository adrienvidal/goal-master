import { redirect } from "next/navigation";
import { SubmitButton } from "@/components/LinkButton";
import { currentUser } from "@/server/session";
import { parseAllowedEmails } from "@/lib/allowlist";
import { devLoginEnabled } from "@/lib/devLogin";
import { devLogin } from "./dev-actions";
import LoginForm from "./LoginForm";

export default async function LoginPage(): Promise<React.ReactElement> {
  if (await currentUser()) redirect("/");
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <div className="device flex flex-col gap-6">
        <div className="text-center">
          <h1 className="font-display text-base text-gold">GOAL MASTER</h1>
          <p className="mt-2 text-muted">100 candidatures. Un chevalier.</p>
        </div>
        {devLoginEnabled(process.env) ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">Version de test : connexion directe, sans code.</p>
          {parseAllowedEmails(process.env.ALLOWED_EMAILS).map((email) => (
            <form key={email} action={devLogin.bind(null, email)}>
              <SubmitButton className="btn ghost !text-[10px]">{email}</SubmitButton>
            </form>
          ))}
        </div>
      ) : (
        <LoginForm />
      )}
      </div>
    </main>
  );
}
