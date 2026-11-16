type Props = { value: number; max: number; tone?: "gold" | "green"; label: string; /** Couleur pleine (couleur d'un joueur), prioritaire sur le ton. */ color?: string };

export function Bar({ value, max, tone = "gold", label, color }: Props): React.ReactElement {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const fill = color ? color : tone === "gold" ? "repeating-linear-gradient(90deg,#f2c14e 0 8px,#b9831c 8px 10px)" : "repeating-linear-gradient(90deg,#6fd49a 0 8px,#3e9f6a 8px 10px)";
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} className="relative h-4 border-[3px] border-edge bg-night">
      <i className="absolute inset-y-0 left-0 transition-[width] duration-500 ease-out" style={{ width: `${pct}%`, background: fill }} />
    </div>
  );
}
