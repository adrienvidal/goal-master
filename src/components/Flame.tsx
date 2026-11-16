const ROWS = ["...X...", "..XX...", "..XXX.X", ".XXXXXX", "XXX.XXX", "XX...XX", "XX...XX", ".XX.XX.", "..XXX.."];

export function Flame(): React.ReactElement {
  return (
    <svg viewBox="0 0 7 9" width={14} height={18} fill="currentColor" shapeRendering="crispEdges" aria-hidden="true">
      {ROWS.flatMap((row, y) => [...row].map((c, x) => (c === "X" ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} /> : null)))}
    </svg>
  );
}
