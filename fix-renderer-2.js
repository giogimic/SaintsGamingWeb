const fs = require('fs');

// 1. Fix missing imports in Renderer.ts
let rendererText = fs.readFileSync('src/engine/Renderer.ts', 'utf8');

const additionalImports = `
import { clampCameraFocus } from '../shared/game/cameraSettings';
import { SpriteSheetConfig } from '../shared/game/spriteDefinitions';
import { DynamicTexture, Scene, ParticleSystem, FreeCamera } from '@babylonjs/core';
`;

if (!rendererText.includes('import { FreeCamera }')) {
  rendererText = rendererText.replace("import { DefaultRenderingPipeline", additionalImports + "import { DefaultRenderingPipeline");
}

// Fix missing engine sub-properties
rendererText = rendererText.replace(/this\.engine\.runRenderLoop/g, 'this.engine.engine.runRenderLoop');
rendererText = rendererText.replace(/this\.engine\.stopRenderLoop/g, 'this.engine.engine.stopRenderLoop');
rendererText = rendererText.replace(/this\.engine\.getDeltaTime/g, 'this.engine.engine.getDeltaTime');
rendererText = rendererText.replace(/this\.engine\.getRenderWidth/g, 'this.engine.engine.getRenderWidth');
rendererText = rendererText.replace(/this\.engine\.getRenderHeight/g, 'this.engine.engine.getRenderHeight');

fs.writeFileSync('src/engine/Renderer.ts', rendererText);

// 2. Fix privacy in BabylonEngine.ts
let engineText = fs.readFileSync('src/engine/BabylonEngine.ts', 'utf8');

const enginePropsToPublic = [
  'woodFloorTexture', 'indoorWallTexture', 'waterTexture', 'waterMaterials',
  'weatherParticleSystem', 'activeWeatherPreset', 'defaultPlayerTexture',
  'isRunning', 'waterAnimTime', 'lastWaterUpdateTime', 'waterFlowSpeed',
  'shadowMeshes', 'currentRawMapData'
];

for (const prop of enginePropsToPublic) {
  engineText = engineText.replace(new RegExp(`private ${prop}:`, 'g'), `public ${prop}:`);
  engineText = engineText.replace(new RegExp(`private ${prop} `, 'g'), `public ${prop} `);
  engineText = engineText.replace(new RegExp(`private ${prop}\\?`, 'g'), `public ${prop}?`);
  engineText = engineText.replace(new RegExp(`private ${prop}=`, 'g'), `public ${prop}=`);
}

// Make methods public
const engineMethodsToPublic = [
  'setSpriteCellUVs', 'updateTargetSelectionIndicator'
];
for (const m of engineMethodsToPublic) {
  engineText = engineText.replace(new RegExp(`private ${m}\\(`, 'g'), `public ${m}(`);
}

fs.writeFileSync('src/engine/BabylonEngine.ts', engineText);

console.log('Fixed Renderer round 2');
