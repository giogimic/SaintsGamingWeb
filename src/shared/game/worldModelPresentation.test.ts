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
              textureVariantUrl: '/models/quaternius/textures/T_Peasant_2_BaseColor.png',
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
      expect(attachments).toHaveLength(2);
      expect(attachments[0].assetId).toBe('iron_chestplate');
      expect(attachments[0].modelUrl).toBe('/uploads/iron_chestplate.glb');
      expect(attachments[0].attachmentMode).toBe('SKINNED');
      expect(attachments[0].isSubmesh).toBe(true);
      expect(attachments[0].meshName).toBe('ChestMesh');
      expect(attachments[0].textureVariantUrl).toBe('/models/quaternius/textures/T_Peasant_2_BaseColor.png');
      expect(attachments[1]).toMatchObject({ assetId: 'hidden_cape', defaultVisible: false });
      expect(result?.modularModelUrls).toEqual(['/uploads/iron_chestplate.glb', '/uploads/hidden_cape.glb']);
    });

    it('returns undefined for invalid or non-3D input', () => {
      expect(getWorldModelPresentation(null)).toBeUndefined();
      expect(getWorldModelPresentation({})).toBeUndefined();
      expect(getWorldModelPresentation({ worldModel: { assetId: 'sprite_char', type: '2D Sprite' } })).toBeUndefined();
    });
  });

  describe('canonical built-in models and modular parts', () => {
    it('retrieves definition for Quaternius Universal Base Characters', () => {
      const male = getCanonicalModelDef('quaternius_base_male');
      expect(male).toBeDefined();
      expect(male?.isPlayable).toBe(true);
      expect(male?.modelUrl).toBe('/models/quaternius/quaternius_base_male.glb');

      const female = getCanonicalModelDef('quaternius_base_female');
      expect(female).toBeDefined();
      expect(female?.isPlayable).toBe(true);
      expect(female?.modelUrl).toBe('/models/quaternius/quaternius_base_female.glb');

      const superheroMale = getCanonicalModelDef('superhero_male_fullbody');
      expect(superheroMale).toBeDefined();
      expect(superheroMale?.isPlayable).toBe(true);
    });

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

    it('returns empty array for unknown modular models', () => {
      expect(getModelModularComponents('unknown_model')).toEqual([]);
    });

    it('retrieves Bestiary monster definitions', () => {
      const imp = getCanonicalModelDef('imp');
      expect(imp).toBeDefined();
      expect(imp?.category).toBe('monster');
      expect(imp?.isPlayable).toBe(false);
      expect(imp?.modelUrl).toBe('/models/quaternius/imp.glb');

      const puglin = getCanonicalModelDef('puglin');
      expect(puglin).toBeDefined();
      expect(puglin?.category).toBe('monster');
      expect(puglin?.isPlayable).toBe(false);
      expect(puglin?.modelUrl).toBe('/models/quaternius/puglin.glb');
    });

    it('preserves explicit Quaternius model paths instead of resolving them as stale aliases', () => {
      expect(resolveModelAssetUrl('/models/quaternius/imp.glb')).toBe('/models/quaternius/imp.glb');
      expect(resolveModelAssetUrl('/models/quaternius/puglin.glb')).toBe('/models/quaternius/puglin.glb');
    });

    it('does not assign Brute identity or animation defaults to an unknown explicit model', () => {
      const presentation = getWorldModelPresentation({
        type: '3D Model',
        assetId: 'custom_biped_upload',
        modelUrl: '/uploads/custom_biped_upload.glb',
      });
      expect(presentation?.modelUrl).toBe('/uploads/custom_biped_upload.glb');
      expect(presentation?.assetId).toBe('custom_biped_upload');
      expect(presentation?.animationProfileId).toBeUndefined();
    });
  });
});

