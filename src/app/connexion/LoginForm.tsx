"use client";
import { useState } from "react";
import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

const client = createAuthClient({ plugins: [emailOTPClient()] });

type AuthError = { status: number; code?: string; message?: string };

function errorMessage(error: AuthError): string {
  if (error.code === "NOT_ALLOWED") return error.message ?? "Cette adresse n'a pas accès à Goal Master.";
  if (error.status === 429) return "Trop d'essais. Patiente une minute puis recommence.";
  if (error.code === "TOO_MANY_ATTEMPTS") return "Trop d'essais pour ce code. Demande un nouveau code.";
  return "Code incorrect ou expiré. Vérifie-le, ou demande un nouveau code.";
}

// Deux temps : l'adresse, puis le code reçu par e-mail (cadrage §4.1).
export default function LoginForm(): React.ReactElement {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function requestCode(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setPending(true);
    setError("");
    const { error } = await client.emailOtp.sendVerificationOtp({ email: email.trim().toLowerCase(), type: "sign-in" });
    setPending(false);
    if (error) {
      setError(errorMessage(error));
      return;
    }
    setStep("code");
  }

  async function signIn(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setPending(true);
    setError("");
    const { error } = await client.signIn.emailOtp({ email: email.trim().toLowerCase(), otp: code.replace(/\s/g, "") });
    if (error) {
      setPending(false);
      setError(errorMessage(error));
      return;
    }
    location.href = "/";
  }

  if (step === "email") {
    return (
      <form className="device flex flex-col gap-4" onSubmit={requestCode}>
        <label htmlFor="email" className="text-sm text-muted">Ton email</label>
        <input id="email" className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        {error ? <p className="err">{error}</p> : null}
        <button type="submit" className="btn" disabled={pending}>Recevoir mon code</button>
      </form>
    );
  }
  return (
    <form className="device flex flex-col gap-4" onSubmit={signIn}>
      <p className="h-title">Vérifie ta boîte mail</p>
      <p className="text-muted">Code envoyé à {email}. Il reste valable 10 minutes.</p>
      <label htmlFor="code" className="text-sm text-muted">Code à 6 chiffres</label>
      <input id="code" className="input num tracking-[0.4em]" inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value)} />
      {error ? <p className="err">{error}</p> : null}
      <button type="submit" className="btn" disabled={pending}>Entrer</button>
      <button type="button" className="text-sm text-muted underline" onClick={() => { setStep("email"); setCode(""); setError(""); }}>
        Changer d&apos;adresse ou renvoyer un code
      </button>
    </form>
  );
}
