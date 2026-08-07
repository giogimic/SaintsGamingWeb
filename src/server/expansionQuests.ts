/**
 * Data-driven expansion quest definitions.
 * Quest behavior and objectives are purely data-driven — zero hardcoded quest IDs in managers.
 */

export interface ExpansionQuestDefinition {
  slug: string;
  gameId: string;
  title: string;
  description: string;
  category: string;
  minLevel: number;
  prerequisiteSlug?: string;
  rewards: {
    xp?: number;
    credits?: number;
    items?: Array<{ slug: string; quantity: number }>;
    nextQuest?: string;
  };
  objectives: Array<{
    stage: number;
    type: "KILL" | "GATHER" | "TALK" | "CRAFT" | "CLAIM" | "BATTLE" | "CLEAR" | "TRADE";
    targetSlug: string;
    requiredQty: number;
    description: string;
  }>;
}

export const EXPANSION_QUESTS: ExpansionQuestDefinition[] = [
  {
    slug: "Q005_FIRST_CAPTURE",
    gameId: "tuxemon",
    title: "Soul Binding",
    description: "Equip your Soul Camera and capture your first wild companion in the tall grass.",
    category: "CAMPAIGN",
    minLevel: 1,
    prerequisiteSlug: "Q002_GATHER",
    rewards: {
      xp: 75,
      credits: 250,
      items: [{ slug: "film_standard", quantity: 3 }],
      nextQuest: "Q006_GTC_INTRO",
    },
    objectives: [
      {
        stage: 1,
        type: "CLAIM",
        targetSlug: "rockitten",
        requiredQty: 1,
        description: "Capture 1 wild creature using Standard Film in tall grass.",
      },
    ],
  },
  {
    slug: "Q006_GTC_INTRO",
    gameId: "tuxemon",
    title: "Market Forces",
    description: "Visit the GTC merchant tile in the plaza and complete your first item trade.",
    category: "CAMPAIGN",
    minLevel: 2,
    prerequisiteSlug: "Q005_FIRST_CAPTURE",
    rewards: {
      xp: 100,
      credits: 500,
      items: [{ slug: "crystal_dust", quantity: 5 }],
    },
    objectives: [
      {
        stage: 1,
        type: "TALK",
        targetSlug: "npc_merchant",
        requiredQty: 1,
        description: "Speak with the GTC Merchant by the plaza trade board.",
      },
    ],
  },
];
