import type { Mood } from "@/game/avatar";
import type { Form } from "@/game/levels";
import type { CharacterId, ColorId } from "@/lib/onboarding";

export const COLOR_HEX: Record<ColorId, string> = { BLUE: "#3d7bd9", RED: "#d94848", GREEN: "#3fa55b", PURPLE: "#8a55d6", ORANGE: "#e8892e", BLACK: "#4a4a5e" };

type Props = { character: CharacterId; color: ColorId; form: Form; mood: Mood; size?: number };

// Emplacement de l'avatar : les sprites pixel arrivent au lot 4. La taille grandit avec la forme.
export function AvatarBox({ character, color, form, mood, size = 72 }: Props): React.ReactElement {
  const side = Math.round(size * (0.55 + form * 0.075));
  return (
    <div className="grid shrink-0 place-items-end" style={{ width: size, height: size }} data-character={character} data-mood={mood}>
      <div
        className="grid place-items-center border-[3px] border-[#1a1626] font-display text-[10px] text-white"
        style={{ width: side, height: side, background: COLOR_HEX[color], filter: mood === "normal" ? undefined : "saturate(.5) brightness(.8)" }}
      >
        {character === "PANDA" ? "P" : "C"}
        {form}
      </div>
    </div>
  );
}
