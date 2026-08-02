/**
 * Saints Trail — custom_1 / DEMO_SANDBOX creator demo pack.
 * Verbs: TALK, CLAIM, BATTLE, GATHER, CRAFT, CLEAR + dialogue OPEN_SHOP / HEAL_PARTY / START_TRAINER_BATTLE.
 */

export const SAINTS_TRAIL_GAME_ID = "custom_1";
export const SAINTS_TRAIL_MAP_ID = "DEMO_SANDBOX";

export type TrailNpcSeed = {
  id: string;
  name: string;
  x: number;
  y: number;
  sprite: string;
  direction?: string;
  dialogue?: string[];
};

/** NPCs placed into WorldMap.npcsData (Vance also injected by WorldManager as fallback). */
export const SAINTS_TRAIL_NPCS: TrailNpcSeed[] = [
  {
    id: "npc_trail_greeter",
    name: "Trail Greeter",
    x: 15,
    y: 16,
    sprite: "adventurer",
    direction: "down",
    dialogue: ["Welcome to the Saints Trail sandbox."],
  },
  {
    id: "npc_trail_local_a",
    name: "Plaza Scout",
    x: 13,
    y: 14,
    sprite: "girl1",
    direction: "down",
  },
  {
    id: "npc_trail_local_b",
    name: "Yard Hand",
    x: 17,
    y: 14,
    sprite: "bob",
    direction: "down",
  },
  {
    id: "npc_trail_clerk",
    name: "Supply Clerk",
    x: 11,
    y: 13,
    sprite: "shopkeeper",
    direction: "down",
  },
  {
    id: "npc_trail_nurse",
    name: "Trail Nurse",
    x: 12,
    y: 13,
    sprite: "nurse",
    direction: "down",
  },
  {
    id: "npc_trail_tutor",
    name: "Spar Tutor",
    x: 16,
    y: 11,
    sprite: "monk",
    direction: "down",
  },
  {
    id: "npc_warden_vance",
    name: "Warden Vance",
    x: 14,
    y: 12,
    sprite: "professor",
    direction: "down",
    dialogue: ["Take the toolbelt when you're ready to gather."],
  },
];

export const SAINTS_TRAIL_DIALOGUES: Record<
  string,
  { name: string; tree: Record<string, unknown> }
