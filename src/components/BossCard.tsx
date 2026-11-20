import { BOSSES, fightersMeFirst, isUrgent, type Duel } from "@/game/duel";
import { BossSprite } from "./BossSprite";

function countdown(at: Date, now: Date): string {
  const minutes = Math.max(0, Math.floor((at.getTime() - now.getTime()) / 60000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days >= 1) return `dans ${days} j ${hours} h`;
  if (hours >= 1) return `dans ${hours} h ${minutes % 60} min`;
  return `dans ${minutes} min`;
}

function coups(n: number): string {
  return `${n} coup${n > 1 ? "s" : ""}`;
}

function DuelStatus({ duel, now, ko, urgent }: { duel: Duel; now: Date; ko: boolean; urgent: boolean }): React.ReactElement {
  if (ko) return <span>Victoire vendredi 18 h</span>;
  if (urgent) return <span className="text-danger">Duel {countdown(duel.at, now)} · il manque {coups(duel.hp - duel.hits - duel.bonus)}</span>;
  return <span>Duel vendredi 18 h · {countdown(duel.at, now)}</span>;
}

// Bloc du boss de la semaine sur l'accueil : points de vie restants, compte à rebours, coups de chacun.
export function BossCard({ duel, names, meId, wounded, now }: { duel: Duel; names: Record<string, string>; meId: string; wounded: boolean; now: Date }): React.ReactElement {
  const left = Math.max(0, duel.hp - duel.hits);
  const ko = left === 0;
  const urgent = isUrgent(duel, now);
  return (
    <div className={`boss-card ${ko ? "ko" : ""} ${urgent && !ko ? "urgent" : ""}`} role="group" aria-label={`Boss de la semaine : ${BOSSES[duel.boss]}`}>
      <span className="portrait"><BossSprite boss={duel.boss} px={3} /></span>
      <span className={`font-display text-[10px] leading-relaxed ${ko ? "text-[var(--ok)]" : "text-[#c9b8ff]"}`}>{ko ? "K.O. !" : BOSSES[duel.boss]}</span>
      <div className="hp" role="img" aria-label={`${left} points de vie sur ${duel.hp}`}>
        <i style={{ width: `${(left / duel.hp) * 100}%` }} />
      </div>
      <p className="flex flex-wrap justify-between gap-x-3 text-sm text-muted">
        <span className="num">{left} / {duel.hp} PV</span>
        <DuelStatus duel={duel} now={now} ko={ko} urgent={urgent} />
      </p>
      <p className="col-span-2 flex flex-wrap justify-between gap-x-3 gap-y-1 text-sm text-muted">
        {fightersMeFirst(duel.fighters, meId).map((f) => (
          <span key={f.playerId}>{names[f.playerId] ?? "?"} : {coups(f.hits)}</span>
        ))}
        {duel.bonus > 0 ? <span>Coup de grâce au duel : +{duel.bonus}</span> : null}
        {wounded && !ko ? <span className="basis-full text-ember">Battez-le pour retirer vos bandages.</span> : null}
      </p>
    </div>
  );
}
