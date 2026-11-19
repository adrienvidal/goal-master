// Monstres du mode libre (maquette encart-libre-vivant) : pur décor, le héros les chasse sans rien gagner.
// Chaque lettre est une couleur de MONSTER_PAL ; « . » est transparent.

export const MONSTER_IDS = ["slime", "bat", "shroom"] as const;
export type MonsterId = (typeof MONSTER_IDS)[number];

export const MONSTER_PAL: Record<string, string> = {
  K: "#1a1626", E: "#1a1626", R: "#ff6b6b", L: "#e9fff0", g: "#6fd49a", G: "#3fa55b", c: "#8a6bc0", z: "#c9774a", F: "#f3f1f6",
};

/** Deux images pour la chauve-souris (ailes hautes, ailes basses) ; une seule pour les autres. */
export const MONSTER_GRIDS: Record<MonsterId, string[][]> = {
  slime: [["...KKKK...", "..KggggK..", ".KgLgggGK.", ".KgEggEgK.", "KgggggggGK", "KggKKKggGK", "KGgggggGGK", ".KKKKKKKK."]],
  bat: [
    ["c..........c", "cc..K..K..cc", "cccKcKKcKccc", ".ccKRccRKcc.", "...KccccK...", "....KccK....", ".....KK....."],
    ["....K..K....", "...KcKKcK...", "..KKRccRKK..", ".ccKccccKcc.", "ccc.KccK.ccc", "cc...KK...cc", "c..........c"],
  ],
  shroom: [["..KKKKKK..", ".KzzFzzzK.", "KzFzzzzFzK", "KzzzzzzzzK", ".KKFFFFKK.", "..KFEFEK..", "..KFFFFK..", "..KKKKKK.."]],
};

/** La chauve-souris vole ; les autres marchent au sol. */
export const FLYING: Record<MonsterId, boolean> = { slime: false, bat: true, shroom: false };
