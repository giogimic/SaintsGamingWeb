// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import * as BABYLON from '@babylonjs/core';
import { GLTFFileLoader } from '@babylonjs/loaders/glTF';
import { retargetAnimationGroup, selectAnimationGroupByName } from './animationRetarget';

beforeAll(() => {
  const loader = new GLTFFileLoader();
  loader.skipMaterials = true;
  loader.animationStartMode = 0;
  BABYLON.SceneLoader.RegisterPlugin(loader);
});

async function load(scene: BABYLON.Scene, source: string) {
  const bytes = new Uint8Array(fs.readFileSync(path.resolve('public', source.replace(/^\//, ''))));
  return BABYLON.SceneLoader.LoadAssetContainerAsync('', bytes, scene, undefined, '.glb');
}

describe('real GLB skeletal playback', () => {
  it('loads a meshless Manny file with its generic embedded take', async () => {
    const engine = new BABYLON.NullEngine();
    const scene = new BABYLON.Scene(engine);
    try {
      const source = await load(scene, '/animations/Paragon/GreystoneManny/Jog/Jog_Fwd.glb');
      expect(selectAnimationGroupByName(source.animationGroups, 'Jog/Jog_Fwd')?.targetedAnimations.length).toBeGreaterThan(0);
    } finally { scene.dispose(); engine.dispose(); }
  });

  it.each(['quaternius_base_male', 'quaternius_base_female', 'imp', 'puglin'])('moves actual linked thigh bones on %s after the source bank is disposed', async (model) => {
    const engine = new BABYLON.NullEngine();
    const scene = new BABYLON.Scene(engine);
    try {
      const actor = await load(scene, `/models/quaternius/${model}.glb`);
      actor.addAllToScene();
      const source = await load(scene, '/models/quaternius/ual1_standard.glb');
      const sourceGroup = selectAnimationGroupByName(source.animationGroups, 'Jog_Fwd_Loop')!;
      const result = retargetAnimationGroup(sourceGroup, 'run_fwd', actor.transformNodes, scene, { minimumBoneMatchRatio: 0.7 });
      expect(result?.group.targetedAnimations.length).toBeGreaterThan(0);
      source.dispose();
      const group = result!.group;
      const skeleton = actor.skeletons[0];
      const thigh = skeleton.bones.find((bone) => bone.name === 'thigh_l')!;
      group.start(true);
      group.goToFrame(group.from + (group.to - group.from) * 0.1);
      skeleton.prepare(true);
      const first = Array.from(thigh.getLocalMatrix().m);
      group.goToFrame(group.from + (group.to - group.from) * 0.6);
      skeleton.prepare(true);
      expect(Array.from(thigh.getLocalMatrix().m)).not.toEqual(first);
    } finally { scene.dispose(); engine.dispose(); }
  });
});
