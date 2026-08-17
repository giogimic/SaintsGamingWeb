import { describe, it, expect, beforeEach } from 'vitest';
import { ServerContentCache, contentCache } from './contentCache';

describe('ServerContentCache Facade (Bible 28 §2 & §3)', () => {
  beforeEach(() => {
    contentCache.flushAll();
  });

  it('stores and retrieves cached data by domain and ID', () => {
    contentCache.set('map', 'saints_citadel', { name: 'Citadel', width: 40 });
    const cached = contentCache.get<{ name: string }>('map', 'saints_citadel');
    expect(cached).toBeDefined();
    expect(cached?.name).toBe('Citadel');
  });

  it('invalidates single resource key', () => {
    contentCache.set('quest', 'quest_1', { title: 'First Quest' });
    expect(contentCache.get('quest', 'quest_1')).toBeDefined();

    contentCache.invalidate('quest', 'quest_1');
    expect(contentCache.get('quest', 'quest_1')).toBeNull();
  });

  it('invalidates entire domain when ID is omitted', () => {
    contentCache.set('ability', 'strike', { power: 40 });
    contentCache.set('ability', 'fireball', { power: 50 });
    contentCache.set('item', 'bronze_sword', { price: 10 });

    contentCache.invalidate('ability');
    expect(contentCache.get('ability', 'strike')).toBeNull();
    expect(contentCache.get('ability', 'fireball')).toBeNull();
    expect(contentCache.get('item', 'bronze_sword')).toBeDefined();
  });

  it('flushes all caches on flush_all_caches trigger', () => {
    contentCache.set('map', 'map_1', {});
    contentCache.set('loot', 'loot_1', {});
    expect(contentCache.size()).toBe(2);

    contentCache.flushAll();
    expect(contentCache.size()).toBe(0);
  });
});
