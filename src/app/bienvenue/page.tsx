import { redirect } from "next/navigation";
import { parisDay } from "@/game/calendar";
import { defaultDeadline } from "@/lib/onboarding";
import { db } from "@/server/db";
import { requireUser } from "@/server/session";
import { partnerDeadline } from "@/server/sharedGoal";
import OnboardingForm from "./OnboardingForm";

export default async function WelcomePage(): Promise<React.ReactElement> {
  const user = await requireUser();
  const players = await db().player.findMany({ select: { id: true, pseudo: true, color: true } });
  if (players.some((p) => p.id === user.id)) redirect("/");
  const partner = players.find((p) => p.id !== user.id) ?? null;
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <p className="h-title mb-6 text-gold">Bienvenue dans la quête</p>
      <OnboardingForm
        takenColor={partner?.color ?? null}
        partnerName={partner?.pseudo ?? null}
        defaultDeadline={defaultDeadline(parisDay(new Date()))}
        minDeadline={parisDay(new Date())}
        sharedDeadline={await partnerDeadline(user.id)}
      />
    </main>
  );
}
