import { requirePlayer } from "@/server/session";

// Accueil provisoire : l'écran complet arrive au lot 3.
export default async function HomePage(): Promise<React.ReactElement> {
  const player = await requirePlayer();
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <div className="device">
        <p className="h-title text-gold">Salut {player.pseudo} !</p>
        <p className="mt-2 text-muted">Ton aventure commence. L&apos;écran de quête arrive bientôt.</p>
      </div>
    </main>
  );
}
