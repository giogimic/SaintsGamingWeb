import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { NodeIO } from '@gltf-transform/core';

const ROOT = path.resolve(process.cwd(), 'public/models/quaternius');
const BODY_REGIONS = ['Head', 'Torso', 'Arms', 'Legs', 'Feet'];

describe('prepared Quaternius base character models', () => {
  it.each(['male', 'female'])('keeps a separate skinned mesh for each wardrobe region (%s)', async (bodyType) => {
    const document = await new NodeIO().read(path.join(ROOT, `quaternius_base_${bodyType}.glb`));
    const root = document.getRoot();
    const meshes = root.listMeshes();
    const jointNames = root.listSkins()[0]?.listJoints().map((joint) => joint.getName()) || [];

    for (const region of BODY_REGIONS) {
      expect(meshes.some((mesh) => mesh.getName() === `QuaterniusBody_${region}`)).toBe(true);
    }
    expect(jointNames).toHaveLength(65);
    expect(meshes.some((mesh) => /face|eyes|eyebrows/i.test(mesh.getName()))).toBe(true);
  });
});
