import type { Metadata } from "next";
import { WidgetView } from "./WidgetView";

// Encart affiché dans job-finder (maquette encart-job-finder, écran 1). Pas de session : la clé arrive par postMessage.
export const metadata: Metadata = { title: "Goal Master · encart" };

export default function WidgetPage(): React.ReactElement {
  return <WidgetView />;
}
