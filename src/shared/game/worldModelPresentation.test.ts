import { describe, it, expect } from 'vitest';
import {
  resolveModelAssetUrl,
  getWorldModelPresentation,
  getModelModularComponents,
  getCanonicalModelDef,
} from './worldModelPresentation';
import { getCharacterModelProfile } from './characterProfiles';

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
      expect(resolveModelAssetUrl('builtin-model-brute')).toBe('/game-assets/models/humanoids/brute/brute.glb');
    });

    it('resolves models with glb/gltf extensions to game-assets directory', () => {
      expect(resolveModelAssetUrl('brute.glb')).toBe('/game-assets/models/humanoids/brute/brute.glb');
      expect(resolveModelAssetUrl('/game-assets/models/humanoids/brute/brute.glb')).toBe('/game-assets/models/humanoids/brute/brute.glb');
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
              isSubmesh: true,
              meshName: 'ChestMesh',
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
      expect(attachments[0].isSubmesh).toBe(true);
      expect(attachments[0].meshName).toBe('ChestMesh');
      expect(result?.modularModelUrls).toEqual(['/uploads/iron_chestplate.glb']);
    });

    it('returns undefined for invalid or non-3D input', () => {
      expect(getWorldModelPresentation(null)).toBeUndefined();
      expect(getWorldModelPresentation({})).toBeUndefined();
      expect(getWorldModelPresentation({ worldModel: { assetId: 'sprite_char', type: '2D Sprite' } })).toBeUndefined();
    });
  });

  describe('canonical built-in models and modular parts', () => {
    it('retrieves definition for brute', () => {
      const brute = getCanonicalModelDef('brute');
      expect(brute).toBeDefined();
      expect(brute?.skeleton).toBe('manny');
      expect(brute?.modelUrl).toBe('/game-assets/models/humanoids/brute/brute.glb');
      expect(brute?.defaultAnimationProfileId).toBe('GreystoneManny');

      const bruteByModel = getCanonicalModelDef('/game-assets/models/humanoids/brute/brute.glb');
      expect(bruteByModel).toBeDefined();
      expect(bruteByModel?.id).toBe('brute');
    });

    it('returns modular components for brute character builder and wardrobe', () => {
      const bruteParts = getModelModularComponents('brute');
      expect(bruteParts.length).toBeGreaterThan(0);
      expect(bruteParts.some((p) => p.meshName === 'Helmet1')).toBe(true);
      expect(bruteParts.some((p) => p.meshName === 'Torso1')).toBe(true);
      expect(bruteParts.some((p) => p.meshName === 'Cape1')).toBe(true);

      expect(getModelModularComponents('unknown_model')).toEqual([]);
    });

    it('preserves each individual citizen model and does not assign incompatible animation profiles', () => {
      for (const name of ['girl_1', 'kid_1', 'man_1']) {
        const id = `builtin-citizen-${name}`;
        const expectedUrl = `/game-assets/models/humanoids/citizens/glb/${name}.glb`;
        expect(resolveModelAssetUrl(id)).toBe(expectedUrl);
        expect(getCanonicalModelDef(id)?.modelUrl).toBe(expectedUrl);
        expect(getCharacterModelProfile(id)?.id).toBe('citizens');
        expect(getWorldModelPresentation(id)).toMatchObject({
          modelUrl: expectedUrl,
          animationProfileId: undefined,
        });
      }
    });

    it('does not advertise an animation profile that is not registered for the Asian heroine', () => {
      expect(getWorldModelPresentation('asian_girl')?.animationProfileId).toBeUndefined();
    });
  });
});