> = {
  npc_trail_greeter: {
    name: "Trail Greeter",
    tree: {
      node_start: {
        text: "Welcome to Saints Trail — our creator sandbox. Talk to me to wake the chain, then meet the plaza folk.",
        options: [
          {
            label: "I'm ready to start.",
            nextNode: "accepted",
            action: "ACCEPT_QUEST",
            questSlug: "quest_trail_wake",
          },
          { label: "Just looking around.", nextNode: "exit" },
        ],
      },
      accepted: {
        text: "Good. Greet the Plaza Scout and Yard Hand, then find the clerk and nurse west of spawn.",
        options: [{ label: "On my way.", nextNode: "exit" }],
      },
    },
  },
  npc_trail_local_a: {
    name: "Plaza Scout",
    tree: {
      node_start: {
        text: "Scout here. Tall grass east of the plaza is safe enough for a first film — after you bond a companion.",
        options: [{ label: "Noted — thanks.", nextNode: "exit" }],
      },
    },
  },
  npc_trail_local_b: {
    name: "Yard Hand",
    tree: {
      node_start: {
        text: "Yard's open. Shop tile and craft table sit west; SE trees and rocks wait once Vance hands you tools.",
        options: [{ label: "Appreciate it.", nextNode: "exit" }],
      },
    },
  },
  npc_trail_clerk: {
    name: "Supply Clerk",
    tree: {
      node_start: {
        text: "Film, kits, sundries — browse the stock when you're short on exposures.",
        options: [
          { label: "Open shop", nextNode: "exit", action: "OPEN_SHOP" },
          { label: "Not now.", nextNode: "exit" },
        ],
      },
    },
  },
  npc_trail_nurse: {
    name: "Trail Nurse",
    tree: {
      node_start: {
        text: "Party worn thin? I can restore them here.",
        options: [
          { label: "Please heal my party", nextNode: "healed", action: "HEAL_PARTY" },
          { label: "We're fine.", nextNode: "exit" },
        ],
      },
      healed: {
        text: "They're patched up. Come back anytime.",
        options: [{ label: "Thank you.", nextNode: "exit" }],
      },
    },
  },
  npc_trail_tutor: {
    name: "Spar Tutor",
    tree: {
      node_start: {
        text: "Want a soft spar? One Rockitten — prove you can handle a trainer fight.",
        options: [
          {
            label: "Let's spar!",
            nextNode: "exit",
            action: "START_TRAINER_BATTLE",
          },
          { label: "Not ready.", nextNode: "exit" },
        ],
      },
      node_post_win: {
        text: "Clean work. Report that win on your quest tracker, then see Vance for tools.",
        options: [{ label: "Will do.", nextNode: "exit" }],
      },
      node_post_lose: {
        text: "Shake it off — heal with the nurse and try again.",
        options: [{ label: "Okay.", nextNode: "exit" }],
      },
    },
  },
  npc_warden_vance: {
    name: "Warden Vance",
    tree: {
      node_start: {
        text: "Out here, nature yields only to those with the right edge. Take this kit — chop, dig, craft film, bond a companion, then clear the north bramble for Aethervale.",
        options: [
          {
            label: "Take the Starter Toolbelt",
            nextNode: "node_tools_done",
            action: "GRANT_DEMO_TOOLS",
          },
          {
            label: "Where do I get film to capture souls?",
            nextNode: "node_film",
          },
          {
            label: "Report progress / turn in",
            nextNode: "node_report",
            action: "DEMO_QUEST_REPORT",
          },
          {
            label: "Open the Professor's Lab",
            nextNode: "node_lab",
            action: "OPEN_LAB",
          },
          { label: "Goodbye.", nextNode: "exit" },
        ],
      },
      node_tools_done: {
        text: "Rook Hatchet and Crude Pickaxe are yours. Finish the plaza Trail first — after you spar the Tutor, gather unlocks southeast (THREE Wood Logs, then THREE Copper Ore). Report progress here when both are done.",
        options: [
          { label: "Open the Lab", nextNode: "exit", action: "OPEN_LAB" },
          { label: "Thanks, Warden.", nextNode: "exit" },
        ],
      },
      node_film: {
        text: "We don't bottle beasts in crystals anymore. You expose Standard Film with a Soul Camera — buy film at the merchant, or craft it from Crystal Dust and Wood Logs.",
        options: [
          {
            label: "Grant me a starter film pack",
            nextNode: "node_film_done",
            action: "GRANT_DEMO_FILM",
          },
          { label: "Back", nextNode: "node_start" },
        ],
      },
      node_film_done: {
        text: "Soul Camera and Standard Film — don't waste the exposures. Weaken the wildling first.",
        options: [{ label: "Understood.", nextNode: "exit" }],
      },
      node_report: {
        text: "Good. Keep gathering, crafting, bonding, and clearing that bramble when you're ready.",
        options: [{ label: "Understood.", nextNode: "exit" }],
      },
      node_lab: {
        text: "The Grove Sanctuary trial is open. Choose Solar, Bio, or Hydro — one companion for the road.",
        options: [
          { label: "Enter Lab", nextNode: "exit", action: "OPEN_LAB" },
          { label: "Later", nextNode: "exit" },
        ],
      },
    },
  },
};

