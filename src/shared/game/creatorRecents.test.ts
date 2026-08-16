import { describe, it, expect, beforeEach } from 'vitest';
import { CreatorRecentsManager } from './creatorRecents';

describe('Creator Recent History & Quick Recents Resolver (Bible 19 & Bible 29)', () => {
  let recents: CreatorRecentsManager;

  beforeEach(() => {
    recents = new CreatorRecentsManager(3); // Small capacity for testing MRU eviction
  });

  it('records recent items in most-recently-used order', () => {
    recents.recordRecent({ id: 'map_1', type: 'map', title: 'Village' });
    recents.recordRecent({ id: 'map_2', type: 'map', title: 'Forest' });

    const list = recents.getRecents();
    expect(list.length).toBe(2);
    expect(list[0].id).toBe('map_2'); // Most recent
    expect(list[1].id).toBe('map_1');
  });

  it('updates existing item and moves it to front of recents', () => {
    recents.recordRecent({ id: 'map_1', type: 'map', title: 'Village' });
    recents.recordRecent({ id: 'map_2', type: 'map', title: 'Forest' });

    // Touch map_1 again
    recents.recordRecent({ id: 'map_1', type: 'map', title: 'Village Updated' });

    const list = recents.getRecents();
    expect(list[0].id).toBe('map_1');
    expect(list[0].title).toBe('Village Updated');
  });

  it('evicts oldest items when capacity is reached', () => {
    recents.recordRecent({ id: 'item_1', type: 'item', title: 'Sword' });
    recents.recordRecent({ id: 'item_2', type: 'item', title: 'Shield' });
    recents.recordRecent({ id: 'item_3', type: 'item', title: 'Helmet' });
    recents.recordRecent({ id: 'item_4', type: 'item', title: 'Boots' }); // Should evict item_1

    const list = recents.getRecents();
    expect(list.length).toBe(3);
    expect(list.map((i) => i.id)).toEqual(['item_4', 'item_3', 'item_2']);
    expect(list.some((i) => i.id === 'item_1')).toBe(false);
  });

  it('filters recents by entity type', () => {
    recents.recordRecent({ id: 'map_1', type: 'map', title: 'Village' });
    recents.recordRecent({ id: 'npc_1', type: 'npc', title: 'Luna' });

    const mapList = recents.getRecents('map');
    expect(mapList.length).toBe(1);
    expect(mapList[0].id).toBe('map_1');
  });

  it('serializes and deserializes cleanly', () => {
    recents.recordRecent({ id: 'loot_1', type: 'loot', title: 'Goblin Drop Table' });

    const json = recents.serialize();
    const newRecents = new CreatorRecentsManager();
    newRecents.deserialize(json);

    const list = newRecents.getRecents();
    expect(list.length).toBe(1);
    expect(list[0].id).toBe('loot_1');
  });
});
