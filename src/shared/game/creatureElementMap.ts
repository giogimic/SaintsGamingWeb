/**
 * Creature Sprite-Tag to Canonical 10-Element Mapping (System B).
 * Maps legacy creature sprite tags directly into canonical Saints elements.
 */
export const CREATURE_TO_SAINTS_ELEMENT: Record<string, string> = {
  fire: "fire",
  water: "water",
  wood: "grass",
  plant: "grass",
  grass: "grass",
  earth: "earth",
  rock: "earth",
  metal: "shadow",
  electricity: "electric",
  electric: "electric",
  frost: "ice",
  ice: "ice",
  wind: "wind",
  sky: "wind",
  aether: "holy",
  holy: "holy",
  shadow: "shadow",
  dark: "shadow",
  normal: "normal",
  hero: "normal",
};

export function mapCreatureTypeToSaints(type: string | undefined | null): string {
  if (!type) return "normal";
  return CREATURE_TO_SAINTS_ELEMENT[type.toLowerCase()] || "normal";
}
