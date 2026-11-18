import Link from "next/link";
import { Landscape } from "@/components/Landscape";
import { PushChannel } from "@/components/PushSetup";
import { isCategory } from "@/game/notifications";
import { LANDSCAPE_NAMES, LANDSCAPES } from "@/lib/landscapes";
import { requirePlayer } from "@/server/session";
import { setLandscape } from "./actions";
import { NotificationSettings } from "./NotificationSettings";

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
        <Link href="/intro" className="btn ghost !text-[10px]">Revoir l&apos;intro</Link>
        <section className="flex flex-col gap-3" aria-labelledby="fond">
          <h2 id="fond" className="text-xs uppercase tracking-wider text-muted">Paysage de fond</h2>
          <ul className="grid grid-cols-2 gap-2 sm:gap-3">
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
                      <span className="flex flex-wrap items-center justify-between gap-x-2 px-1">
                        <b className="text-sm leading-tight sm:text-base">{LANDSCAPE_NAMES[id]}</b>
                        {current ? <small className="font-display text-[9px] text-gold">Actuel</small> : null}
                      </span>
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
        <section id="notifications" className="flex scroll-mt-6 flex-col gap-3" aria-labelledby="notifs">
          <h2 id="notifs" className="text-xs uppercase tracking-wider text-muted">Notifications</h2>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-3">
              <p className="text-sm font-semibold">Où tu les reçois</p>
              <PushChannel />
              <div className="flex flex-col gap-2.5 border-[3px] border-stone-2 bg-night p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <b className="font-semibold">Par e-mail</b>
                  <span className="border-2 border-current px-2 py-1 font-display text-[10px] leading-none text-[var(--ok)]">CHAQUE SOIR</span>
                </div>
                <span className="num break-all text-lg">{player.email}</span>
                <p className="text-sm text-muted">Un bilan par jour, à 18 h, regroupe tes notifications de la journée. Pas d&apos;e-mail les jours sans nouvelle.</p>
              </div>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-sm font-semibold">Ce que tu reçois</p>
              <NotificationSettings muted={player.mutedCategories.filter(isCategory)} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
