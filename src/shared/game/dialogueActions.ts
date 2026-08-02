/** Dialogue option actions recognized by DialogueManager / Studio Talk dock. */
export const KNOWN_ACTIONS = [
  "",
  "ACCEPT_QUEST",
  "OPEN_SHOP",
  "HEAL_PARTY",
  "START_TRAINER_BATTLE",
  "GRANT_DEMO_TOOLS",
  "GRANT_DEMO_FILM",
  "OPEN_LAB",
  "DEMO_QUEST_REPORT",
] as const;

export type KnownDialogueAction = (typeof KNOWN_ACTIONS)[number];
