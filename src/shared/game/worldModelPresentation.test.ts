import { describe, it, expect } from 'vitest';
import {
  resolveModelAssetUrl,
  getWorldModelPresentation,
  getModelModularComponents,
  getCanonicalModelDef,
} from './worldModelPresentation';

describe('worldModelPresentation', () => {
  describe('resolveModelAssetUrl', () => {
    it('returns direct http/https/blob/data urls', () => {
      expect(resolveModelAssetUrl('https://example.com/model.glb')).toBe('https://example.com/model.glb');
      expect(resolveModelAssetUrl('http://example.com/model.gltf')).toBe('http://example.com/model.gltf');
      expect(resolveModelAssetUrl('blob:http://localhost:3000/123')).toBe('blob:http://localhost:3000/123');
    });

    it('resolves uploads and upload identifiers to GLB paths without appending png', () => {
      expect(resolveModelAssetUrl('uploads/hero.glb')).toBe('/uploads/hero.glb');
      expect(resolveModelAssetUrl('/uploads/hero.glb')).toBe('/uploads/hero.glb');
      expect(resolveModelAssetUrl('upload_abc123.glb')).toBe('/uploads/upload_abc123.glb');
      expect(resolveModelAssetUrl('upload_abc123')).toBe('/uploads/upload_abc123.glb');
      expect(resolveModelAssetUrl('asset_custom_robe')).toBe('/uploads/asset_custom_robe.glb');
    });

    it('resolves canonical built-in models without extensions', () => {
      expect(resolveModelAssetUrl('brute')).toBe('/game-assets/models/humanoids/brute/brute.glb');
      expect(resolveModelAssetUrl('adventurer')).toBe('/game-assets/models/humanoids/adventurer/adventurer.glb');
      expect(resolveModelAssetUrl('citizen')).toBe('/game-assets/models/citizen.glb');
      expect(resolveModelAssetUrl('golem')).toBe('/game-assets/models/creatures/golems/golem_base.glb');
    });

    it('resolves models with glb/gltf extensions to game-assets directory', () => {
      expect(resolveModelAssetUrl('brute.glb')).toBe('/game-assets/models/humanoids/brute/brute.glb');
      expect(resolveModelAssetUrl('adventurer.glb')).toBe('/game-assets/models/humanoids/adventurer/adventurer.glb');
      expect(resolveModelAssetUrl('citizen.glb')).toBe('/game-assets/models/citizen.glb');
      expect(resolveModelAssetUrl('golem.glb')).toBe('/game-assets/models/creatures/golems/golem_base.glb');
      expect(resolveModelAssetUrl('paladin.glb')).toBe('/game-assets/models/paladin.glb');
      expect(resolveModelAssetUrl('/game-assets/models/wizard.glb')).toBe('/game-assets/models/wizard.glb');
    });

    it('returns undefined for 2D sprites, images, and empty inputs', () => {
      expect(resolveModelAssetUrl('')).toBeUndefined();
      expect(resolveModelAssetUrl(null)).toBeUndefined();
      expect(resolveModelAssetUrl(undefined)).toBeUndefined();
      expect(resolveModelAssetUrl('creature_01.png')).toBeUndefined();
      expect(resolveModelAssetUrl('/sprites/player.png')).toBeUndefined();
      expect(resolveModelAssetUrl('random_slug_without_model_ext')).toBeUndefined();
    });
  });

  describe('getWorldModelPresentation', () => {
    it('constructs a 3D presentation definition with modular attachments', () => {
      const config = {
        worldModel: {
          assetId: 'hero_base',
          type: '3D Model',
          modelUrl: '/uploads/hero_base.glb',
          modelScale: 1.2,
          modularAttachments: [
            {
              assetId: 'iron_chestplate',
              modelUrl: '/uploads/iron_chestplate.glb',
              slot: 'chest',
              defaultVisible: true,
            },
            {
              assetId: 'hidden_cape',
              modelUrl: '/uploads/hidden_cape.glb',
              slot: 'back',
              defaultVisible: false,
            },
            {
              assetId: 'invalid_sprite_attachment',
              modelUrl: undefined,
              slot: 'head',
            }
          ]
        }
      };

      const result = getWorldModelPresentation(config);
      expect(result).toBeDefined();
      expect(result?.mode).toBe('3D');
      expect(result?.modelUrl).toBe('/uploads/hero_base.glb');
      expect(result?.modelScale).toBe(1.2);
      expect(result?.modularAttachments).toBeDefined();
      const attachments = result?.modularAttachments || [];
      expect(attachments).toHaveLength(1);
      expect(attachments[0].assetId).toBe('iron_chestplate');
      expect(attachments[0].modelUrl).toBe('/uploads/iron_chestplate.glb');
      expect(attachments[0].attachmentMode).toBe('SKINNED');
      expect(result?.modularModelUrls).toEqual(['/uploads/iron_chestplate.glb']);
    });

    it('returns undefined for invalid or non-3D input', () => {
      expect(getWorldModelPresentation(null)).toBeUndefined();
      expect(getWorldModelPresentation({})).toBeUndefined();
      expect(getWorldModelPresentation({ worldModel: { assetId: 'sprite_char', type: '2D Sprite' } })).toBeUndefined();
    });
  });

  describe('canonical built-in models and modular parts', () => {
    it('retrieves definitions for brute, adventurer, and golem', () => {
      const brute = getCanonicalModelDef('brute');
      expect(brute).toBeDefined();
      expect(brute?.skeleton).toBe('manny');
      expect(brute?.modelUrl).toBe('/game-assets/models/humanoids/brute/brute.glb');

      const adventurer = getCanonicalModelDef('adventurer.glb');
      expect(adventurer).toBeDefined();
      expect(adventurer?.skeleton).toBe('manny');
      expect(adventurer?.modelUrl).toBe('/game-assets/models/humanoids/adventurer/adventurer.glb');

      const citizen = getCanonicalModelDef('citizen.glb');
      expect(citizen).toBeDefined();
      expect(citizen?.skeleton).toBe('mixamo');
      expect(citizen?.defaultAnimationProfileId).toBe('MocapMobility');
      expect(citizen?.modelUrl).toBe('/game-assets/models/citizen.glb');

      const golem = getCanonicalModelDef('/game-assets/models/creatures/golems/golem_base.glb');
      expect(golem).toBeDefined();
      expect(golem?.skeleton).toBe('creature_custom');
      expect(golem?.embeddedAnimations).toContain('Golem|SmashAttack');
    });

    it('returns modular components for character builder and wardrobe', () => {
      const bruteParts = getModelModularComponents('brute');
      expect(bruteParts.length).toBeGreaterThan(0);
      expect(bruteParts.some((p) => p.meshName === 'Helmet1')).toBe(true);
      expect(bruteParts.some((p) => p.meshName === 'Torso1')).toBe(true);
      expect(bruteParts.some((p) => p.meshName === 'Cape1')).toBe(true);

      const adventurerParts = getModelModularComponents('adventurer');
      expect(adventurerParts.length).toBeGreaterThan(0);
      expect(adventurerParts.some((p) => p.meshName === 'Man_Pullover_Mesh')).toBe(true);
      expect(adventurerParts.some((p) => p.meshName === 'Man_Pants_Mesh')).toBe(true);

      const citizenParts = getModelModularComponents('citizen');
      expect(citizenParts.length).toBeGreaterThan(0);
      expect(citizenParts.some((p) => p.meshName === 'Body_010' && p.defaultVisible)).toBe(true);
      expect(citizenParts.some((p) => p.meshName === 'Clown_nose_001' && !p.defaultVisible)).toBe(true);

      expect(getModelModularComponents('unknown_model')).toEqual([]);
    });
  });
});

