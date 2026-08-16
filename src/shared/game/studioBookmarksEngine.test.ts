import { describe, it, expect, beforeEach } from 'vitest';
import { StudioBookmarksEngine } from './studioBookmarksEngine';

describe('Studio Bookmarks & Tagging Engine (Bible 19 & Bible 27)', () => {
  let engine: StudioBookmarksEngine;

  beforeEach(() => {
    engine = new StudioBookmarksEngine();
  });

  it('adds, checks, and removes bookmarks', () => {
    const item = {
      id: 'map_saints_village',
      type: 'map' as const,
      title: 'Saints Village',
      folder: 'Hubs',
      tags: ['starter', 'town'],
    };

    const added = engine.addBookmark(item);
    expect(added.id).toBe('map_saints_village');
    expect(engine.hasBookmark('map_saints_village')).toBe(true);

    const removed = engine.removeBookmark('map_saints_village');
    expect(removed).toBe(true);
    expect(engine.hasBookmark('map_saints_village')).toBe(false);
  });

  it('toggles bookmarks dynamically', () => {
    const item = {
      id: 'npc_luna',
      type: 'npc' as const,
      title: 'Guide Luna',
    };

    const isAdded = engine.toggleBookmark(item);
    expect(isAdded).toBe(true);
    expect(engine.hasBookmark('npc_luna')).toBe(true);

    const isRemoved = engine.toggleBookmark(item);
    expect(isRemoved).toBe(false);
    expect(engine.hasBookmark('npc_luna')).toBe(false);
  });

  it('filters bookmarks by folder, type, and tag', () => {
    engine.addBookmark({
      id: 'map_1',
      type: 'map',
      title: 'Village',
      folder: 'Cities',
      tags: ['safe'],
    });

    engine.addBookmark({
      id: 'map_2',
      type: 'map',
      title: 'Dungeon',
      folder: 'Combat',
      tags: ['danger'],
    });

    engine.addBookmark({
      id: 'npc_1',
      type: 'npc',
      title: 'Guard',
      folder: 'Cities',
      tags: ['safe'],
    });

    expect(engine.filterByFolder('Cities').length).toBe(2);
    expect(engine.filterByType('map').length).toBe(2);
    expect(engine.filterByTag('safe').length).toBe(2);
  });

  it('serializes and deserializes bookmark lists correctly', () => {
    engine.addBookmark({
      id: 'quest_starter',
      type: 'quest',
      title: 'First Steps',
    });

    const json = engine.serialize();
    const newEngine = new StudioBookmarksEngine();
    newEngine.deserialize(json);

    expect(newEngine.hasBookmark('quest_starter')).toBe(true);
    expect(newEngine.getBookmark('quest_starter')?.title).toBe('First Steps');
  });
});
