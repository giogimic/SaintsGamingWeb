const fs = require('fs');

// 1. Fix BabylonEngine.ts properties privacy and class property
let engineText = fs.readFileSync('src/engine/BabylonEngine.ts', 'utf8');

const toMakePublic = [
  'mapPickPlane', 'mapBoundaryMesh', 'activeProjectiles', 'brushPreviewMeshes',
  'selectionPreviewMeshes', 'actionPreviewBoundsMesh', 'actionPreviewMeshes',
  'multiSelectionBaseMesh', 'footprintSqMesh', 'footprintUnifiedMesh',
  'brushMode', 'activeLayerType', 'splatPreviewMesh', 'lastHoveredR', 'lastHoveredC',
  'canvas', 'cameraTargetX', 'cameraTargetZ', 'cameraSnapped'
];

for (const prop of toMakePublic) {
  engineText = engineText.replace(new RegExp(`private ${prop}:`, 'g'), `public ${prop}:`);
  engineText = engineText.replace(new RegExp(`private ${prop} `, 'g'), `public ${prop} `);
  engineText = engineText.replace(new RegExp(`private ${prop}\\?`, 'g'), `public ${prop}?`);
  engineText = engineText.replace(new RegExp(`private ${prop}=`, 'g'), `public ${prop}=`);
}

// Ensure public input: InputController exists
if (!engineText.includes('public input: InputController;')) {
  engineText = engineText.replace('public voxel: VoxelController;', 'public voxel: VoxelController;\n  public input: InputController;');
}

fs.writeFileSync('src/engine/BabylonEngine.ts', engineText);

// 2. Fix InputController.ts types and missing methods/properties
let inputText = fs.readFileSync('src/engine/InputController.ts', 'utf8');
const imports = `import { Vector3, Matrix, Ray } from '@babylonjs/core';
import { VoxelTargetResolution } from '../shared/game/voxel/VoxelTargetResolver';
`;
if (!inputText.includes('import { Vector3')) {
  inputText = inputText.replace("import { BabylonEngine } from './BabylonEngine';", "import { BabylonEngine } from './BabylonEngine';\n" + imports);
}

fs.writeFileSync('src/engine/InputController.ts', inputText);

// 3. Fix GameCanvasBabylon.tsx
let canvas = fs.readFileSync('src/web/components/the-lobby/babylon/GameCanvasBabylon.tsx', 'utf8');
// Fix missing input replacements
canvas = canvas.replace(/engine\.pickTileAtScreenCoord/g, 'engine.input.pickTileAtScreenCoord');
canvas = canvas.replace(/engine\.panEditorCameraToTile/g, 'engine.input.panEditorCameraToTile');

fs.writeFileSync('src/web/components/the-lobby/babylon/GameCanvasBabylon.tsx', canvas);

console.log('Fixed InputController privacy and imports');
