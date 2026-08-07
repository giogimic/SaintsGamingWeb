/**
 * Isomorphic, strongly-typed Game Event Bus.
 * All game engine event producers emit events here; subscribers (achievements,
 * stats, analytics, tutorials, notifications) consume them decoupled.
 */

export type GameEventMap = {
  "creature.captured": { userId: string; creatureSlug: string; mapId: string };
  "creature.defeated": { userId: string; creatureSlug: string; mapId: string };
  "item.crafted": { userId: string; itemSlug: string; quantity: number };
  "item.gathered": { userId: string; itemSlug: string; quantity: number; nodeType: number };
  "quest.completed": { userId: string; questId: string };
  "quest.started": { userId: string; questId: string };
  "combat.kill": { userId: string; targetId: string; skillUsed: string };
  "trade.completed": { userId: string; itemSlug: string; credits: number; type: "buy" | "sell" };
  "bramble.cleared": { userId: string; mapId: string; x: number; y: number };
  "party.formed": { userId: string; partyId: string };
  "npc.interacted": { userId: string; npcId: string; mapId: string };
  "player.levelup": { userId: string; newLevel: number };
  "map.entered": { userId: string; mapId: string };
  "skill.levelup": { userId: string; skillSlug: string; newLevel: number };
};

type EventCallback<T> = (data: T) => void | Promise<void>;

export class GameEventBus {
  private listeners = new Map<keyof GameEventMap, Set<EventCallback<any>>>();

  public subscribe<K extends keyof GameEventMap>(
    event: K,
    callback: EventCallback<GameEventMap[K]>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(callback);

    return () => {
      set.delete(callback);
    };
  }

  public unsubscribe<K extends keyof GameEventMap>(
    event: K,
    callback: EventCallback<GameEventMap[K]>
  ): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(callback);
    }
  }

  public emit<K extends keyof GameEventMap>(
    event: K,
    data: GameEventMap[K]
  ): void {
    const set = this.listeners.get(event);
    if (!set || set.size === 0) return;

    for (const callback of Array.from(set)) {
      try {
        const result = callback(data);
        if (result && typeof (result as any).catch === "function") {
          (result as any).catch((err: unknown) => {
            console.error(`[GameEventBus] Error in async handler for "${String(event)}":`, err);
          });
        }
      } catch (err) {
        console.error(`[GameEventBus] Error in handler for "${String(event)}":`, err);
      }
    }
  }

  public clearAll(): void {
    this.listeners.clear();
  }
}

export const gameEvents = new GameEventBus();
