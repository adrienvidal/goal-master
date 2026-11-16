import { BOSSES, type BossIndex } from "@/game/duel";
import { bossSprite } from "@/lib/bosses";

export function BossSprite({ boss, px = 3, className = "" }: { boss: BossIndex; px?: number; className?: string }): React.ReactElement {
  const s = bossSprite(boss);
  return (
    <svg viewBox={`0 0 ${s.width} ${s.height}`} width={s.width * px} height={s.height * px} shapeRendering="crispEdges" role="img" aria-label={BOSSES[boss]} className={`boss-sprite ${className}`}>
      {s.rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={1} height={1} fill={r.fill} />
      ))}
    </svg>
  );
}
