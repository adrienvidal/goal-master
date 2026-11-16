import { redirect } from "next/navigation";
import { currentUser } from "@/server/session";
import LoginForm from "./LoginForm";

export default async function LoginPage(): Promise<React.ReactElement> {
  if (await currentUser()) redirect("/");
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <p className="font-display text-base text-gold">GOAL MASTER</p>
        <p className="mt-2 text-muted">100 candidatures. Un chevalier.</p>
      </div>
      <LoginForm />
    </main>
  );
}
