import { describe, expect, it } from "vitest";
import { findBabylonBone, attachModularComponent, isWardrobeSkeletonCompatible } from "./babylonAttachmentHelpers";
import * as BABYLON from "@babylonjs/core";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";

describe("findBabylonBone", () => {
  it("resolves bones matching standard socket names", () => {
    const fakeSkeleton: any = {
      bones: [
        { name: "mixamorig:Hips" },
        { name: "mixamorig:Spine2" },
        { name: "mixamorig:Head" },
        { name: "mixamorig:RightHand" },
        { name: "mixamorig:LeftHand" },
        { name: "mixamorig:RightUpLeg" },
      ],
    };

    expect(findBabylonBone(fakeSkeleton, "headmount")?.name).toBe("mixamorig:Head");
    expect(findBabylonBone(fakeSkeleton, "chestmount")?.name).toBe("mixamorig:Spine2");
    expect(findBabylonBone(fakeSkeleton, "righthandmount")?.name).toBe("mixamorig:RightHand");
    expect(findBabylonBone(fakeSkeleton, "lefthandmount")?.name).toBe("mixamorig:LeftHand");
    expect(findBabylonBone(fakeSkeleton, "sheathedback")?.name).toBe("mixamorig:Spine2");
    expect(findBabylonBone(fakeSkeleton, "sheathedhip_r")?.name).toBe("mixamorig:RightUpLeg");
  });

  it("resolves bones matching Bip01 and direct bone names", () => {
    const fakeSkeleton: any = {
      bones: [
        { name: "Bip01 Pelvis" },
        { name: "Bip01 Head" },
        { name: "Bip01 R Hand" },
      ],
    };

    expect(findBabylonBone(fakeSkeleton, "head")?.name).toBe("Bip01 Head");
    expect(findBabylonBone(fakeSkeleton, "headmount")?.name).toBe("Bip01 Head");
    expect(findBabylonBone(fakeSkeleton, "righthandmount")?.name).toBe("Bip01 R Hand");
  });

  it("returns null when no skeleton or socket provided or when bone is not found", () => {
    expect(findBabylonBone(null, "headmount")).toBeNull();
    expect(findBabylonBone({ bones: [] } as any, "")).toBeNull();
    expect(findBabylonBone({ bones: [{ name: "Hips" }] } as any, "headmount")).toBeNull();
  });
});

describe('wardrobe rig compatibility', () => {
  it('accepts a head-only source rig for hair but rejects it as a full clothing rig', () => {
    const baseBones = ['pelvis', 'spine_01', 'Head', 'upperarm_l', 'upperarm_r', 'thigh_l', 'thigh_r'];
    expect(isWardrobeSkeletonCompatible(['Head'], baseBones, 0.7, 'hair')).toBe(true);
    expect(isWardrobeSkeletonCompatible(['Head'], baseBones, 0.7, 'clothing')).toBe(false);
  });
});

describe("attachModularComponent", () => {
  it("requires essential limb and torso matches before accepting skinned clothing", () => {
    const quaterniusBones = ['pelvis', 'spine_01', 'Head', 'upperarm_l', 'upperarm_r', 'thigh_l', 'thigh_r', 'hand_l'];
    expect(isWardrobeSkeletonCompatible(quaterniusBones, quaterniusBones)).toBe(true);
    expect(isWardrobeSkeletonCompatible(
      ['pelvis', 'spine_01', 'Head', 'hand_l'],
      quaterniusBones,
    )).toBe(false);
    expect(isWardrobeSkeletonCompatible(quaterniusBones, [])).toBe(false);
  });

  it("hides matching base components when hidesComponents is specified", () => {
    const disabledNames: string[] = [];
    const baseChildMeshes = [
      {
        name: "Character_Hair",
        setEnabled: (enabled: boolean) => {
          if (!enabled) disabledNames.push("Character_Hair");
        },
      },
      {
        name: "Character_Head",
        setEnabled: (enabled: boolean) => {
          if (!enabled) disabledNames.push("Character_Head");
        },
      },
    ];

    const engine = new NullEngine();
    const fakeScene = new BABYLON.Scene(engine);
    const modelWrapper = new BABYLON.TransformNode("modelWrapper", fakeScene);
    (modelWrapper as any).getChildMeshes = () => baseChildMeshes;
    const attachmentMesh = new BABYLON.Mesh("Modular_Helmet", fakeScene);
    const importedResult: any = {
      meshes: [attachmentMesh],
      skeletons: [],
      animationGroups: [],
    };

    const attachment: any = {
      assetId: "helmet_01",
      attachmentMode: "RIGID_SOCKET",
      socket: "headmount",
      hidesComponents: ["hair"],
    };

    const result = attachModularComponent({
      scene: fakeScene,
      id: "player_test",
      attIndex: 0,
      attachment,
      importedResult,
      modelWrapper,
      baseSkeleton: null,
    });

    expect(result.isSkinned).toBe(false);
    expect(attachmentMesh.isPickable).toBe(false);
    expect(disabledNames).toContain("Character_Hair");
    expect(disabledNames).not.toContain("Character_Head");
  });

  it("keeps only the selected mesh when attaching an internal submesh asset", () => {
    const engine = new NullEngine();
    const scene = new BABYLON.Scene(engine);
    const modelWrapper = new BABYLON.TransformNode("modelWrapper", scene);
    const selectedMesh = new BABYLON.Mesh("4_+Shirt1_01_0_0", scene);
    const otherMesh = new BABYLON.Mesh("4_+Skirt1_01_0_0", scene);

    attachModularComponent({
      scene,
      id: "player_test",
      attIndex: 0,
      attachment: {
        modelUrl: "/game-assets/models/humanoids/asian_girl/asian_girl.glb",
        assetId: "builtin-piece-ag_shirt",
        isSubmesh: true,
        meshName: "4_+Shirt1_01_0_0",
        attachmentMode: "RIGID_SOCKET",
      },
      importedResult: { meshes: [selectedMesh, otherMesh], skeletons: [], animationGroups: [] } as any,
      modelWrapper,
      baseSkeleton: null,
    });

    expect(selectedMesh.isEnabled()).toBe(true);
    expect(otherMesh.isEnabled()).toBe(false);
    scene.dispose();
    engine.dispose();
  });
});
