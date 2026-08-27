import { describe, expect, it } from 'vitest';
import { BaseEntityDefinition } from '../entities/types';
import { DependencyGraph, ProjectValidator } from '../validation/DependencyGraph';
import {
  computeContentHash,
  createVersionedDocument,
  validateCommit,
  applyCommit,
  resolveMergeConflict,
} from '../collaboration/optimisticLockEngine';
import {
  capturePlaytestSnapshot,
  restorePlaytestSnapshot,
} from '../simulation/playtestSnapshot';
import { DungeonInstanceManager } from '../instances/dungeonInstanceManager';
import { isDungeonInstanceId, toBaseMapId } from '../../net/mapIds';
import { emptyCreatureDef, CREATURE_CATEGORIES } from '../creatureCatalog';
import { evaluateAtmosphere } from '../atmosphere/atmospherePresets';

describe('Studio Creator End-to-End User Journeys (Phase 7)', () => {
  it('Journey 1: Project Dependency & Validation Pipeline', () => {
    const graph = new DependencyGraph();
    const validator = new ProjectValidator(graph);

    const entities: BaseEntityDefinition[] = [
      {
        id: 'QUEST_VALLEY',
        name: 'Valley of Trials Quest',
        type: 'quest',
        version: 1,
        components: {},
        assetReferences: ['NPC_ELDER', 'ITEM_KEY'],
        isPublished: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'NPC_ELDER',
        name: 'Elder Marcus',
        type: 'npc',
        version: 1,
        components: {},
        assetReferences: ['QUEST_INITIATION'],
        isPublished: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'ITEM_KEY',
        name: 'Crypt Key',
        type: 'item',
        version: 1,
        components: {},
        assetReferences: [],
        isPublished: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    entities.forEach((e) => graph.registerEntity(e));

    const validAssets1 = new Set(['NPC_ELDER', 'ITEM_KEY']);
    const issues1 = validator.validate(entities, validAssets1);
    expect(issues1).toHaveLength(1);
    expect(issues1[0].entityId).toBe('NPC_ELDER');
    expect(issues1[0].missingReferenceId).toBe('QUEST_INITIATION');

    // Register missing quest in valid set
    const validAssets2 = new Set(['NPC_ELDER', 'ITEM_KEY', 'QUEST_INITIATION']);
    const issues2 = validator.validate(entities, validAssets2);
    expect(issues2).toHaveLength(0);
  });

  it('Journey 2: Collaborative Multi-Author Concurrency & Conflict Resolution', () => {
    const baseMap = {
      id: 'MAP_DUNGEON_01',
      name: 'Dark Hollow',
      weather: 'CLEAR',
      ambientTrack: 'dungeon_wind',
      lightingPreset: 'DUNGEON',
      recommendedLevel: 20,
    };

    const doc = createVersionedDocument(baseMap.id, baseMap, 'author_alice');
    expect(doc.revisionNumber).toBe(1);

    // Alice updates lighting
    const aliceData = { ...baseMap, lightingPreset: 'BLOOD_MOON' };
    const aliceCommit = validateCommit(doc, doc.versionHash, aliceData);
    expect(aliceCommit.ok).toBe(true);
    const remoteDoc = applyCommit(doc, aliceData, 'author_alice');

    // Bob tries to update recommendedLevel from original base
    const bobData = { ...baseMap, recommendedLevel: 25 };
    const bobCommit = validateCommit(remoteDoc, doc.versionHash, bobData);
    expect(bobCommit.ok).toBe(false);

    // Conflict resolved using smart_merge
    if (!bobCommit.ok) {
      const merged = resolveMergeConflict(
        baseMap,
        bobCommit.conflict.localData,
        bobCommit.conflict.remoteDocument.data,
        'smart_merge'
      );

      expect(merged.lightingPreset).toBe('BLOOD_MOON'); // From Alice
      expect(merged.recommendedLevel).toBe(25); // From Bob
      expect(merged.name).toBe('Dark Hollow'); // Unchanged
    }
  });

  it('Journey 3: Playtest Sandbox Non-Destructive Flow', () => {
    const livePlayerState: {
      id: string;
      name: string;
      position: { x: number; y: number };
      currentMapId: string;
      hp: number;
      maxHp: number;
      gold: number;
      inventory: Record<string, number | undefined>;
    } = {
      id: 'player_hero_1',
      name: 'Saint Operative',
      position: { x: 30, y: 45 },
      currentMapId: 'SAINTS_VILLAGE',
      hp: 100,
      maxHp: 100,
      gold: 1500,
      inventory: { super_potion: 5, obsidian_blade: 1 },
    };

    // 1. Enter Playtest: Capture snapshot
    const snapshot = capturePlaytestSnapshot(livePlayerState.id, livePlayerState as any);

    // 2. Playtest simulation: Player dies, spends gold, teleports
    livePlayerState.position = { x: 999, y: 999 };
    livePlayerState.currentMapId = 'studio_pie_player_hero_1';
    livePlayerState.hp = 0;
    livePlayerState.gold = 0;
    delete livePlayerState.inventory.obsidian_blade;

    // 3. Exit Playtest: Restore original state
    let target = livePlayerState;
    restorePlaytestSnapshot(snapshot, (restored) => {
      target = restored as typeof livePlayerState;
    });

    expect(target.position).toEqual({ x: 30, y: 45 });
    expect(target.currentMapId).toBe('SAINTS_VILLAGE');
    expect(target.hp).toBe(100);
    expect(target.gold).toBe(1500);
    expect(target.inventory.obsidian_blade).toBe(1);
  });

  it('Journey 4: Dungeon Instancing & Objective Completion Flow', () => {
    const dungeonManager = new DungeonInstanceManager();

    const instance = dungeonManager.createInstance({
      dungeonSlug: 'crimson_depths',
      baseMapId: 'MAP_CRIMSON',
      partyId: 'party_elite_squad',
      leaderId: 'saint_leader',
      partyMembers: ['saint_leader', 'saint_scout', 'saint_healer'],
      durationMinutes: 30,
      objectives: [
        { key: 'defeat_minions', label: 'Defeat 10 Imps', required: 10 },
        { key: 'defeat_boss', label: 'Defeat Crimson Lord', required: 1 },
      ],
    });

    // Check Map ID codec
    expect(isDungeonInstanceId(instance.instanceId)).toBe(true);
    expect(toBaseMapId(instance.instanceId)).toBe(instance.instanceId);

    // Validate party membership
    expect(dungeonManager.isPartyMember(instance.instanceId, 'saint_scout')).toBe(true);
    expect(dungeonManager.isPartyMember(instance.instanceId, 'random_intruder')).toBe(false);

    // Progress objectives
    dungeonManager.updateObjective(instance.instanceId, 'defeat_minions', 10);
    expect(dungeonManager.getInstance(instance.instanceId)?.isCompleted).toBe(false);

    dungeonManager.updateObjective(instance.instanceId, 'defeat_boss', 1);
    expect(dungeonManager.getInstance(instance.instanceId)?.isCompleted).toBe(true);
    expect(dungeonManager.getInstance(instance.instanceId)?.clearedAt).toBeDefined();
  });

  it('Journey 5: Creature Taxonomy & Atmosphere Integration Pipeline', () => {
    // Creature taxonomy definitions
    const beastDef = emptyCreatureDef();
    beastDef.name = 'Buddy Beast';
    beastDef.category = 'beast';
    beastDef.catchRate = 0.45;

    const monsterDef = emptyCreatureDef();
    monsterDef.name = 'Abyssal Fiend';
    monsterDef.category = 'monster';
    monsterDef.aggroRadius = 8;
    monsterDef.respawnSec = 60;

    const mercDef = emptyCreatureDef();
    mercDef.name = 'Guard Veteran';
    mercDef.category = 'mercenary';
    mercDef.hireCost = 1000;
    mercDef.factionId = 'saints_guard';

    const validCategoryIds = CREATURE_CATEGORIES.map((c) => c.id);
    expect(validCategoryIds).toContain(beastDef.category);
    expect(validCategoryIds).toContain(monsterDef.category);
    expect(validCategoryIds).toContain(mercDef.category);

    // Atmosphere rendering pipeline
    const atmosphere = evaluateAtmosphere('DUNGEON', 'THUNDERSTORM', 'NIGHT');
    expect(atmosphere.lighting.presetKey).toBe('DUNGEON');
    expect(atmosphere.weather.weatherKey).toBe('THUNDERSTORM');
    expect(atmosphere.isNight).toBe(true);
    expect(atmosphere.finalFogDensity).toBeGreaterThan(0.01);
  });
});
