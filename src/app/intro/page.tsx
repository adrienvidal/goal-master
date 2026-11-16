import { requireUser } from "@/server/session";
import Intro from "./Intro";

export default async function IntroPage(): Promise<React.ReactElement> {
  await requireUser();
  return <Intro />;
}
