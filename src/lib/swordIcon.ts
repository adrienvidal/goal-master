// Icône de l'app : l'épée penchée, dessinée en 16 × 16 (choix d'Adrien sur la planche des icônes).
export const SWORD_ICON: string[] = [
  "................",
  "............KK..",
  "...........KLK..",
  "..........KLWK..",
  "..........KLWK..",
  ".........KLWK...",
  ".........KLWK...",
  "........KLGK....",
  "...KK...KLGK....",
  "...KYKKKKKK.....",
  "....KOYYYYYKK...",
  ".....KKBBKKOYK..",
  "......KBBK.KK...",
  ".....KBBK.......",
  "....KYYK........",
  ".....KK.........",
];

const PAL: Record<string, string> = { K: "#1a1626", W: "#dfe6ee", L: "#fffbe0", G: "#8b93a7", Y: "#f2c14e", O: "#b9831c", B: "#7a4a26" };
export const ICON_BACKGROUND = "#221e40";

/** SVG de l'icône ; `pad` ajoute une marge (en pixels de la grille) pour les icônes « maskable » des téléphones. */
export function swordIconSvg(pad = 0): string {
  const side = 16 + pad * 2;
  const rects = SWORD_ICON.flatMap((row, y) =>
    [...row].map((c, x) => (c === "." ? "" : `<rect x="${x + pad}" y="${y + pad}" width="1" height="1" fill="${PAL[c]}"/>`)),
  ).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side} ${side}" shape-rendering="crispEdges"><rect width="${side}" height="${side}" fill="${ICON_BACKGROUND}"/>${rects}</svg>`;
}
