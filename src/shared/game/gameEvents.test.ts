import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gameEvents, GameEventBus } from './gameEvents';

describe('Shared Gameplay Domain Event Bus (Bible 34 §16)', () => {
  let bus: GameEventBus;

  beforeEach(() => {
    bus = new GameEventBus();
  });

  it('broadcasts creature:captured event to multiple subscriber systems', () => {
    const inventorySpy = vi.fn();
    const questSpy = vi.fn();
    const achievementSpy = vi.fn();

    bus.on('creature:captured', inventorySpy);
    bus.on('creature:captured', questSpy);
    bus.on('creature:captured', achievementSpy);

    bus.emit('creature:captured', {
      playerId: 'player_1',
      creatureId: 'creature_rockitten_99',
      speciesSlug: 'rockitten',
      level: 5,
      mapId: 'DEMO_SANDBOX',
      timestamp: Date.now(),
    });

    expect(inventorySpy).toHaveBeenCalledTimes(1);
    expect(inventorySpy).toHaveBeenCalledWith(
      expect.objectContaining({ speciesSlug: 'rockitten', level: 5 })
    );
    expect(questSpy).toHaveBeenCalledTimes(1);
    expect(achievementSpy).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes listeners cleanly via returned unsubscribe function', () => {
    const spy = vi.fn();
    const unsubscribe = bus.on('resource:harvested', spy);

    bus.emit('resource:harvested', {
      playerId: 'player_1',
      resourceType: 'wood',
      skillSlug: 'woodcutting',
      xpEarned: 25,
      itemsYielded: [{ itemSlug: 'oak_log', quantity: 2 }],
      mapId: 'DEMO_SANDBOX',
      targetPos: { x: 5, y: 5 },
      timestamp: Date.now(),
    });

    expect(spy).toHaveBeenCalledTimes(1);

    unsubscribe();

    bus.emit('resource:harvested', {
      playerId: 'player_1',
      resourceType: 'wood',
      skillSlug: 'woodcutting',
      xpEarned: 25,
      itemsYielded: [{ itemSlug: 'oak_log', quantity: 2 }],
      mapId: 'DEMO_SANDBOX',
      targetPos: { x: 5, y: 5 },
      timestamp: Date.now(),
    });

    expect(spy).toHaveBeenCalledTimes(1); // No second call
  });

  it('handles once() subscriptions that automatically detach after first emission', () => {
    const spy = vi.fn();
    bus.once('combat:ended', spy);

    bus.emit('combat:ended', {
      contextId: 'battle_1',
      mode: 'real_time',
      victor: 'player',
      playerId: 'player_1',
      xpEarned: 100,
      timestamp: Date.now(),
    });

    bus.emit('combat:ended', {
      contextId: 'battle_2',
      mode: 'real_time',
      victor: 'enemy',
      playerId: 'player_1',
      xpEarned: 0,
      timestamp: Date.now(),
    });

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('safely catches errors in listeners without halting other handlers', () => {
    const badListener = vi.fn(() => {
      throw new Error('Exploding listener');
    });
    const goodListener = vi.fn();

    bus.on('item:crafted', badListener);
    bus.on('item:crafted', goodListener);

    expect(() => {
      bus.emit('item:crafted', {
        playerId: 'p1',
        itemSlug: 'iron_sword',
        quantity: 1,
        timestamp: Date.now(),
      });
    }).not.toThrow();

    expect(badListener).toHaveBeenCalled();
    expect(goodListener).toHaveBeenCalled();
  });
});
