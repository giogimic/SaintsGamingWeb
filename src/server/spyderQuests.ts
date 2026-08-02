/**
 * Spyder campaign starter quest chain (QuestTemplate shape).
 * Full spyder.yaml is achievement-flag oriented; this is the playable on-ramp.
 */

export const SPYDER_QUEST_CHAIN = [
  {
    slug: "quest_azure_welcome",
    title: "Spyder 1: Azure Welcome",
    description: "Meet the Azure Guide and begin your journey in Azure Town.",
    rewards: JSON.stringify({
      items: [{ slug: "film_standard", qty: 2 }],
      nextQuest: "quest_azure_townsfolk",
    }),
    objectives: [
      {
        stage: 1,
        type: "TALK",
        targetSlug: "npc_azure_guide",
        requiredQty: 1,
        description: "Talk to the Azure Guide again after accepting",
      },
    ],
  },
  {
    slug: "quest_azure_townsfolk",
    title: "Spyder 2: Meet the Townsfolk",
    description: "Speak with the enforcer and knight posted around Azure Plaza.",
    rewards: JSON.stringify({
      items: [{ slug: "film_standard", qty: 3 }],
      nextQuest: "quest_spyder_first_capture",
    }),
    objectives: [
      {
        stage: 1,
        type: "TALK",
        targetSlug: "npc_azure_enforcer",
        requiredQty: 1,
        description: "Speak with the Azure Enforcer",
      },
      {
        stage: 2,
        type: "TALK",
        targetSlug: "npc_azure_knight",
        requiredQty: 1,
        description: "Speak with the Azure Knight",
      },
    ],
  },
  {
    slug: "quest_spyder_first_capture",
    title: "Spyder 3: First Capture",
    description: "Capture a wild creature on Route 1, then report to the Guide.",
    rewards: JSON.stringify({
      items: [
        { slug: "film_fine", qty: 1 },
        { slug: "film_standard", qty: 5 },
      ],
      nextQuest: "quest_spyder_cotton_arrive",
    }),
    objectives: [
      {
        stage: 1,
        type: "CLAIM",
        targetSlug: "capture_any",
        requiredQty: 1,
        description: "Capture any wild creature (tall grass on Route 1)",
      },
      {
        stage: 2,
        type: "TALK",
        targetSlug: "npc_azure_guide",
        requiredQty: 1,
        description: "Report your capture to the Azure Guide",
      },
    ],
  },
  {
    slug: "quest_spyder_cotton_arrive",
    title: "Spyder 4: Cotton Town",
    description: "Follow Route 1 east to Cotton Town and greet the greeter.",
    rewards: JSON.stringify({
      items: [{ slug: "film_standard", qty: 3 }],
      gold: 50,
      nextQuest: "quest_spyder_cotton_locals",
    }),
    objectives: [
      {
        stage: 1,
        type: "TALK",
        targetSlug: "npc_cotton_greeter",
        requiredQty: 1,
        description: "Speak with the Cotton Greeter",
      },
    ],
  },
  {
    slug: "quest_spyder_cotton_locals",
    title: "Spyder 5: Cotton Locals",
    description: "Enter Scoop and the Café in Cotton Town and meet the locals inside.",
    rewards: JSON.stringify({
      items: [
        { slug: "film_standard", qty: 3 },
        { slug: "film_fine", qty: 1 },
      ],
      gold: 75,
      nextQuest: "quest_spyder_cotton_tunnel",
    }),
    objectives: [
      {
        stage: 1,
        type: "TALK",
        targetSlug: "npc_cotton_scoop_clerk",
        requiredQty: 1,
        description: "Enter Scoop and speak with the clerk",
      },
      {
        stage: 2,
        type: "TALK",
        targetSlug: "npc_cotton_cafe_host",
        requiredQty: 1,
        description: "Enter the Café and speak with the host",
      },
    ],
  },
  {
    slug: "quest_spyder_cotton_tunnel",
    title: "Spyder 6: Cotton Tunnel",
    description: "Find Carlos in the Cotton Tunnel, then defeat him in a trainer battle.",
    rewards: JSON.stringify({
      items: [
        { slug: "film_fine", qty: 2 },
        { slug: "film_standard", qty: 5 },
      ],
      gold: 100,
    }),
    objectives: [
      {
        stage: 1,
        type: "TALK",
        targetSlug: "npc_cotton_tunnel_carlos",
        requiredQty: 1,
        description: "Enter the Cotton Tunnel (east of town) and speak with Carlos",
      },
      {
        stage: 2,
        type: "BATTLE",
        targetSlug: "npc_cotton_tunnel_carlos",
        requiredQty: 1,
        description: "Challenge Carlos and win the trainer battle",
      },
    ],
  },
] as const;

