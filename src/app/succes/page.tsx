import { LinkButton } from "@/components/LinkButton";
import { ACHIEVEMENTS, type AchievementId } from "@/game/achievements";
import { db } from "@/server/db";
import { requirePlayer } from "@/server/session";

const BADGE: Record<AchievementId, string> = {
  first_step: "1", on_the_way: "10", quarter: "25", halfway: "50", centurion: "100",
  warm_up: "3j", week_on_fire: "7j", machine: "30j", mission: "★", duo: "⚔", coach: "5", phoenix: "🔥", revenant: "↑", first_boss: "☠", duelist: "♛", unbeaten: "3♛", gladiator: "⛨", masterstroke: "✦", tamer: "3🐾", mentor: "3📜",
};

// Grille des succès : débloqués en couleur avec leur date, les autres verrouillés avec leur condition (cadrage §6.5).
export default async function AchievementsPage(): Promise<React.ReactElement> {
  const player = await requirePlayer();
  const rows = await db().unlockedAchievement.findMany({ where: { playerId: player.id } });
  const unlocked = new Map(rows.map((r) => [r.code, r.unlockedAt]));
  const ids = Object.keys(ACHIEVEMENTS) as AchievementId[];
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 md:py-10">
      <div className="device flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="h-title">Mes succès</h1>
            <span className="num text-gold">{unlocked.size} / {ids.length} débloqués</span>
          </div>
          <LinkButton href="/" className="btn ghost !w-auto px-4 !text-[10px]">Retour</LinkButton>
        </div>
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-2.5">
          {ids.map((id) => {
            const at = unlocked.get(id);
            return (
              <li key={id} className={`flex flex-col items-center gap-1.5 border-[3px] bg-night px-2 py-3 text-center ${at ? "border-gold" : "border-stone-2 opacity-60"}`}>
                <span className={`grid size-12 place-items-center font-display text-[11px] ${at ? "bg-gold text-[#1a1626]" : "bg-stone-2 text-muted"}`} aria-hidden="true">
                  {at ? BADGE[id] : "?"}
                </span>
                <b className="text-sm leading-tight">{ACHIEVEMENTS[id].title}</b>
                <small className="text-xs text-muted">
                  {at ? `Obtenu le ${at.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "Europe/Paris" })}` : ACHIEVEMENTS[id].condition}
                </small>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
