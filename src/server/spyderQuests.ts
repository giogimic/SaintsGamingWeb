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
    description:
      "Find Carlos in the Cotton Tunnel, then defeat his Dragarbor and Pairagrin in a trainer battle.",
    rewards: JSON.stringify({
      items: [
        { slug: "film_fine", qty: 2 },
        { slug: "film_standard", qty: 5 },
      ],
      gold: 100,
      nextQuest: "quest_spyder_route2",
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
        description: "Defeat Carlos's Dragarbor and Pairagrin",
      },
    ],
  },
  {
    slug: "quest_spyder_route2",
    title: "Spyder 7: Beyond the Tunnel",
    description:
      "Pass east through the Cotton Tunnel onto Spyder Route 2 and meet the road scout.",
    rewards: JSON.stringify({
      items: [
        { slug: "film_standard", qty: 5 },
        { slug: "film_fine", qty: 1 },
      ],
      gold: 80,
      nextQuest: "quest_spyder_leather_arrive",
    }),
    objectives: [
      {
        stage: 1,
        type: "TALK",
        targetSlug: "npc_spyder_route2_scout",
        requiredQty: 1,
        description: "Exit the tunnel east onto Route 2 and speak with the scout",
      },
    ],
  },
  {
    slug: "quest_spyder_leather_arrive",
    title: "Spyder 8: Leather Town",
    description:
      "Follow Route 2 east through Route 3 into Leather Town and greet the gatekeeper.",
    rewards: JSON.stringify({
      items: [
        { slug: "film_standard", qty: 5 },
        { slug: "film_fine", qty: 2 },
      ],
      gold: 120,
      nextQuest: "quest_spyder_leather_scoop",
    }),
    objectives: [
      {
        stage: 1,
        type: "TALK",
        targetSlug: "npc_leather_greeter",
        requiredQty: 1,
        description: "Reach Leather Town via Route 3 and speak with the greeter",
      },
    ],
  },
  {
    slug: "quest_spyder_leather_scoop",
    title: "Spyder 9: Leather Scoop",
    description:
      "Visit Leather Scoop east of the Center and speak with the clerk — restock film for the road ahead.",
    rewards: JSON.stringify({
      items: [
        { slug: "film_standard", qty: 8 },
        { slug: "film_fine", qty: 2 },
      ],
      gold: 100,
      nextQuest: "quest_spyder_leather_gym",
    }),
    objectives: [
      {
        stage: 1,
        type: "TALK",
        targetSlug: "npc_leather_scoop_clerk",
        requiredQty: 1,
        description: "Enter Leather Scoop and speak with the clerk",
      },
    ],
  },
  {
    slug: "quest_spyder_leather_gym",
    title: "Spyder 10: Leather Gym",
    description:
      "Challenge Rook in the Leather Gym — defeat Rockitten and Aardorn, then the east shaft opens for exploration.",
    rewards: JSON.stringify({
      items: [
        { slug: "film_fine", qty: 3 },
        { slug: "film_standard", qty: 5 },
      ],
      gold: 150,
      nextQuest: "quest_spyder_leather_shaft",
    }),
    objectives: [
      {
        stage: 1,
        type: "TALK",
        targetSlug: "npc_leather_gym_attendant",
        requiredQty: 1,
        description: "Enter the Leather Gym and speak with Rook",
      },
      {
        stage: 2,
        type: "BATTLE",
        targetSlug: "npc_leather_gym_attendant",
        requiredQty: 1,
        description: "Defeat Rook's Rockitten and Aardorn",
      },
    ],
  },
  {
    slug: "quest_spyder_leather_shaft",
    title: "Spyder 11: Leather Shafts",
    description:
      "Enter the east shaft from Leather Town, speak with the shaft scout, then press deeper into Shaft 2.",
    rewards: JSON.stringify({
      items: [
        { slug: "film_standard", qty: 6 },
        { slug: "film_fine", qty: 2 },
      ],
      gold: 120,
      nextQuest: "quest_spyder_beyond_shaft",
    }),
    objectives: [
      {
        stage: 1,
        type: "TALK",
        targetSlug: "npc_leather_shaft_scout",
        requiredQty: 1,
        description: "Enter Shaft 1 east of Leather Town and speak with the scout",
      },
      {
        stage: 2,
        type: "TALK",
        targetSlug: "npc_leather_shaft2_miner",
        requiredQty: 1,
        description: "Press east into Shaft 2 and speak with the miner",
      },
    ],
  },
  {
    slug: "quest_spyder_beyond_shaft",
    title: "Spyder 12: Beyond the Shafts",
    description:
      "Talk to the pathfinder in Shaft 2 — stub hook for the next Spyder region (Studio-expandable).",
    rewards: JSON.stringify({
      items: [{ slug: "film_fine", qty: 1 }],
      gold: 80,
    }),
    objectives: [
      {
        stage: 1,
        type: "TALK",
        targetSlug: "npc_leather_shaft2_pathfinder",
        requiredQty: 1,
        description: "Find the pathfinder deeper in Shaft 2",
      },
    ],
  },
] as const;

