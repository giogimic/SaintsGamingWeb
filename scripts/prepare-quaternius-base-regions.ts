import path from 'node:path';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { NodeIO } from '@gltf-transform/core';

const ROOT = path.resolve(process.cwd(), 'public/models/quaternius');
const BASES = [
  { file: 'quaternius_base_male_fullbody.glb', output: 'quaternius_base_male.glb', bodyNodeName: 'SuperHero_Male' },
  { file: 'quaternius_base_female_fullbody.glb', output: 'quaternius_base_female.glb', bodyNodeName: 'Superhero_Female' },
];

type Region = 'head' | 'torso' | 'arms' | 'legs' | 'feet';

function regionForBone(name: string): Region | undefined {
  const bone = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (/head|neck/.test(bone)) return 'head';
  if (/thigh|calf|upleg|lowerleg/.test(bone)) return 'legs';
  if (/foot|ball|toe/.test(bone)) return 'feet';
  if (/clavicle|arm|hand|finger|thumb|index|middle|ring|pinky/.test(bone)) return 'arms';
  if (/pelvis|hip|spine|root|armature/.test(bone)) return 'torso';
  return undefined;
}

function getRegionIndices(
  indices: ArrayLike<number>,
  joints: ArrayLike<number>,
  weights: ArrayLike<number>,
  jointNames: string[],
): Map<Region, number[]> {
  const byRegion = new Map<Region, number[]>([
    ['head', []], ['torso', []], ['arms', []], ['legs', []], ['feet', []],
  ]);

  for (let tri = 0; tri + 2 < indices.length; tri += 3) {
    const scores = new Map<Region, number>();
    const triangle = [indices[tri], indices[tri + 1], indices[tri + 2]];
    for (const vertex of triangle) {
      for (let influence = 0; influence < 4; influence++) {
        const offset = vertex * 4 + influence;
        const weight = Number(weights[offset] || 0);
        if (weight <= 0) continue;
        const region = regionForBone(jointNames[Number(joints[offset])] || '');
        if (region) scores.set(region, (scores.get(region) || 0) + weight);
      }
    }

    const winner = [...scores].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!winner) throw new Error(`Could not classify triangle ${tri / 3} by skin weights`);
    byRegion.get(winner)!.push(...triangle);
  }

  return byRegion;
}

function makeAccessorSubset(document: any, source: any, vertexIds: number[], name: string): any {
  const sourceArray = source.getArray();
  const componentCount = sourceArray.length / source.getCount();
  const values: number[] = [];
  for (const vertexId of vertexIds) {
    const offset = vertexId * componentCount;
    for (let component = 0; component < componentCount; component++) {
      values.push(sourceArray[offset + component]);
    }
  }
  const array = new sourceArray.constructor(values);
  const accessor = document.createAccessor(name)
    .setType(source.getType())
    .setArray(array)
    .setNormalized(source.getNormalized());
  return accessor;
}

function prepareBase(document: any, bodyNodeName: string): void {
  const root = document.getRoot();
  const sourceNode = root.listNodes().find((node: any) => node.getName() === bodyNodeName);
  if (!sourceNode?.getMesh() || !sourceNode.getSkin()) {
    throw new Error(`Missing skinned base mesh node: ${bodyNodeName}`);
  }
  const sourceMesh = sourceNode.getMesh();
  const primitives = sourceMesh.listPrimitives();
  if (primitives.length !== 1) throw new Error(`${bodyNodeName} must have one source primitive`);
  const sourcePrimitive = primitives[0];
  const indexAccessor = sourcePrimitive.getIndices();
  const jointAccessor = sourcePrimitive.getAttribute('JOINTS_0');
  const weightAccessor = sourcePrimitive.getAttribute('WEIGHTS_0');
  if (!indexAccessor || !jointAccessor || !weightAccessor) {
    throw new Error(`${bodyNodeName} is missing indexed skin-weight geometry`);
  }

  const jointNames = sourceNode.getSkin().listJoints().map((joint: any) => joint.getName());
  const regionIndices = getRegionIndices(
    indexAccessor.getArray(),
    jointAccessor.getArray(),
    weightAccessor.getArray(),
    jointNames,
  );
  const parent = sourceNode.getParentNode();
  if (!parent) throw new Error(`${bodyNodeName} must be parented under its armature`);

  for (const [region, globalIndices] of regionIndices) {
    if (globalIndices.length === 0) throw new Error(`${bodyNodeName} has no ${region} triangles`);
    const remap = new Map<number, number>();
    const localVertexIds: number[] = [];
    const localIndices: number[] = [];
    for (const globalIndex of globalIndices) {
      let local = remap.get(globalIndex);
      if (local === undefined) {
        local = localVertexIds.length;
        remap.set(globalIndex, local);
        localVertexIds.push(globalIndex);
      }
      localIndices.push(local);
    }

    const name = `QuaterniusBody_${region[0].toUpperCase()}${region.slice(1)}`;
    const mesh = document.createMesh(name);
    const primitive = document.createPrimitive().setMode(sourcePrimitive.getMode());
    for (const attribute of sourcePrimitive.listAttributes()) {
      primitive.setAttribute(
        attribute.getName(),
        makeAccessorSubset(document, attribute, localVertexIds, `${name}_${attribute.getName()}`),
      );
    }
    const IndexArray = localVertexIds.length <= 65535 ? Uint16Array : Uint32Array;
    primitive.setIndices(document.createAccessor(`${name}_indices`).setType('SCALAR').setArray(new IndexArray(localIndices)));
    primitive.setMaterial(sourcePrimitive.getMaterial());
    mesh.addPrimitive(primitive);

    const node = document.createNode(name)
      .setMesh(mesh)
      .setSkin(sourceNode.getSkin())
      .setTranslation(sourceNode.getTranslation())
      .setRotation(sourceNode.getRotation())
      .setScale(sourceNode.getScale());
    parent.addChild(node);
  }

  parent.removeChild(sourceNode);
  sourceNode.setMesh(null).setSkin(null);
  sourceNode.dispose();
  sourceMesh.dispose();
}

async function main(): Promise<void> {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  for (const base of BASES) {
    const filePath = path.join(ROOT, base.file);
    const document = await io.read(filePath);
    prepareBase(document, base.bodyNodeName);
    const outputPath = path.join(ROOT, base.output);
    await io.write(outputPath, document);
    console.log(`Prepared ${path.basename(outputPath)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
