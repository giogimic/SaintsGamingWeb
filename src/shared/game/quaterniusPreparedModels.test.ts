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
      const mesh = meshes.find((mesh) => mesh.getName() === `QuaterniusBody_${region}`);
      expect(mesh).toBeDefined();
      const primitive = mesh!.listPrimitives()[0];
      const position = primitive.getAttribute('POSITION');
      expect(position?.getCount()).toBeGreaterThan(0);
      for (const semantic of ['NORMAL', 'JOINTS_0', 'WEIGHTS_0']) {
        expect(primitive.getAttribute(semantic)?.getCount()).toBe(position!.getCount());
      }
      expect(primitive.listSemantics()).not.toContain('');
      const indices = Array.from(primitive.getIndices()!.getArray()!);
      expect(indices.length).toBeGreaterThan(0);
      expect(indices.every((index) => index >= 0 && index < position!.getCount())).toBe(true);
      expect(Array.from(position!.getArray()!).every(Number.isFinite)).toBe(true);
    }
    expect(jointNames).toHaveLength(65);
    expect(meshes.some((mesh) => /face|eyes|eyebrows/i.test(mesh.getName()))).toBe(true);
    const source = await new NodeIO().read(path.join(ROOT, `quaternius_base_${bodyType}_fullbody.glb`));
    const sourceBody = source.getRoot().listNodes().find((node) => node.getSkin() && /superhero/i.test(node.getName()))!.getMesh()!;
    const sourceIndices = sourceBody.listPrimitives().reduce((count, primitive) => count + primitive.getIndices()!.getCount(), 0);
    const preparedIndices = meshes.filter((mesh) => mesh.getName().startsWith('QuaterniusBody_'))
      .reduce((count, mesh) => count + mesh.listPrimitives()[0].getIndices()!.getCount(), 0);
    expect(preparedIndices).toBe(sourceIndices);
  });
});
