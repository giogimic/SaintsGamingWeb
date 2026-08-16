/**
 * Saints Gaming — Shared Gameplay Domain Event Bus (Bible 34 §16)
 * Decoupled event broadcaster connecting simulation outcomes (capturing, harvesting, crafting, combat).
 */

export interface CreatureCapturedEvent {
  playerId: string;
  creatureId: string;
  speciesSlug: string;
  nickname?: string;
  level: number;
  isShiny?: boolean;
  mapId: string;
  timestamp: number;
}

export interface ResourceHarvestedEvent {
  playerId: string;
  resourceType: string;
  skillSlug: string;
  xpEarned: number;
  itemsYielded: Array<{ itemSlug: string; quantity: number }>;
  nodeId?: string;
  mapId: string;
  targetPos: { x: number; y: number };
  timestamp: number;
}

export interface CombatEndedEvent {
  contextId: string;
  mode: 'real_time' | 'turn_based';
  victor: 'player' | 'enemy' | 'fled';
  playerId: string;
  targetEntityId?: string;
  xpEarned: number;
  lootDropped?: string[];
  timestamp: number;
}

export interface ItemCraftedEvent {
  playerId: string;
  itemSlug: string;
  quantity: number;
  recipeSlug?: string;
  skillSlug?: string;
  xpEarned?: number;
  timestamp: number;
}

export interface QuestProgressedEvent {
  playerId: string;
  questSlug: string;
  stage: number;
  objectiveIndex: number;
  completed: boolean;
  timestamp: number;
}

export interface GameplayEventMap {
  'creature:captured': CreatureCapturedEvent;
  'resource:harvested': ResourceHarvestedEvent;
  'combat:ended': CombatEndedEvent;
  'item:crafted': ItemCraftedEvent;
  'quest:progressed': QuestProgressedEvent;
}

export type GameplayEventName = keyof GameplayEventMap;

export class GameEventBus {
  private listeners: {
    [K in GameplayEventName]?: Array<(payload: GameplayEventMap[K]) => void>;
  } = {};

  /**
   * Subscribe to a typed gameplay domain event.
   * Returns an unsubscribe function.
   */
  public on<K extends GameplayEventName>(
    event: K,
    handler: (payload: GameplayEventMap[K]) => void
  ): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(handler);

    return () => {
      this.off(event, handler);
    };
  }

  /**
   * Subscribe to a typed gameplay event once.
   */
  public once<K extends GameplayEventName>(
    event: K,
    handler: (payload: GameplayEventMap[K]) => void
  ): () => void {
    const unsubscribe = this.on(event, (payload) => {
      unsubscribe();
      handler(payload);
    });
    return unsubscribe;
  }

  /**
   * Unsubscribe a handler from a gameplay event.
   */
  public off<K extends GameplayEventName>(
    event: K,
    handler: (payload: GameplayEventMap[K]) => void
  ): void {
    const list = this.listeners[event];
    if (!list) return;
    this.listeners[event] = list.filter((h) => h !== handler) as any;
  }

  /**
   * Broadcasts a typed gameplay domain event to all registered listeners.
   */
  public emit<K extends GameplayEventName>(
    event: K,
    payload: GameplayEventMap[K]
  ): void {
    const list = this.listeners[event];
    if (!list || list.length === 0) return;

    // Execute handlers with error containment so one failing listener doesn't break other systems
    for (const handler of list) {
      try {
        handler(payload);
      } catch (error) {
        console.error(`[GameEventBus] Error in listener for "${event}":`, error);
      }
    }
  }

  /**
   * Clears all listeners for testing and clean teardowns.
   */
  public clear(): void {
    this.listeners = {};
  }
}

/** Global shared gameplay event bus singleton */
export const gameEvents = new GameEventBus();
