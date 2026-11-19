import type { Metadata } from "next";
import { parseWidgetMode } from "@/lib/widgetMode";
import { WidgetView } from "./WidgetView";

// Encart affiché dans job-finder (maquette encart-modes). Pas de session : la clé arrive par postMessage.
// Le mode (normal, small, free) vient de l'adresse : job-finder recharge l'iframe quand il change.
export const metadata: Metadata = { title: "Goal Master · encart" };

export default async function WidgetPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<React.ReactElement> {
  const { mode } = await searchParams;
  return <WidgetView mode={parseWidgetMode(mode)} />;
}
