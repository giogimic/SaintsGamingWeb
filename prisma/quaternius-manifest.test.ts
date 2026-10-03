import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const manifest = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'prisma/quaternius-manifest.json'), 'utf8')) as any[];
const byId = new Map(manifest.map((entry) => [entry.id, entry]));

function getMetadata(id: string) {
  return JSON.parse(byId.get(id)?.metadata || '{}');
}

describe('Quaternius asset manifest', () => {
  it('points every bundled Quaternius model at a checked-in public asset', () => {
    for (const entry of manifest) {
      if (!entry.source?.startsWith('/models/quaternius/')) continue;
      const assetPath = path.resolve(process.cwd(), 'public', entry.source.slice(1));
      expect(fs.existsSync(assetPath), `${entry.id} -> ${entry.source}`).toBe(true);
    }
  });

  it('exposes all locally supplied outfit parts with compatible body and rig metadata', () => {
    const outfits = manifest.filter((entry) => /^quat-(male|female)_(peasant|ranger)_/.test(entry.id));
    expect(outfits).toHaveLength(20);
    for (const entry of outfits) {
      const metadata = JSON.parse(entry.metadata);
      expect(metadata.pack).toBe('quaternius');
      expect(metadata.showInCharacterCreation).toBe(true);
      expect(metadata.skeleton).toBe('quaternius_universal');
      expect(['male', 'female']).toContain(metadata.baseBodyType);
    }
  });
  it('stores named clips, categorized actions, and the measured rig signature for all four supplied banks', () => {
    for (const suffix of ['ual1_standard', 'ual1_standard_rm', 'ual2_standard', 'ual2_standard_rm']) {
      const metadata = getMetadata(`quat-${suffix}`);
      const presentation = metadata.presentation;
      expect(presentation.animations.targetSkeleton).toBe('quaternius_universal');
      expect(presentation.animations.boneNames).toHaveLength(65);
      expect(presentation.animations.availableClips).toHaveLength(43);
      expect(presentation.categorizedAnimations).toHaveLength(43);
      expect(new Set(presentation.categorizedAnimations.map((clip: any) => clip.clipName)).size).toBe(43);
    }
  });

  it('keeps the verified alternate maps available as outfit-family metadata', () => {
    const peasant = getMetadata('quat-male_peasant_body');
    const ranger = getMetadata('quat-male_ranger_body');
    expect(peasant.textureVariants).toContainEqual(expect.objectContaining({
      textureVariantUrl: '/models/quaternius/textures/T_Peasant_2_BaseColor.png',
    }));
    expect(ranger.textureVariants).toContainEqual(expect.objectContaining({
      textureVariantUrl: '/models/quaternius/textures/T_Ranger_3_BaseColor.png',
    }));
  });

  it('publishes measured biped rig data and confirmed UAL compatibility for the supplied monsters', () => {
    for (const id of ['quat-imp', 'quat-puglin']) {
      const presentation = getMetadata(id).presentation;
      expect(presentation.animationProfileId).toBe('quaternius_native');
      expect(presentation.rigAnalysis.family).toBe('HUMANOID_BIPED');
      expect(presentation.animations.boneNames).toHaveLength(55);
      expect(presentation.animations.availableClips).toEqual([]);
      expect(presentation.animations.compatibleAnimationProfileIds).toEqual([
        'quaternius_native',
        'quaternius_2_native',
      ]);
    }
  });
});
