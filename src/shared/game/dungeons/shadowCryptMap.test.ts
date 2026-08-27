import { describe, expect, it } from 'vitest';
import {
  SHADOW_CRYPT_MAP,
  SHADOW_CRYPT_MAP_ID,
  SHADOW_CRYPT_W,
  SHADOW_CRYPT_H,
} from '../../../server/shadowCryptMapSeed';
import { evaluateAtmosphere } from '../atmosphere/atmospherePresets';
import { DungeonInstanceManager } from '../instances/dungeonInstanceManager';

describe('Shadow Crypt Dungeon Map & Instancing (Phase 10)', () => {
  it('validates map dimensions, walkable spawn points, and boundary walls', () => {
    expect(SHADOW_CRYPT_MAP.id).toBe(SHADOW_CRYPT_MAP_ID);
    expect(SHADOW_CRYPT_MAP.width).toBe(SHADOW_CRYPT_W);
    expect(SHADOW_CRYPT_MAP.height).toBe(SHADOW_CRYPT_H);
    expect(SHADOW_CRYPT_MAP.logicGrid).toHaveLength(SHADOW_CRYPT_H);

    // Entrance spawn point is walkable
    const spawn = SHADOW_CRYPT_MAP.spawnPoint;
    expect(SHADOW_CRYPT_MAP.logicGrid[spawn.y][spawn.x]).toBe(0);

    // Perimeter boundary is solid wall (1)
    expect(SHADOW_CRYPT_MAP.logicGrid[0][0]).toBe(1);
    expect(SHADOW_CRYPT_MAP.logicGrid[SHADOW_CRYPT_H - 1][SHADOW_CRYPT_W - 1]).toBe(1);
  });

  it('defines monster spawns and boss chamber encounters', () => {
    expect(SHADOW_CRYPT_MAP.spawns).toHaveLength(4);

    const skeletonSpawns = SHADOW_CRYPT_MAP.spawns.filter(
      (s) => s.entityId === 'monster_skeleton_warrior'
    );
    const bossSpawn = SHADOW_CRYPT_MAP.spawns.find(
      (s) => s.entityId === 'monster_crypt_lord'
    );

    expect(skeletonSpawns).toHaveLength(3);
    expect(bossSpawn).toBeDefined();
    expect(bossSpawn?.x).toBe(12);
    expect(bossSpawn?.y).toBe(20);
  });

  it('evaluates dungeon atmosphere and fog presets cleanly', () => {
    const atmosphere = evaluateAtmosphere(
      SHADOW_CRYPT_MAP.lightingPreset,
      SHADOW_CRYPT_MAP.weatherType,
      'NIGHT'
    );

    expect(atmosphere.lighting.presetKey).toBe('DUNGEON');
    expect(atmosphere.weather.weatherKey).toBe('FOG');
    expect(atmosphere.finalAmbientColor).toBe('#1a1829');
    expect(atmosphere.finalFogDensity).toBeGreaterThanOrEqual(0.015);
  });

  it('integrates seamlessly with the Dungeon Instance Manager', () => {
    const manager = new DungeonInstanceManager();
    const instance = manager.createInstance({
      dungeonSlug: 'dungeon_shadow_crypt',
      baseMapId: SHADOW_CRYPT_MAP_ID,
      partyId: 'party_crusaders',
      leaderId: 'saint_paladin',
      partyMembers: ['saint_paladin', 'saint_cleric'],
      durationMinutes: 45,
      objectives: [
        { key: 'kill_skeletons', required: 3 },
        { key: 'kill_crypt_lord', required: 1 },
      ],
    });

    expect(instance.baseMapId).toBe('DUNGEON_SHADOW_CRYPT');
    expect(instance.partyMembers).toContain('saint_paladin');
    expect(manager.isPartyMember(instance.instanceId, 'saint_paladin')).toBe(true);

    manager.updateObjective(instance.instanceId, 'kill_skeletons', 3);
    manager.updateObjective(instance.instanceId, 'kill_crypt_lord', 1);

    expect(manager.getInstance(instance.instanceId)?.isCompleted).toBe(true);
  });
});
