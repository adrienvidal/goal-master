import { Companion } from "@/components/Companion";
import { Dots } from "@/components/LinkButton";

// Écran affiché dès le clic, le temps que la page suivante arrive (Next.js : loading.tsx).
export default function Loading(): React.ReactElement {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <Companion id="fox" px={4} joy label="Chargement" />
        <p className="flex items-center gap-2 font-display text-[11px] text-muted">
          Chargement <Dots />
        </p>
      </div>
    </main>
  );
}
