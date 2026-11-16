import type { Form } from "@/game/levels";
import type { CharacterId } from "./onboarding";

const NAMES: Record<CharacterId, Record<Form, string>> = {
  KNIGHT: { 1: "Bébé", 2: "Gamin", 3: "Écuyer", 4: "Homme d'armes", 5: "Chevalier", 6: "Chevalier légendaire" },
  PANDA: { 1: "Bébé panda", 2: "Panda curieux", 3: "Novice", 4: "Moine voyageur", 5: "Moine gardien", 6: "Grand maître" },
};

export function formName(character: CharacterId, form: Form): string {
  return NAMES[character][form];
}
