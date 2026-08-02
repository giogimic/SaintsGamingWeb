/**
 * Studio / lobby world profiles.
 * `id` matches WorldMap.gameId, QuestTemplate.gameId, StarterHero.gameId.
 */

export type WorldProfileId = "tuxemon" | "custom_1" | "custom_2" | string;

export type WorldProfile = {
  id: WorldProfileId;
  name: string;
  description: string;
};

export const WORLD_PROFILES: WorldProfile[] = [
  {
    id: "tuxemon",
    name: "Tuxemon",
    description: "Spyder campaign showcase — Azure → Leather Shafts",
  },
  {
    id: "custom_1",
    name: "Custom 1",
    description: "Saints Trail / creator sandbox profile",
  },
  {
    id: "custom_2",
    name: "Custom 2",
    description: "Blank or cloned creator world",
  },
];

export const DEFAULT_WORLD_PROFILE_ID: WorldProfileId = "tuxemon";

export function getWorldProfile(id: string | null | undefined): WorldProfile {
  const found = WORLD_PROFILES.find((p) => p.id === id);
  if (found) return found;
  return {
    id: id || DEFAULT_WORLD_PROFILE_ID,
    name: id || "World",
    description: "Custom world profile",
  };
}
