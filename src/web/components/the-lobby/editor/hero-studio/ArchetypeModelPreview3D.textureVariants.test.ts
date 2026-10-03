import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import * as preview from './ArchetypeModelPreview3D';

describe('Quaternius preview texture variants', () => {
  it('clones only matching outfit materials, uses an sRGB map, and restores materials on cleanup', () => {
    const applyVariant = (preview as any).applyQuaterniusTextureVariant;
    expect(applyVariant).toBeTypeOf('function');

    const outfitMaterial = new THREE.MeshStandardMaterial();
    outfitMaterial.name = 'MI_Ranger';
    const skinMaterial = new THREE.MeshStandardMaterial();
    skinMaterial.name = 'MI_Regular_Male';
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), [outfitMaterial, skinMaterial]);
    const scene = new THREE.Group();
    scene.add(mesh);
    const variantTexture = new THREE.Texture();

    const restore = applyVariant(scene, variantTexture, 'ranger');

    const [variantMaterial, unchangedSkinMaterial] = mesh.material as THREE.Material[];
    const disposeSpy = vi.spyOn(variantMaterial, 'dispose');
    expect(variantMaterial).not.toBe(outfitMaterial);
    expect((variantMaterial as THREE.MeshStandardMaterial).map).toBe(variantTexture);
    expect(variantTexture.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(unchangedSkinMaterial).toBe(skinMaterial);

    restore();

    expect(mesh.material).toEqual([outfitMaterial, skinMaterial]);
    expect(disposeSpy).toHaveBeenCalledOnce();
  });
});