/** Carlos dialogue — challenge starts a 1v1 trainer TB (Dragarbor). */
export const CARLOS_DIALOGUE_TREE = {
  node_start: {
    text: "So another tamer found the tunnel. Spyder's web runs deeper than Azure's plaza — care to prove yourself?",
    options: [
      {
        label: "Challenge Carlos",
        nextNode: "exit",
        action: "START_TRAINER_BATTLE",
      },
      { label: "Just passing through.", nextNode: "exit" },
    ],
  },
  node_post_win: {
    text: "Hah! Dragarbor rarely falls that cleanly. You've earned the tunnel's respect — Spyder's web opens wider for you.",
    options: [
      {
        label: "Rematch",
        nextNode: "exit",
        action: "START_TRAINER_BATTLE",
      },
      { label: "Thanks, Carlos.", nextNode: "exit" },
    ],
  },
  node_post_lose: {
    text: "Dust yourself off. Heal your companion, then come back when you're ready to challenge Dragarbor again.",
    options: [
      {
        label: "Try again",
        nextNode: "exit",
        action: "START_TRAINER_BATTLE",
      },
      { label: "I'll be back.", nextNode: "exit" },
    ],
  },
} as const;

export const CAMPAIGN_NPC_SEEDS: Record<
  string,
  Array<{
    id: string;
    name: string;
    x: number;
    y: number;
    sprite: string;
    greeting: string;
    questSlug?: string;
  }>
> = {
  AZURE_TOWN: [
    {
      id: "npc_azure_guide",
      name: "Azure Guide",
      x: 25,
      y: 24,
      sprite: "professor",
      greeting:
        "Welcome to Azure Town, tamer. Spyder's trail begins here. Will you take your first charge?",
      questSlug: "quest_azure_welcome",
    },
    {
      id: "npc_azure_enforcer",
      name: "Azure Enforcer",
      x: 22,
      y: 26,
      sprite: "knight",
      greeting: "Keep the peace in Azure. Wild beasts roam Route 1 — stay sharp.",
    },
    {
      id: "npc_azure_knight",
      name: "Azure Knight",
      x: 28,
      y: 26,
      sprite: "knight",
      greeting: "The Order watches these roads. Capture responsibly, tamer.",
    },
    {
      id: "npc_azure_witch",
      name: "Wandering Witch",
      x: 20,
      y: 22,
      sprite: "witch",
      greeting: "The crystals sing tonight… or maybe that's just the wind.",
    },
  ],
  PLAYER_HOUSE_BEDROOM: [
    {
      id: "npc_mom",
      name: "Mom",
      x: 5,
      y: 4,
      sprite: "heroine",
      greeting: "Don't forget your bag, dear. The world outside is waiting.",
    },
  ],
  PLAYER_HOUSE_DOWNSTAIRS: [
    {
      id: "npc_town_guide",
      name: "House Guest",
      x: 4,
      y: 3,
      sprite: "monk",
      greeting: "Heading to Azure Town? Follow the road east.",
    },
  ],
  ROUTE1: [
    {
      id: "npc_route1_scout",
      name: "Route Scout",
      x: 12,
      y: 19,
      sprite: "ninja",
      greeting: "Tall grass ahead. Keep film ready — and watch for shinies.",
    },
  ],
  SPYDER_ROUTE1: [
    {
      id: "npc_spyder_route_scout",
      name: "Spyder Scout",
      x: 6,
      y: 9,
      sprite: "ninja",
      greeting: "This is Spyder Route 1. Tall grass ahead — keep film ready.",
    },
  ],
  COTTON_TOWN: [
    {
      id: "npc_cotton_greeter",
      name: "Cotton Greeter",
      x: 4,
      y: 19,
      sprite: "florist",
      greeting:
        "Welcome to Cotton Town! Scoop and the Café are north of the plaza; the tunnel mouth waits east when you're ready for Carlos.",
    },
  ],
  COTTON_SCOOP: [
    {
      id: "npc_cotton_scoop_clerk",
      name: "Scoop Clerk",
      x: 6,
      y: 5,
      sprite: "shopassistant",
      greeting:
        "Scoop's open — treats for tamers, rumors for the road. Cotton's quieter than Azure, if you listen.",
    },
  ],
  COTTON_CAFE: [
    {
      id: "npc_cotton_cafe_host",
      name: "Café Host",
      x: 7,
      y: 6,
      sprite: "barmaid",
      greeting:
        "Pull up a chair. When you're ready for trouble, the east tunnel hides a rider named Carlos.",
    },
  ],
  SPYDER_COTTON_TUNNEL: [
    {
      id: "npc_cotton_tunnel_carlos",
      name: "Carlos",
      x: 15,
      y: 7,
      sprite: "dragonrider",
      greeting:
        "So another tamer found the tunnel. Spyder's web runs deeper than Azure's plaza — care to prove yourself?",
    },
  ],
};
