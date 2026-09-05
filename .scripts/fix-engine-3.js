const fs = require('fs');

// 1. Make properties public in VoxelController.ts
let voxelController = fs.readFileSync('src/engine/VoxelController.ts', 'utf8');
voxelController = voxelController.replace(/private voxelSelectionBoxMesh/g, 'public voxelSelectionBoxMesh');
voxelController = voxelController.replace(/private voxelCursorMesh/g, 'public voxelCursorMesh');
voxelController = voxelController.replace(/private voxelCursorMaterial/g, 'public voxelCursorMaterial');
fs.writeFileSync('src/engine/VoxelController.ts', voxelController);

// 2. Fix GameCanvasBabylon.tsx line 2036
let gameCanvas = fs.readFileSync('src/web/components/the-lobby/babylon/GameCanvasBabylon.tsx', 'utf8');
// It might be `if (!engine.voxelWorld) return;` or something. Let's just do global replace again for engine.voxelWorld
gameCanvas = gameCanvas.replace(/engine\.voxelWorld/g, 'engine.voxel.voxelWorld');
gameCanvas = gameCanvas.replace(/babylonEngine\.voxelWorld/g, 'babylonEngine.voxel.voxelWorld');
fs.writeFileSync('src/web/components/the-lobby/babylon/GameCanvasBabylon.tsx', gameCanvas);

console.log('Fixed privacy in VoxelController and missed reference in GameCanvas');
