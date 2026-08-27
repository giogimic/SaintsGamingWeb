import { describe, expect, it } from 'vitest';

export interface WorkspaceMapTabConfig {
  mapId: string;
  mapName?: string;
}

export function formatMapTabId(mapId: string): string {
  return `map_${mapId}`;
}

export function parseMapTabId(tabId: string): string | null {
  if (tabId.startsWith('map_')) {
    return tabId.replace(/^map_/, '');
  }
  return null;
}

export function isMapTab(component: string, tabId: string): boolean {
  return component === 'map' || tabId.startsWith('map_');
}

describe('workspaceMapTabs', () => {
  it('formats map tab IDs consistently', () => {
    expect(formatMapTabId('DEMO_SANDBOX')).toBe('map_DEMO_SANDBOX');
    expect(formatMapTabId('SAINTS_VILLAGE')).toBe('map_SAINTS_VILLAGE');
  });

  it('parses map tab IDs to extract mapKey', () => {
    expect(parseMapTabId('map_DEMO_SANDBOX')).toBe('DEMO_SANDBOX');
    expect(parseMapTabId('map_DUNGEON_01')).toBe('DUNGEON_01');
    expect(parseMapTabId('viewport')).toBeNull();
    expect(parseMapTabId('properties')).toBeNull();
  });

  it('correctly identifies map tabs by component or ID', () => {
    expect(isMapTab('map', 'map_DEMO_SANDBOX')).toBe(true);
    expect(isMapTab('map', 'custom_id')).toBe(true);
    expect(isMapTab('custom', 'map_DUNGEON_01')).toBe(true);
    expect(isMapTab('viewport', 'viewport')).toBe(false);
    expect(isMapTab('build', 'build')).toBe(false);
  });
});
