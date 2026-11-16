import Link from "next/link";
import { Landscape } from "@/components/Landscape";
import { LANDSCAPE_NAMES, LANDSCAPES } from "@/lib/landscapes";
import { requirePlayer } from "@/server/session";
import { setLandscape } from "./actions";

// Réglages : pour l'instant, le paysage de fond de l'app (propre à chaque joueur).
export default async function SettingsPage(): Promise<React.ReactElement> {
  const player = await requirePlayer();
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 md:py-10">
      <div className="device flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="h-title">Réglages</h1>
          <Link href="/" className="btn ghost !w-auto px-4 !text-[10px]">Retour</Link>
        </div>
        <section className="flex flex-col gap-3" aria-labelledby="fond">
          <h2 id="fond" className="text-xs uppercase tracking-wider text-muted">Paysage de fond</h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {LANDSCAPES.map((id) => {
              const current = player.landscape === id;
              return (
                <li key={id}>
                  <form action={setLandscape.bind(null, id)}>
                    <button
                      type="submit"
                      aria-pressed={current}
                      className={`flex w-full flex-col gap-2 border-[3px] bg-night p-2 text-left ${current ? "border-gold" : "border-edge"}`}
                    >
                      <Landscape id={id} label />
                      <span className="flex items-center justify-between gap-2 px-1">
                        <b>{LANDSCAPE_NAMES[id]}</b>
                        {current ? <small className="font-display text-[9px] text-gold">Actuel</small> : null}
                      </span>
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </main>
  );
}
