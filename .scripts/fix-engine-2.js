const fs = require('fs');

let content = fs.readFileSync('src/engine/BabylonEngine.ts', 'utf8');

const toPublic = [
  'scene',
  'camera',
  'rootNode',
  'currentMapWidth',
  'currentMapHeight',
  'brushRadius',
  'brushShape'
];

for (const prop of toPublic) {
  content = content.replace(new RegExp(`private ${prop}:`, 'g'), `public ${prop}:`);
  content = content.replace(new RegExp(`private ${prop} `, 'g'), `public ${prop} `);
  content = content.replace(new RegExp(`private ${prop}\\?`, 'g'), `public ${prop}?`);
}

// Fix internal usages
const methods = [
  'loadVoxelWorld', 'clearAdjacentVoxelMeshes', 'streamAdjacentVoxelMap',
  'meshDirtyVoxelChunks', 'getVoxelSurfaceY', 'setVoxelConstraints',
  'resolveVoxelTargetAtScreenCoord', 'renderVoxelCursor', 'clearVoxelCursor'
];

for (const method of methods) {
  content = content.replace(new RegExp(`this\\.${method}`, 'g'), `this.voxel.${method}`);
}

content = content.replace(/this\.voxelWorld/g, 'this.voxel.voxelWorld');
content = content.replace(/this\.voxelMesher/g, 'this.voxel.voxelMesher');
content = content.replace(/this\.voxelSelectionBoxMesh/g, 'this.voxel.voxelSelectionBoxMesh');
content = content.replace(/this\.adjacentVoxelMeshes/g, 'this.voxel.adjacentVoxelMeshes');
content = content.replace(/this\.voxelCursorMesh/g, 'this.voxel.voxelCursorMesh');
content = content.replace(/this\.voxelCursorMaterial/g, 'this.voxel.voxelCursorMaterial');

fs.writeFileSync('src/engine/BabylonEngine.ts', content);

// Fix GameCanvasBabylon TS18048
let canvas = fs.readFileSync('src/web/components/the-lobby/babylon/GameCanvasBabylon.tsx', 'utf8');
canvas = canvas.replace(/engine\.voxel\.voxelWorld\./g, 'engine.voxel.voxelWorld?.');
canvas = canvas.replace(/babylonEngine\.voxel\.voxelWorld\./g, 'babylonEngine.voxel.voxelWorld?.');
// line 2036 error: Property 'voxelWorld' does not exist on type 'BabylonEngine'.
canvas = canvas.replace(/engine\.voxelWorld/g, 'engine.voxel.voxelWorld');
canvas = canvas.replace(/babylonEngine\.voxelWorld/g, 'babylonEngine.voxel.voxelWorld');
fs.writeFileSync('src/web/components/the-lobby/babylon/GameCanvasBabylon.tsx', canvas);

console.log('Fixed BabylonEngine internal usages and privacy, and GameCanvas');