/** Full Trail chain: intro → services → bond → spar → gather → craft → bramble. */
export const SAINTS_TRAIL_QUEST_CHAIN = [
  {
    slug: "quest_trail_wake",
    title: "Trail Q1: Wake in the Sandbox",
    description: "Speak with the Trail Greeter to begin Saints Trail.",
    rewards: JSON.stringify({
      gold: 20,
      nextQuest: "quest_trail_yard",
    }),
    objectives: [
      {
        stage: 1,
        type: "TALK",
        targetSlug: "npc_trail_greeter",
        requiredQty: 1,
        description: "Talk to the Trail Greeter",
      },
    ],
  },
  {
    slug: "quest_trail_yard",
    title: "Trail Q2: Meet the Yard",
    description: "Greet the Plaza Scout and Yard Hand.",
    rewards: JSON.stringify({
      gold: 30,
      nextQuest: "quest_trail_services",
    }),
    objectives: [
      {
        stage: 1,
        type: "TALK",
        targetSlug: "npc_trail_local_a",
        requiredQty: 1,
        description: "Talk to the Plaza Scout",
      },
      {
        stage: 2,
        type: "TALK",
        targetSlug: "npc_trail_local_b",
        requiredQty: 1,
        description: "Talk to the Yard Hand",
      },
    ],
  },
  {
    slug: "quest_trail_services",
    title: "Trail Q3: Shop and Heal",
    description: "Visit the Supply Clerk and Trail Nurse (learn shop + heal actions).",
    rewards: JSON.stringify({
      items: [{ slug: "film_standard", qty: 2 }],
      nextQuest: "quest_first_bond",
    }),
    objectives: [
      {
        stage: 1,
        type: "TALK",
        targetSlug: "npc_trail_clerk",
        requiredQty: 1,
        description: "Talk to the Supply Clerk (try Open shop)",
      },
      {
        stage: 2,
        type: "TALK",
        targetSlug: "npc_trail_nurse",
        requiredQty: 1,
        description: "Talk to the Trail Nurse (try heal)",
      },
    ],
  },
  {
    slug: "quest_first_bond",
    title: "Trail Q4: First Bond",
    description: "Claim a starter companion in the Professor's Lab (Vance → Open Lab).",
    rewards: JSON.stringify({
      items: [{ slug: "film_standard", qty: 3 }],
      nextQuest: "quest_trail_spar",
    }),
    objectives: [
      {
        stage: 1,
        type: "CLAIM",
        targetSlug: "starter",
        requiredQty: 1,
        description: "Claim a Solar / Bio / Hydro starter in the Lab",
      },
    ],
  },
  {
    slug: "quest_trail_spar",
    title: "Trail Q5: Spar the Tutor",
    description: "Defeat the Spar Tutor in a soft trainer battle.",
    rewards: JSON.stringify({
      gold: 50,
      items: [{ slug: "crystal_dust", qty: 2 }],
      nextQuest: "quest_tools_of_trade",
    }),
    objectives: [
      {
        stage: 1,
        type: "BATTLE",
        targetSlug: "npc_trail_tutor",
        requiredQty: 1,
        description: "Win a spar against the Spar Tutor",
      },
    ],
  },
  {
    slug: "quest_tools_of_trade",
    title: "Trail Q6: Tools of the Trade",
    description: "Gather wood and ore with Vance's tools, then report back.",
    rewards: JSON.stringify({
      items: [{ slug: "crystal_dust", qty: 4 }],
      nextQuest: "quest_forging_vessel",
    }),
    objectives: [
      {
        stage: 1,
        type: "GATHER",
        targetSlug: "wood_log",
        requiredQty: 3,
        description: "Chop 3 Wood Logs first (SE trees)",
      },
      {
        stage: 2,
        type: "GATHER",
        targetSlug: "ore_copper",
        requiredQty: 3,
        description: "Then mine 3 Copper Ore (SE rocks)",
      },
      {
        stage: 3,
        type: "TALK",
        targetSlug: "npc_warden_vance",
        requiredQty: 1,
        description: "Vance → Report progress / turn in",
      },
    ],
  },
  {
    slug: "quest_forging_vessel",
    title: "Trail Q7: Forging the Vessel",
    description: "Craft Standard Film, then show Vance.",
    rewards: JSON.stringify({
      items: [{ slug: "film_standard", qty: 2 }],
      nextQuest: "quest_wilderness_clearance",
    }),
    objectives: [
      {
        stage: 1,
        type: "CRAFT",
        targetSlug: "film_standard",
        requiredQty: 1,
        description: "Craft 1× Standard Film (shop/craft table)",
      },
      {
        stage: 2,
        type: "TALK",
        targetSlug: "npc_warden_vance",
        requiredQty: 1,
        description: "Show the film to Vance",
      },
    ],
  },
  {
    slug: "quest_wilderness_clearance",
    title: "Trail Q8: Wilderness Clearance",
    description: "Clear the bramble north of the plaza with your hatchet and companion.",
    rewards: JSON.stringify({
      items: [{ slug: "film_fine", qty: 1 }],
      flags: ["bramble_cleared"],
    }),
    objectives: [
      {
        stage: 1,
        type: "CLEAR",
        targetSlug: "bramble",
        requiredQty: 1,
        description: "Clear the bramble wall (E + axe + party)",
      },
    ],
  },
] as const;