/** Carlos dialogue — challenge starts a 2-foe trainer TB (Dragarbor → Pairagrin). */
export const CARLOS_DIALOGUE_TREE = {
  node_start: {
    text: "So another tamer found the tunnel. Spyder's web runs deeper than Azure's plaza — Dragarbor and Pairagrin are ready. Care to prove yourself?",
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
    text: "Hah! Both of them down — Dragarbor and Pairagrin rarely fall that cleanly. East of here the tunnel opens onto Route 2 — a scout waits on the road.",
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
    text: "Dust yourself off. Scoop's nurse in Cotton Town will patch your party — then come back for Dragarbor and Pairagrin.",
    options: [
      {
        label: "Try again",
        nextNode: "exit",
        action: "START_TRAINER_BATTLE",
      },
      { label: "I'll heal up.", nextNode: "exit" },
    ],
  },
} as const;

/** Scoop clerk — film merchant (Cotton + Leather). */
export const SCOOP_CLERK_DIALOGUE_TREE = {
  node_start: {
    text: "Scoop's open — film for the road, treats for tamers. Need stock before the tall grass?",
    options: [
      {
        label: "Browse the shop",
        nextNode: "exit",
        action: "OPEN_SHOP",
      },
      { label: "Just looking around.", nextNode: "exit" },
    ],
  },
} as const;

/** Leather Scoop clerk — same shop action, Leather-flavored copy. */
export const LEATHER_SCOOP_CLERK_DIALOGUE_TREE = {
  node_start: {
    text: "Leather Scoop — tougher stock for tougher roads. Film, salves, and rumors from the shafts.",
    options: [
      {
        label: "Browse the shop",
        nextNode: "exit",
        action: "OPEN_SHOP",
      },
      { label: "Just looking around.", nextNode: "exit" },
    ],
  },
} as const;

/** Leather Gym leader Rook — 2-foe trainer TB (Rockitten → Aardorn). */
export const LEATHER_GYM_ATTENDANT_DIALOGUE_TREE = {
  node_start: {
    text: "Leather Gym. I'm Rook — Rockitten and Aardorn hold this floor. Challenge me when your party's ready.",
    options: [
      {
        label: "Challenge Rook",
        nextNode: "exit",
        action: "START_TRAINER_BATTLE",
      },
      { label: "Not yet.", nextNode: "exit" },
    ],
  },
  node_post_win: {
    text: "Solid work. The east shaft beyond town is yours to explore — heal at the Center if you need it, then dig in.",
    options: [
      {
        label: "Rematch",
        nextNode: "exit",
        action: "START_TRAINER_BATTLE",
      },
      { label: "Thanks, Rook.", nextNode: "exit" },
    ],
  },
  node_post_lose: {
    text: "The Center nurse will patch you up. Come back when Rockitten and Aardorn look less intimidating.",
    options: [
      {
        label: "Try again",
        nextNode: "exit",
        action: "START_TRAINER_BATTLE",
      },
      { label: "I'll heal first.", nextNode: "exit" },
    ],
  },
} as const;

/** Cotton Scoop nurse — full party heal for rematch UX. */
export const SCOOP_NURSE_DIALOGUE_TREE = {
  node_start: {
    text: "Rough fight? Rest a moment — I'll tend every companion in your party.",
    options: [
      {
        label: "Please heal my party",
        nextNode: "healed",
        action: "HEAL_PARTY",
      },
      { label: "We're fine.", nextNode: "exit" },
    ],
  },
  healed: {
    text: "All set. Carlos won't wait forever — and the road east toward Leather won't either.",
    options: [{ label: "Thank you.", nextNode: "exit" }],
  },
} as const;

