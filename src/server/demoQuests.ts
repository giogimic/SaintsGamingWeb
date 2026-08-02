/** Road to Aethervale — formal Q1–Q4 templates for QuestManager. */

export const DEMO_QUEST_CHAIN = [
  {
    slug: "quest_tools_of_trade",
    title: "Q1: Tools of the Trade",
    description: "Gather wood and ore with Vance's tools, then report back.",
    rewards: JSON.stringify({
      items: [{ slug: "crystal_dust", qty: 4 }],
      nextQuest: "quest_forging_vessel",
    }),
    objectives: [
      { stage: 1, type: "GATHER", targetSlug: "wood_log", requiredQty: 3, description: "Chop 3 Wood Logs (SE trees)" },
      { stage: 2, type: "GATHER", targetSlug: "ore_copper", requiredQty: 3, description: "Mine 3 Copper Ore (SE rocks)" },
      { stage: 3, type: "TALK", targetSlug: "npc_warden_vance", requiredQty: 1, description: "Report back to Warden Vance" },
    ],
  },
  {
    slug: "quest_forging_vessel",
    title: "Q2: Forging the Vessel",
    description: "Craft Standard Film, then show Vance.",
    rewards: JSON.stringify({
      items: [{ slug: "film_standard", qty: 2 }],
      nextQuest: "quest_first_bond",
    }),
    objectives: [
      { stage: 1, type: "CRAFT", targetSlug: "film_standard", requiredQty: 1, description: "Craft 1× Standard Film (shop/craft table)" },
      { stage: 2, type: "TALK", targetSlug: "npc_warden_vance", requiredQty: 1, description: "Show the film to Vance" },
    ],
  },
  {
    slug: "quest_first_bond",
    title: "Q3: First Bond",
    description: "Claim a starter companion in the Professor's Lab.",
    rewards: JSON.stringify({
      items: [{ slug: "film_standard", qty: 3 }],
      nextQuest: "quest_wilderness_clearance",
    }),
    objectives: [
      { stage: 1, type: "CLAIM", targetSlug: "starter", requiredQty: 1, description: "Claim a Solar / Bio / Hydro starter in the Lab" },
    ],
  },
  {
    slug: "quest_wilderness_clearance",
    title: "Q4: Wilderness Clearance",
    description: "Clear the bramble north of the plaza with your hatchet and companion.",
    rewards: JSON.stringify({
      items: [{ slug: "film_fine", qty: 1 }],
      flags: ["bramble_cleared"],
    }),
    objectives: [
      { stage: 1, type: "CLEAR", targetSlug: "bramble", requiredQty: 1, description: "Clear the bramble wall (E + axe + party)" },
    ],
  },
] as const;
