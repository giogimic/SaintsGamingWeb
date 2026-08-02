/**
 * State-aware Azure Guide dialogue nodes for the Spyder on-ramp.
 * Pure helpers — DialogueManager picks a start node from quest/party state.
 */

export const AZURE_GUIDE_NPC_ID = "npc_azure_guide";

export type GuideQuestSnapshot = {
  slug: string;
  status: string;
  currentStage: number;
};

export type GuideContext = {
  hasPartyCreature: boolean;
  active: GuideQuestSnapshot | null;
  completedSlugs: Set<string>;
};

/** Full branching tree stored on NpcDialogueTree for the Guide. */
export const AZURE_GUIDE_TREE = {
  node_start: {
    text: "Welcome to Azure Town, tamer. Spyder's trail begins here. Will you take your first charge?",
    options: [
      {
        label: "I'm ready.",
        nextNode: "accepted",
        action: "ACCEPT_QUEST",
        questSlug: "quest_azure_welcome",
      },
      { label: "Just looking around.", nextNode: "exit" },
    ],
  },
  accepted: {
    text: "Good. I've packed you a Soul Camera, film, and a companion egg — Budaye hatches at your side. Greet the townsfolk, then take the east road to Route 1.",
    options: [
      { label: "Open the Lab instead", nextNode: "exit", action: "OPEN_LAB" },
      { label: "Understood.", nextNode: "exit" },
    ],
  },
  node_need_starter: {
    text: "You'll need a companion before the tall grass. Take Budaye, or visit the Lab to choose.",
    options: [
      {
        label: "Take Budaye",
        nextNode: "starter_granted",
        action: "GRANT_SPYDER_STARTER",
      },
      { label: "Open the Lab", nextNode: "exit", action: "OPEN_LAB" },
      { label: "Later.", nextNode: "exit" },
    ],
  },
  starter_granted: {
    text: "Budaye is with you. East road — Route 1 — when you're ready to capture.",
    options: [{ label: "Thanks!", nextNode: "exit" }],
  },
  node_welcome_active: {
    text: "Still settling in? Speak with me again when you've accepted your charge — or if you already have, consider this our second chat.",
    options: [
      { label: "I'll look around.", nextNode: "exit" },
      { label: "Open the Lab", nextNode: "exit", action: "OPEN_LAB" },
    ],
  },
  node_townsfolk: {
    text: "The Enforcer and Knight keep the plaza. Greet them both, then return when the road calls.",
    options: [{ label: "On my way.", nextNode: "exit" }],
  },
  node_capture_go: {
    text: "East gate leads to Spyder Route 1. Walk the tall grass, expose film, bring a wild one home.",
    options: [
      { label: "Need a companion", nextNode: "node_need_starter" },
      { label: "Heading out.", nextNode: "exit" },
    ],
  },
  node_capture_report: {
    text: "You smell of tall grass and film emulsion. Well done — Spyder's road opens east toward Cotton Town.",
    options: [{ label: "I'll keep going.", nextNode: "exit" }],
  },
  node_cotton: {
    text: "Cotton Town lies east along Route 1. The greeter there will mark your arrival.",
    options: [{ label: "Eastward.", nextNode: "exit" }],
  },
  node_cotton_locals: {
    text: "In Cotton, step through the plaza doors into Scoop and the Café — the clerk and host keep the town's pulse.",
    options: [{ label: "I'll find them.", nextNode: "exit" }],
  },
  node_cotton_tunnel: {
    text: "East of Cotton Town, a tunnel mouth opens. Carlos waits inside — challenge him when your companion is ready.",
    options: [{ label: "Into the tunnel.", nextNode: "exit" }],
  },
  node_route2: {
    text: "Past Carlos, the tunnel opens east onto Spyder Route 2. Meet the scout on the road — Scoop's nurse can heal you first if you need it.",
    options: [{ label: "Onto Route 2.", nextNode: "exit" }],
  },
  node_leather: {
    text: "Route 2 runs into Route 3, then Leather Town. Greet the gatekeeper — their Center will mend your party.",
    options: [{ label: "Toward Leather.", nextNode: "exit" }],
  },
  node_leather_scoop: {
    text: "In Leather Town, Scoop sits east of the Center. Talk to the clerk — restock film before the shafts call.",
    options: [{ label: "To Scoop.", nextNode: "exit" }],
  },
  node_done: {
    text: "Azure to Leather Scoop — you've cut a clean trail through Spyder's near web. Heal at the Center, browse Scoop or the Gym door, and roam when you're ready for whatever comes next.",
    options: [
      { label: "Open the Lab", nextNode: "exit", action: "OPEN_LAB" },
      { label: "Farewell.", nextNode: "exit" },
    ],
  },
} as const;

/**
 * Pick which dialogue node to open for the Azure Guide.
 * Prefer starter gate when they have no party and are past welcome accept.
 */
export function resolveAzureGuideStartNode(ctx: GuideContext): string {
  const { hasPartyCreature, active, completedSlugs } = ctx;

  if (!active && !completedSlugs.has("quest_azure_welcome")) {
    return "node_start";
  }

  if (active?.slug === "quest_azure_welcome") {
    return "node_welcome_active";
  }

  if (active?.slug === "quest_azure_townsfolk") {
    return "node_townsfolk";
  }

  if (active?.slug === "quest_spyder_first_capture") {
    if (!hasPartyCreature) return "node_need_starter";
    if (active.currentStage >= 2) return "node_capture_report";
    return "node_capture_go";
  }

  if (active?.slug === "quest_spyder_cotton_arrive") {
    return "node_cotton";
  }

  if (active?.slug === "quest_spyder_cotton_locals") {
    return "node_cotton_locals";
  }

  if (active?.slug === "quest_spyder_cotton_tunnel") {
    return "node_cotton_tunnel";
  }

  if (active?.slug === "quest_spyder_route2") {
    return "node_route2";
  }

  if (active?.slug === "quest_spyder_leather_arrive") {
    return "node_leather";
  }

  if (active?.slug === "quest_spyder_leather_scoop") {
    return "node_leather_scoop";
  }

  if (completedSlugs.has("quest_spyder_leather_scoop")) {
    return "node_done";
  }

  if (completedSlugs.has("quest_spyder_leather_arrive")) {
    return "node_leather_scoop";
  }

  if (completedSlugs.has("quest_spyder_route2")) {
    return "node_leather";
  }

  if (completedSlugs.has("quest_spyder_cotton_tunnel")) {
    return "node_route2";
  }

  if (completedSlugs.has("quest_spyder_cotton_locals")) {
    return "node_cotton_tunnel";
  }

  if (completedSlugs.has("quest_spyder_cotton_arrive")) {
    return "node_cotton_locals";
  }

  if (completedSlugs.has("quest_spyder_first_capture")) {
    return "node_cotton";
  }

  if (!hasPartyCreature) {
    return "node_need_starter";
  }

  // Welcome completed but somehow no active follow-up
  return "node_townsfolk";
}
