import { describe, it, expect, beforeEach } from 'vitest';
import { StudioOmnisearchIndex, OmnisearchEntry } from './studioOmnisearchEngine';

describe('Studio Omnisearch Query Engine (Bible 19 & Bible 29)', () => {
  let index: StudioOmnisearchIndex;

  const mockEntries: OmnisearchEntry[] = [
    {
      id: 'map_village',
      domain: 'map',
      title: 'Saints Village',
      subtitle: 'Starting town and safe haven',
      keywords: ['town', 'spawn', 'hub'],
    },
    {
      id: 'map_forest',
      domain: 'map',
      title: 'Whispering Forest',
      subtitle: 'Dense woodland zone',
      keywords: ['trees', 'woodcutting', 'nature'],
    },
    {
      id: 'npc_luna',
      domain: 'npc',
      title: 'Guide Luna',
      subtitle: 'Town guide and questgiver',
      keywords: ['quest', 'starter'],
    },
    {
      id: 'creature_rockitten',
      domain: 'creature',
      title: 'Rockitten',
      subtitle: 'Geo elemental feline',
      keywords: ['beast', 'starter'],
    },
    {
      id: 'item_wood_axe',
      domain: 'item',
      title: 'Iron Wood Axe',
      subtitle: 'Harvesting tool',
      keywords: ['lumberjack', 'woodcutting'],
    },
    {
      id: 'action_save',
      domain: 'action',
      title: 'Save Map',
      subtitle: 'Ctrl+S',
      keywords: ['publish', 'persist'],
    },
  ];

  beforeEach(() => {
    index = new StudioOmnisearchIndex();
    index.addBatch(mockEntries);
  });

  it('ranks exact and prefix title matches higher than keyword matches', () => {
    const results = index.search('rockitten');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('creature_rockitten');
    expect(results[0].score).toBe(100);
  });

  it('matches subtitle and keywords', () => {
    const results = index.search('woodcutting');
    expect(results.length).toBe(2);
    // Both Whispering Forest and Iron Wood Axe match keyword woodcutting
    expect(results.some((r) => r.id === 'map_forest')).toBe(true);
    expect(results.some((r) => r.id === 'item_wood_axe')).toBe(true);
  });

  it('supports @domain prefix filtering', () => {
    const mapResults = index.search('@map forest');
    expect(mapResults.length).toBe(1);
    expect(mapResults[0].id).toBe('map_forest');

    const npcResults = index.search('@npc Luna');
    expect(npcResults.length).toBe(1);
    expect(npcResults[0].id).toBe('npc_luna');
  });

  it('returns empty array on unmatched queries', () => {
    const results = index.search('xyz999nonsense');
    expect(results.length).toBe(0);
  });
});
