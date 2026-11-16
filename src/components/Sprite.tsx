import type { Mood } from "@/game/avatar";
import type { Form } from "@/game/levels";
import type { CharacterId, ColorId } from "@/lib/onboarding";
import { sprite, type Pose } from "@/lib/sprites";

type Props = {
  character: CharacterId;
  color: ColorId;
  form: Form;
  mood?: Mood;
  pose?: Pose;
  /** Taille d'un pixel du sprite, en pixels écran. */
  px?: number;
  label?: string;
  className?: string;
  /** Blessé après un duel perdu : bandeau et teinte pâle, purement visuel. */
  hurt?: boolean;
  /** Gagnant d'un défi : couronne sur la tête jusqu'à la fin du lendemain (spec defi). */
  crown?: boolean;
};

// Avatar 8 bits : la taille suit la forme (le bébé est minuscule, le légendaire remplit la carte).
export function Sprite({ character, color, form, mood = "normal", pose = "rest", px = 4, label, className = "", hurt = false, crown = false }: Props): React.ReactElement {
  const s = sprite(character, color, form, mood, pose, crown);
  const k = px * s.scale;
  const classes = ["sprite", pose === "rest" ? "idle" : `pose-${pose}`, mood !== "normal" ? `mood-${mood}` : "", form === 6 && mood === "normal" ? "legend-glow" : "", hurt ? "hurt" : "", crown ? "has-crown" : "", className];
  return (
    <span className={classes.filter(Boolean).join(" ")}>
      <svg viewBox={`0 0 ${s.width} ${s.height}`} width={s.width * k} height={s.height * k} shapeRendering="crispEdges" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
        {s.rects.map((r, i) => (
          <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
        ))}
      </svg>
      {hurt ? <span className="bandage" aria-hidden /> : null}
    </span>
  );
}
