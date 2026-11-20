import type { Mood } from "@/game/avatar";
import type { Form } from "@/game/levels";
import type { CharacterId, ColorId } from "@/lib/onboarding";
import { sprite, type Bandage as BandageCells, type Pose } from "@/lib/sprites";

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
  /** Héros incliné (étourdi) : les rangées de pixels se chevauchent, sinon la rotation laisse des rayures entre elles. */
  tilted?: boolean;
};

// Avatar 8 bits : la taille suit la forme (le bébé est minuscule, le légendaire remplit la carte).
export function Sprite({ character, color, form, mood = "normal", pose = "rest", px = 4, label, className = "", hurt = false, crown = false, tilted = false }: Props): React.ReactElement {
  const s = sprite(character, color, form, mood, pose, crown);
  const k = px * s.scale;
  const classes = ["sprite", pose === "rest" ? "idle" : `pose-${pose}`, mood !== "normal" ? `mood-${mood}` : "", form === 6 && mood === "normal" ? "legend-glow" : "", hurt ? "hurt" : "", crown ? "has-crown" : "", className];
  return (
    <span className={classes.filter(Boolean).join(" ")}>
      <svg viewBox={`0 0 ${s.width} ${s.height}`} width={s.width * k} height={s.height * k} shapeRendering="crispEdges" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
        <g className="body">
          {s.rects.map((r, i) => (
            <rect key={i} x={r.x} y={r.y} width={r.w} height={tilted ? 1.1 : 1} fill={r.fill} />
          ))}
        </g>
        {hurt && s.bandage ? <Bandage cells={s.bandage} k={k} /> : null}
      </svg>
    </span>
  );
}

/**
 * Bandeau sur le front, dessiné dans l'image : il suit la respiration, l'inclinaison et les poses du héros.
 * Sa place vient du dessin (ligne du front, contour de la tête), calculée par `sprite`.
 */
function Bandage({ cells, k }: { cells: BandageCells; k: number }): React.ReactElement {
  const { x, y, w } = cells;
  // Une seule ligne du dessin à toutes les tailles : plus épais, il mange les yeux des petits avatars.
  const h = 1;
  const edge = 1 / k;
  return (
    <g className="bandage">
      {/* Tache de sang décalée vers le bas à droite, sous le bandeau. */}
      <rect x={x + 3 / k} y={y + 1 / k} width={w} height={h} fill="var(--danger)" />
      <rect x={x - edge} y={y - edge} width={w + edge * 2} height={h + edge * 2} fill="#6b5f4a" />
      <rect x={x} y={y} width={w} height={h} fill="#f4f0e6" />
    </g>
  );
}
