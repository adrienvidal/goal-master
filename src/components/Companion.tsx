import { COMPANION_NAMES, type CompanionId } from "@/game/quests";
import { CHEST_GRIDS, COMPANION_GRIDS, gridRects } from "@/lib/companions";

/** Grille 8 bits en SVG net (compagnons, coffre, monstres du mode libre). */
export function Pixels({ grid, px, label, palette }: { grid: string[]; px: number; label?: string; palette?: Record<string, string> }): React.ReactElement {
  const { width, height, rects } = gridRects(grid, palette);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width * px} height={height * px} shapeRendering="crispEdges" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  );
}

/** Compagnon 8 bits : petit saut au repos, grands bonds de joie (`joy`). */
export function Companion({ id, px = 3, joy = false, locked = false, label, className = "" }: { id: CompanionId; px?: number; joy?: boolean; locked?: boolean; label?: string; className?: string }): React.ReactElement {
  return (
    <span className={["pet", joy ? "joy" : "", locked ? "locked" : "", className].filter(Boolean).join(" ")}>
      <Pixels grid={COMPANION_GRIDS[id]} px={px} label={label ?? (locked ? undefined : COMPANION_NAMES[id].name)} />
    </span>
  );
}

export function ChestSprite({ open = false, px = 5 }: { open?: boolean; px?: number }): React.ReactElement {
  return (
    <span className={open ? "chest open" : "chest shut"}>
      <Pixels grid={CHEST_GRIDS[open ? "open" : "closed"]} px={px} />
    </span>
  );
}
