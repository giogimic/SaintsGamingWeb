import { describe, it, expect } from 'vitest';
import { resolveModelAssetUrl, getWorldModelPresentation } from './worldModelPresentation';

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

    it('resolves models with glb/gltf extensions to game-assets directory', () => {
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
});
