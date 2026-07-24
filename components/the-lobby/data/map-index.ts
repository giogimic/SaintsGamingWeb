import { GAME_MAPS, GameMapData } from './maps';

export type MapCategory = 'Town' | 'House' | 'Route' | 'Cave' | 'Dungeon' | 'Tower' | 'Special';

export interface MapIndexEntry {
  id: string;
  name: string;
  category: MapCategory;
  recommendedLevel: number;
  width: number;
  height: number;
  npcCount: number;
  gateCount: number;
  hasEncounters: boolean;
}

export function getMapCategory(id: string, name: string): MapCategory {
  const upper = (id + ' ' + name).toUpperCase();
  if (upper.includes('TOWN') || upper.includes('CITY') || upper.includes('VILLAGE')) return 'Town';
  if (upper.includes('HOUSE') || upper.includes('ROOM') || upper.includes('LAB') || upper.includes('CENTER')) return 'House';
  if (upper.includes('ROUTE') || upper.includes('PATH') || upper.includes('ROAD')) return 'Route';
  if (upper.includes('CAVE') || upper.includes('MINE') || upper.includes('TUNNEL')) return 'Cave';
  if (upper.includes('TOWER')) return 'Tower';
  if (upper.includes('DUNGEON') || upper.includes('SEWER')) return 'Dungeon';
  return 'Special';
}

export function getMapIndexList(): MapIndexEntry[] {
  return Object.values(GAME_MAPS).map((map: GameMapData) => {
    const width = map.grid[0]?.length || 24;
    const height = map.grid.length || 24;
    const npcCount = map.npcs?.length || 0;
    const gateCount = Object.keys(map.gates || {}).length;
    const hasEncounters = (map.encounterPool?.length || 0) > 0;
    const category = getMapCategory(map.id, map.name);

    let recommendedLevel = 1;
    if (category === 'Route') recommendedLevel = 3;
    else if (category === 'Cave') recommendedLevel = 8;
    else if (category === 'Tower') recommendedLevel = 15;
    else if (category === 'Dungeon') recommendedLevel = 22;

    return {
      id: map.id,
      name: map.name || map.id,
      category,
      recommendedLevel,
      width,
      height,
      npcCount,
      gateCount,
      hasEncounters
    };
  });
}

export function searchMapIndex(query: string): MapIndexEntry[] {
  const q = query.trim().toLowerCase();
  const all = getMapIndexList();
  if (!q) return all;
  return all.filter((entry) => 
    entry.id.toLowerCase().includes(q) ||
    entry.name.toLowerCase().includes(q) ||
    entry.category.toLowerCase().includes(q)
  );
}

export function getMapMetadata(mapId: string): MapIndexEntry | undefined {
  return getMapIndexList().find((m) => m.id === mapId);
}
