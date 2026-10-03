import { describe, expect, it } from 'vitest';
import {
  applyCharacterCreationWardrobe,
  getCharacterCreationWardrobeOptions,
  getDefaultCharacterCreationWardrobeIds,
  type ModelWardrobeItem,
} from './modelWardrobe';
import { createNpcVisualSnapshot, parseNpcVisualSnapshot } from './npcVisualSnapshot';

describe('authored character creation outfit', () => {
  const items: ModelWardrobeItem[] = [
    { assetId: 'body-hair', category: 'hair', defaultVisible: true, availableInCharacterCreation: true },
    { assetId: 'default-shirt', category: 'shirt', defaultVisible: true, availableInCharacterCreation: true },
    { assetId: 'default-pants', category: 'pants', defaultVisible: true, availableInCharacterCreation: true },
    { assetId: 'alternate-shirt', category: 'shirt', defaultVisible: false, availableInCharacterCreation: true },
    { assetId: 'fixed-sword', category: 'weapon_main', defaultVisible: true, availableInCharacterCreation: false },
  ];

  it('keeps authored default clothing without an isStarterOutfit flag', () => {
    expect(getDefaultCharacterCreationWardrobeIds(items)).toEqual(['body-hair', 'default-shirt', 'default-pants']);
  });

  it('offers explicitly allowed choices and excludes fixed equipment', () => {
    expect(getCharacterCreationWardrobeOptions(items).map((item) => item.assetId)).toEqual([
      'body-hair', 'default-shirt', 'default-pants', 'alternate-shirt',
    ]);
    expect(getDefaultCharacterCreationWardrobeIds([
      { assetId: 'legacy-shirt', defaultVisible: true },
      { assetId: 'never-offered', defaultVisible: true, availableInCharacterCreation: false },
    ])).toEqual(['legacy-shirt']);
  });

  it('saves the selected outfit while preserving fixed author equipment', () => {
    const result = JSON.parse(applyCharacterCreationWardrobe(JSON.stringify({
      worldModel: { type: '3D Model', assetId: 'stable-body-id', modelUrl: '/models/body.glb', modularAttachments: items },
    }), getDefaultCharacterCreationWardrobeIds(items)));
    expect(result.modularAttachments.map((item: ModelWardrobeItem) => item.assetId)).toEqual([
      'body-hair', 'default-shirt', 'default-pants', 'fixed-sword',
    ]);
    expect(result.worldModel.modularAttachments).toEqual(result.modularAttachments);
    expect(result.worldModel.modelUrl).toBe('/models/body.glb');
  });
});

describe('reusable NPC visual configuration', () => {
  const appearance = {
    assetProfileId: '3D Model', type: '3D Model' as const, assetId: 'body-db-id', modelUrl: '/uploads/body.glb',
    modelScale: 0.01, scale: 1.2, animationProfileId: 'humanoid',
    animations: { mapped: { idle: { clip: 'Idle', sourceKind: 'embedded' } } },
    materials: { Skin: { tintable: true, color: '#b47f5a' } },
    transform: { rotationY: 180, grounding: 0.01, cameraYOffset: 1.1 },
    modularAttachments: [{ assetId: 'coat-db-id', modelUrl: '/uploads/coat.glb', attachmentMode: 'SKINNED' as const, defaultVisible: true }],
  };

  it('round trips base URLs, animation mappings, materials, scale and selected pieces', () => {
    const snapshot = createNpcVisualSnapshot('Town Guard', appearance);
    expect(parseNpcVisualSnapshot(JSON.stringify(snapshot))).toEqual(appearance);
    expect(snapshot).not.toHaveProperty('capabilities');
    const copy = parseNpcVisualSnapshot(snapshot);
    copy.materials.Skin.color = '#fff';
    expect(snapshot.appearance.materials.Skin.color).toBe('#b47f5a');
  });

  it('accepts a standalone model binding with an explicit URL and no database id', () => {
    expect(parseNpcVisualSnapshot({ worldModel: { type: '3D Model', modelUrl: '/models/body.glb' } })).toEqual({
      type: '3D Model', assetProfileId: '3D Model', assetId: '', modelUrl: '/models/body.glb',
    });
  });

  it('rejects incompatible snapshot versions, invalid pieces and invalid scales', () => {
    expect(() => parseNpcVisualSnapshot({ kind: 'saints-npc-visual', version: 2, appearance })).toThrow(/not supported/);
    expect(() => parseNpcVisualSnapshot({ ...appearance, modularAttachments: [{ label: 'Missing asset' }] })).toThrow(/invalid body part/);
    expect(() => parseNpcVisualSnapshot({ ...appearance, modelScale: -1 })).toThrow(/positive/);
  });
});
