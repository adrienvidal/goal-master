import { cookies } from "next/headers";
import { INTRO_COOKIE, introStart, introStepsSeen } from "@/lib/intro";
import { requireUser } from "@/server/session";
import Intro from "./Intro";

export default async function IntroPage(): Promise<React.ReactElement> {
  await requireUser();
  const seen = introStepsSeen((await cookies()).get(INTRO_COOKIE)?.value);
  return <Intro start={introStart(seen)} />;
}
