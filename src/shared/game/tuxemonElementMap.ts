/** Tuxemon type slug → Saints element. */
export const TUXEMON_TO_SAINTS_ELEMENT: Record<string, string> = {
  fire: "Solar",
  water: "Hydro",
  wood: "Bio",
  earth: "Geo",
  metal: "Cyber",
  electricity: "Volt",
  electric: "Volt",
  frost: "Cryo",
  ice: "Cryo",
  wind: "Aero",
  sky: "Aero",
  aether: "Cyber",
  normal: "None",
  hero: "None",
  shadow: "Cyber",
};

export function mapTuxemonTypeToSaints(tux: string | undefined | null): string {
  if (!tux) return "None";
  return TUXEMON_TO_SAINTS_ELEMENT[tux.toLowerCase()] || "None";
}
