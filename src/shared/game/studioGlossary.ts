/**
 * Saints Gaming — Studio Canonical Glossary & Resource Types (Bible 29)
 * Authoritative single source of truth for resource types, UI modes, scoping keys, and ref schemas.
 */

export type CanonicalStudioMode = 'walk' | 'paint' | 'place' | 'populate' | 'script' | 'catalog';

export type CanonicalResourceType =
  | 'map'
  | 'asset'
  | 'quest'
  | 'dialogue'
  | 'item'
  | 'loot'
  | 'creature'
  | 'npc_def'
  | 'prefab'
  | 'ability'
  | 'status'
  | 'skill'
  | 'class'
  | 'recipe'
  | 'shop'
  | 'encounter'
  | 'logic_tile'
  | 'cutscene'
  | 'world_event'
  | 'package'
  | 'doc'
  | 'task'
  | 'region'
  | 'spawner'
  | 'ai_profile'
  | 'faction'
  | 'collection'
  | 'affix_pool'
  | 'economy_modifier';

export interface CanonicalResourceRef {
  type: CanonicalResourceType;
  id: string;
  gameId?: string;
}

export interface MapEntityRef {
  kind: 'entity';
  mapId: string;
  entityId: string;
}

export const CANONICAL_STUDIO_MODES_LIST: Array<{
  id: CanonicalStudioMode;
  label: string;
  hotkey: string;
  purpose: string;
}> = [
  { id: 'walk', label: 'Walk', hotkey: '`', purpose: 'Play-test in live world' },
  { id: 'paint', label: 'Paint', hotkey: '1', purpose: 'Terrain + Logic brush' },
  { id: 'place', label: 'Place', hotkey: '2', purpose: 'Stamp prefabs / entities' },
  { id: 'populate', label: 'Populate', hotkey: '3', purpose: 'NPCs, creatures, encounters' },
  { id: 'script', label: 'Script', hotkey: '4', purpose: 'Logic components, gates, quest links' },
  { id: 'catalog', label: 'Catalog', hotkey: '5', purpose: 'Definition editing without world paint' },
];

export function mapLegacyStudioMode(legacyMode: string): CanonicalStudioMode {
  switch (legacyMode.toLowerCase()) {
    case 'test':
      return 'walk';
    case 'develop':
    case 'build':
      return 'paint';
    case 'npc':
    case 'quest':
    case 'creature':
      return 'populate';
    case 'script':
      return 'script';
    case 'catalog':
      return 'catalog';
    case 'place':
      return 'place';
    default:
      return 'paint';
  }
}