/** Leather healing-center nurse — same HEAL_PARTY action as Scoop. */
export const LEATHER_NURSE_DIALOGUE_TREE = {
  node_start: {
    text: "Leather Center. Sit tight — I'll restore every companion you travel with.",
    options: [
      {
        label: "Please heal my party",
        nextNode: "healed",
        action: "HEAL_PARTY",
      },
      { label: "Just passing through.", nextNode: "exit" },
    ],
  },
  healed: {
    text: "Patched up. The road west runs back through Route 3 toward Cotton — east waits when you're ready.",
    options: [{ label: "Thank you.", nextNode: "exit" }],
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
        "Scoop's open — film for the road, treats for tamers. Need stock before the tall grass?",
    },
    {
      id: "npc_cotton_scoop_nurse",
      name: "Scoop Nurse",
      x: 9,
      y: 5,
      sprite: "monk",
      greeting:
        "Rough fight? Rest a moment — I'll tend every companion in your party.",
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
  SPYDER_ROUTE2: [
    {
      id: "npc_spyder_route2_scout",
      name: "Route 2 Scout",
      x: 4,
      y: 10,
      sprite: "ninja",
      greeting:
        "You made it through Carlos's tunnel. Keep east on Route 2 into Route 3 — Leather Town waits beyond. Restock film at Scoop if grass thins your stock.",
    },
  ],
  SPYDER_ROUTE3: [
    {
      id: "npc_spyder_route3_scout",
      name: "Route 3 Scout",
      x: 6,
      y: 10,
      sprite: "ninja",
      greeting:
        "Route 3 bends south-east toward Leather Town. Watch the tall grass — and the healing center inside the gates.",
    },
  ],
  SPYDER_LEATHER_TOWN: [
    {
      id: "npc_leather_greeter",
      name: "Leather Greeter",
      x: 4,
      y: 21,
      sprite: "knight",
      greeting:
        "Welcome to Leather Town. Center heals north of the gate; Scoop stocks film next door; the Gym waits farther east when you're ready.",
    },
  ],
  SPYDER_LEATHER_CENTER: [
    {
      id: "npc_leather_center_nurse",
      name: "Leather Nurse",
      x: 6,
      y: 6,
      sprite: "monk",
      greeting:
        "Leather Center. Sit tight — I'll restore every companion you travel with.",
    },
  ],
  SPYDER_LEATHER_SCOOP: [
    {
      id: "npc_leather_scoop_clerk",
      name: "Leather Scoop Clerk",
      x: 6,
      y: 5,
      sprite: "shopassistant",
      greeting:
        "Leather Scoop — tougher stock for tougher roads. Film, salves, and rumors from the shafts.",
    },
  ],
  SPYDER_LEATHER_GYM: [
    {
      id: "npc_leather_gym_attendant",
      name: "Rook",
      x: 5,
      y: 6,
      sprite: "knight",
      greeting:
        "Leather Gym. I'm Rook — Rockitten and Aardorn hold this floor. Challenge me when your party's ready.",
    },
  ],
  SPYDER_LEATHER_SHAFT1: [
    {
      id: "npc_leather_shaft_scout",
      name: "Shaft Scout",
      x: 3,
      y: 7,
      sprite: "ninja",
      greeting:
        "First shaft under Leather. East tunnel leads to Shaft 2 — wilds nest deeper. Heal at the Center before you dig in.",
    },
  ],
  SPYDER_LEATHER_SHAFT2: [
    {
      id: "npc_leather_shaft2_miner",
      name: "Deep Miner",
      x: 4,
      y: 5,
      sprite: "monk",
      greeting:
        "You've reached the second shaft. Ore veins and stubborn beasts share these walls — keep film ready and a clear path back west.",
    },
    {
      id: "npc_leather_shaft2_pathfinder",
      name: "Pathfinder",
      x: 8,
      y: 6,
      sprite: "ninja",
      greeting:
        "The shafts end here for now — beyond lies Candy and the wider Spyder web. Rest, stock film, then return when the next tunnels open in Studio.",
      questSlug: "quest_spyder_beyond_shaft",
    },
  ],
};
