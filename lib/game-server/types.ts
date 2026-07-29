export interface PlayerInput {
  entityId: string;
  sequence: number;
  type: "MOVE" | "ATTACK" | "USE_ITEM" | "FLEE";
  direction?: "up" | "down" | "left" | "right"; // for MOVE
  targetId?: string; // for ATTACK
  abilityId?: string; // for ATTACK
  itemId?: string; // for USE_ITEM
  timestamp: number;
}

export interface MultiTierCurrency {
  copper: number;
  silver: number;
  gold: number;
  platinum: number;
}

export enum EntityType {
  PLAYER = "PLAYER",
  CREATURE = "CREATURE",
  NPC = "NPC",
  OBJECT = "OBJECT",
  PROJECTILE = "PROJECTILE"
}

export enum AIState {
  IDLE = "IDLE",
  WANDER = "WANDER",
  CHASE = "CHASE",
  ATTACK = "ATTACK",
  RETURN = "RETURN",
  FLEE = "FLEE",
  SCRIPTED = "SCRIPTED"
}

export enum SpawnMode {
  STATIC = "STATIC",
  ROAMING = "ROAMING",
  ENCOUNTER_PRIVATE = "ENCOUNTER_PRIVATE", // e.g. tall grass spawn only visible to player/party
  EVENT_GLOBAL = "EVENT_GLOBAL"
}
