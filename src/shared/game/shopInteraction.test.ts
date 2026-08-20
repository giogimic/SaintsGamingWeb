import { describe, it, expect } from 'vitest';
import { queryInteractions } from './interactionResolver';
import { evaluateEntityTarget, evaluateTileTarget } from './worldTarget';
import { SPATIAL_LAYER_ALTITUDES, INTERFACE_Z_INDEX } from './spatialLayers';
import { EntityInstanceV1 } from './entities/types';

describe('Spatial & Interface Layer Priorities', () => {
  it('defines ascending viewport depth layer altitudes without collisions', () => {
    expect(SPATIAL_LAYER_ALTITUDES.BASE_MAP_GROUND).toBeLessThan(SPATIAL_LAYER_ALTITUDES.EDITOR_GUIDES);
    expect(SPATIAL_LAYER_ALTITUDES.EDITOR_GUIDES).toBeLessThan(SPATIAL_LAYER_ALTITUDES.DESTINATION_PREVIEW);
    expect(SPATIAL_LAYER_ALTITUDES.DESTINATION_PREVIEW).toBeLessThan(SPATIAL_LAYER_ALTITUDES.SMART_TARGET_RING);
    expect(SPATIAL_LAYER_ALTITUDES.SMART_TARGET_RING).toBeLessThan(SPATIAL_LAYER_ALTITUDES.SELECTION_OVERLAY);
    expect(SPATIAL_LAYER_ALTITUDES.SELECTION_OVERLAY).toBeLessThan(SPATIAL_LAYER_ALTITUDES.BRUSH_PREVIEW);
    expect(SPATIAL_LAYER_ALTITUDES.BRUSH_PREVIEW).toBeLessThan(SPATIAL_LAYER_ALTITUDES.HOVER_INDICATOR);
    expect(SPATIAL_LAYER_ALTITUDES.HOVER_INDICATOR).toBeLessThan(SPATIAL_LAYER_ALTITUDES.TEMP_TOOL_PREVIEW);
  });

  it('defines ascending interface z-index layers for DOM hierarchy', () => {
    expect(INTERFACE_Z_INDEX.VIEWPORT_CANVAS).toBeLessThan(INTERFACE_Z_INDEX.WORLD_SPATIAL_HUD);
    expect(INTERFACE_Z_INDEX.WORLD_SPATIAL_HUD).toBeLessThan(INTERFACE_Z_INDEX.GAMEPLAY_DOCKS);
    expect(INTERFACE_Z_INDEX.GAMEPLAY_DOCKS).toBeLessThan(INTERFACE_Z_INDEX.FLOATING_WINDOWS);
    expect(INTERFACE_Z_INDEX.FLOATING_WINDOWS).toBeLessThan(INTERFACE_Z_INDEX.FLOATING_ACTIVE_FOCUS);
    expect(INTERFACE_Z_INDEX.FLOATING_ACTIVE_FOCUS).toBeLessThan(INTERFACE_Z_INDEX.FULLSCREEN_MODALS);
    expect(INTERFACE_Z_INDEX.FULLSCREEN_MODALS).toBeLessThan(INTERFACE_Z_INDEX.CONTEXT_MENUS);
    expect(INTERFACE_Z_INDEX.CONTEXT_MENUS).toBeLessThan(INTERFACE_Z_INDEX.SYSTEM_CURTAIN);
  });
});

describe('Shop Interaction Resolver (Dual Entity & Region)', () => {
  it('resolves primary SHOP action for an entity-bound shopkeeper NPC', () => {
    const merchant: EntityInstanceV1 = {
      schemaVersion: 1,
      id: 'npc_merchant_oak',
      archetype: 'npc',
      components: {
        transform: { x: 10, y: 10 },
        identity: { name: 'Merchant Samuel', slug: 'merchant_samuel' },
        shop: { shopId: 'potions_general', isRegion: false },
        interact: { enabled: true },
      },
    };

    const target = evaluateEntityTarget({
      entity: merchant,
      playerPos: { x: 10, y: 11 }, // Distance = 1.0
      worldContext: { gameMode: 'EXPLORING', maxDistance: 2.5 },
    });

    expect(target.interactable).toBe(true);
    expect(target.primaryAction).toBeDefined();
    expect(target.primaryAction?.type).toBe('SHOP');
    expect(target.primaryAction?.label).toContain('Merchant Samuel');
    expect((target.primaryAction?.payload as any)?.shopId).toBe('potions_general');
  });

  it('resolves primary SHOP action for a region-bound shop counter tile', () => {
    const tileTarget = evaluateTileTarget({
      r: 15,
      c: 20,
      playerPos: { x: 20, y: 16 }, // Distance = 1.0
      isSolid: false,
      logicTag: { id: 7, name: 'Shop Counter', tagType: 'shop' },
    });

    expect(tileTarget.interactable).toBe(true);
    expect(tileTarget.primaryAction).toBeDefined();
    expect(tileTarget.primaryAction?.type).toBe('SHOP');
    expect(tileTarget.primaryAction?.label).toBe('Browse Counter');
    expect((tileTarget.primaryAction?.payload as any)?.isRegion).toBe(true);
  });
});
