import * as BABYLON from '@babylonjs/core';

// Standard 64x64 "Wrapped" character skin mapping layout
// Face order in Babylon CreateBox: 0: Back, 1: Front, 2: Right, 3: Left, 4: Top, 5: Bottom
// Note: Minecraft uses top-left origin (0,0). Babylon UVs use bottom-left origin (0,0).
// We invert the V axis below.

function getUVs(tx: number, ty: number, tw: number, th: number, texWidth = 64, texHeight = 64): BABYLON.Vector4 {
  const uMin = tx / texWidth;
  const uMax = (tx + tw) / texWidth;
  // Invert V (since image top is v=1 in Babylon)
  const vMin = 1.0 - ((ty + th) / texHeight);
  const vMax = 1.0 - (ty / texHeight);
  return new BABYLON.Vector4(uMin, vMin, uMax, vMax);
}

export class WrappedCharacterMesher {
  public static createCharacter(id: string, scene: BABYLON.Scene, textureUrl: string): BABYLON.TransformNode {
    const root = new BABYLON.TransformNode(`wrapped_${id}`, scene);
    
    // Scale down to approx 2 blocks high (1 block = 1 unit). A typical blocky character is 2 tall.
    // Proportions: Head is 8x8x8, Torso is 8x12x4, Arms/Legs are 4x12x4.
    // Total height = 8 (head) + 12 (torso) + 12 (legs) = 32 pixels.
    // So 1 unit = 16 pixels.
    const pixelSize = 1 / 16;
    
    const mat = new BABYLON.StandardMaterial(`mat_${id}`, scene);
    const tex = new BABYLON.Texture(textureUrl, scene, true, false, BABYLON.Texture.NEAREST_SAMPLINGMODE);
    tex.hasAlpha = true;
    mat.diffuseTexture = tex;
    mat.specularColor = new BABYLON.Color3(0, 0, 0);

    // --- HEAD (8x8x8) ---
    // Top: 8,0 to 16,8
    // Bottom: 16,0 to 24,8
    // Right: 0,8 to 8,16
    // Front: 8,8 to 16,16
    // Left: 16,8 to 24,16
    // Back: 24,8 to 32,16
    const headUV = [
      getUVs(24, 8, 8, 8), // Back
      getUVs(8, 8, 8, 8),  // Front
      getUVs(0, 8, 8, 8),  // Right (Right side of face)
      getUVs(16, 8, 8, 8), // Left
      getUVs(8, 0, 8, 8),  // Top
      getUVs(16, 0, 8, 8), // Bottom
    ];
    const head = BABYLON.MeshBuilder.CreateBox(`head_${id}`, { width: 8 * pixelSize, height: 8 * pixelSize, depth: 8 * pixelSize, faceUV: headUV, wrap: true }, scene);
    head.material = mat;
    head.parent = root;
    head.position.y = (12 + 12 + 4) * pixelSize; // Center of head is 4 pixels above torso

    // --- TORSO (8 wide x 12 high x 4 deep) ---
    // Top: 20,16 to 28,20
    // Bottom: 28,16 to 36,20
    // Right: 16,20 to 20,32
    // Front: 20,20 to 28,32
    // Left: 28,20 to 32,32
    // Back: 32,20 to 40,32
    const torsoUV = [
      getUVs(32, 20, 8, 12), // Back
      getUVs(20, 20, 8, 12), // Front
      getUVs(16, 20, 4, 12), // Right
      getUVs(28, 20, 4, 12), // Left
      getUVs(20, 16, 8, 4),  // Top
      getUVs(28, 16, 8, 4),  // Bottom
    ];
    const torso = BABYLON.MeshBuilder.CreateBox(`torso_${id}`, { width: 8 * pixelSize, height: 12 * pixelSize, depth: 4 * pixelSize, faceUV: torsoUV, wrap: true }, scene);
    torso.material = mat;
    torso.parent = root;
    torso.position.y = (12 + 6) * pixelSize; // Center of torso is 6 pixels above legs

    // --- RIGHT ARM (4x12x4) ---
    // Top: 44,16 to 48,20
    // Bottom: 48,16 to 52,20
    // Right: 40,20 to 44,32
    // Front: 44,20 to 48,32
    // Left: 48,20 to 52,32
    // Back: 52,20 to 56,32
    const rightArmUV = [
      getUVs(52, 20, 4, 12), // Back
      getUVs(44, 20, 4, 12), // Front
      getUVs(40, 20, 4, 12), // Right
      getUVs(48, 20, 4, 12), // Left
      getUVs(44, 16, 4, 4),  // Top
      getUVs(48, 16, 4, 4),  // Bottom
    ];
    const rightArmPivot = new BABYLON.TransformNode(`arm_r_pivot_${id}`, scene);
    rightArmPivot.parent = root;
    rightArmPivot.position.x = -(4 + 2) * pixelSize; // 4 (half torso) + 2 (half arm)
    rightArmPivot.position.y = (12 + 12) * pixelSize; // Shoulder height

    const rightArm = BABYLON.MeshBuilder.CreateBox(`arm_r_${id}`, { width: 4 * pixelSize, height: 12 * pixelSize, depth: 4 * pixelSize, faceUV: rightArmUV, wrap: true }, scene);
    rightArm.material = mat;
    rightArm.parent = rightArmPivot;
    rightArm.position.y = -6 * pixelSize; // Hang down from pivot

    // --- LEFT ARM (4x12x4) ---
    // (using standard mapping or mirrored)
    // Left arm on standard 64x64 skin (if new format, usually at 32,48)
    // Let's use the old style mirrored mapping for simplicity if not present, or map correctly if it is.
    // For now we map to standard 1.8+ left arm (32,48 block)
    const leftArmUV = [
      getUVs(44, 52, 4, 12), // Back
      getUVs(36, 52, 4, 12), // Front
      getUVs(32, 52, 4, 12), // Right
      getUVs(40, 52, 4, 12), // Left
      getUVs(36, 48, 4, 4),  // Top
      getUVs(40, 48, 4, 4),  // Bottom
    ];
    const leftArmPivot = new BABYLON.TransformNode(`arm_l_pivot_${id}`, scene);
    leftArmPivot.parent = root;
    leftArmPivot.position.x = (4 + 2) * pixelSize;
    leftArmPivot.position.y = (12 + 12) * pixelSize; // Shoulder height

    const leftArm = BABYLON.MeshBuilder.CreateBox(`arm_l_${id}`, { width: 4 * pixelSize, height: 12 * pixelSize, depth: 4 * pixelSize, faceUV: leftArmUV, wrap: true }, scene);
    leftArm.material = mat;
    leftArm.parent = leftArmPivot;
    leftArm.position.y = -6 * pixelSize;

    // --- RIGHT LEG (4x12x4) ---
    // Right leg: 0,16 block
    const rightLegUV = [
      getUVs(12, 20, 4, 12), // Back
      getUVs(4, 20, 4, 12),  // Front
      getUVs(0, 20, 4, 12),  // Right
      getUVs(8, 20, 4, 12),  // Left
      getUVs(4, 16, 4, 4),   // Top
      getUVs(8, 16, 4, 4),   // Bottom
    ];
    const rightLegPivot = new BABYLON.TransformNode(`leg_r_pivot_${id}`, scene);
    rightLegPivot.parent = root;
    rightLegPivot.position.x = -2 * pixelSize;
    rightLegPivot.position.y = 12 * pixelSize; // Hip height

    const rightLeg = BABYLON.MeshBuilder.CreateBox(`leg_r_${id}`, { width: 4 * pixelSize, height: 12 * pixelSize, depth: 4 * pixelSize, faceUV: rightLegUV, wrap: true }, scene);
    rightLeg.material = mat;
    rightLeg.parent = rightLegPivot;
    rightLeg.position.y = -6 * pixelSize;

    // --- LEFT LEG (4x12x4) ---
    // Left leg: 16,48 block
    const leftLegUV = [
      getUVs(28, 52, 4, 12), // Back
      getUVs(20, 52, 4, 12), // Front
      getUVs(16, 52, 4, 12), // Right
      getUVs(24, 52, 4, 12), // Left
      getUVs(20, 48, 4, 4),  // Top
      getUVs(24, 48, 4, 4),  // Bottom
    ];
    const leftLegPivot = new BABYLON.TransformNode(`leg_l_pivot_${id}`, scene);
    leftLegPivot.parent = root;
    leftLegPivot.position.x = 2 * pixelSize;
    leftLegPivot.position.y = 12 * pixelSize; // Hip height

    const leftLeg = BABYLON.MeshBuilder.CreateBox(`leg_l_${id}`, { width: 4 * pixelSize, height: 12 * pixelSize, depth: 4 * pixelSize, faceUV: leftLegUV, wrap: true }, scene);
    leftLeg.material = mat;
    leftLeg.parent = leftLegPivot;
    leftLeg.position.y = -6 * pixelSize;

    // Add some simple walking animation on the pivots based on scene time
    scene.onBeforeRenderObservable.add(() => {
      // Very basic walking animation if the character is moving (we don't have velocity here, but we can make them idle breathe or walk)
      // This can be enhanced later by storing velocity on the root or updating it externally.
    });

    return root;
  }
}
