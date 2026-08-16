import { describe, it, expect, beforeEach } from 'vitest';
import { NavigationHistoryStack } from './navigationHistory';

describe('Navigation History Stack & Breadcrumbs Engine (Bible 19 & Bible 29)', () => {
  let nav: NavigationHistoryStack;

  beforeEach(() => {
    nav = new NavigationHistoryStack(10);
  });

  it('pushes navigation entries and handles back/forward stack traversal', () => {
    nav.push({ mapId: 'VILLAGE', mapName: 'Saints Village' });
    nav.push({ mapId: 'FOREST', mapName: 'Whispering Forest' });
    nav.push({ mapId: 'DUNGEON', mapName: 'Dark Cave' });

    expect(nav.getCurrent()?.mapId).toBe('DUNGEON');
    expect(nav.canGoBack()).toBe(true);
    expect(nav.canGoForward()).toBe(false);

    // Go back to Forest
    const back1 = nav.back();
    expect(back1?.mapId).toBe('FOREST');
    expect(nav.canGoForward()).toBe(true);

    // Go back to Village
    const back2 = nav.back();
    expect(back2?.mapId).toBe('VILLAGE');
    expect(nav.canGoBack()).toBe(false);

    // Go forward to Forest
    const fwd1 = nav.forward();
    expect(fwd1?.mapId).toBe('FOREST');
  });

  it('clears forward stack when a new branch is pushed', () => {
    nav.push({ mapId: 'MAP_A', mapName: 'Map A' });
    nav.push({ mapId: 'MAP_B', mapName: 'Map B' });

    nav.back(); // Back to MAP_A (MAP_B in future)
    expect(nav.canGoForward()).toBe(true);

    // Push new branch MAP_C
    nav.push({ mapId: 'MAP_C', mapName: 'Map C' });
    expect(nav.canGoForward()).toBe(false);
    expect(nav.getCurrent()?.mapId).toBe('MAP_C');
  });

  it('generates breadcrumb trails up to requested limit', () => {
    nav.push({ mapId: 'ZONE_1', mapName: 'Zone 1' });
    nav.push({ mapId: 'ZONE_2', mapName: 'Zone 2' });
    nav.push({ mapId: 'ZONE_3', mapName: 'Zone 3' });
    nav.push({ mapId: 'ZONE_4', mapName: 'Zone 4' });

    const breadcrumbs = nav.getBreadcrumbs(3);
    expect(breadcrumbs.length).toBe(3);
    expect(breadcrumbs.map((b) => b.mapId)).toEqual(['ZONE_2', 'ZONE_3', 'ZONE_4']);
  });
});
