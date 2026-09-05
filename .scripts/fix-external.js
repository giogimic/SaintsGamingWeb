const fs = require('fs');

const files = [
  'src/web/components/the-lobby/babylon/GameCanvasBabylon.tsx',
  'src/web/components/the-lobby/editor/interaction/tools/BrushToolHandler.ts',
  'src/web/components/the-lobby/editor/interaction/tools/EraserToolHandler.ts',
  'src/web/components/the-lobby/editor/interaction/tools/FillToolHandler.ts'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/engine\.voxelWorld/g, 'engine.voxel.voxelWorld');
  content = content.replace(/engine\.meshDirtyVoxelChunks/g, 'engine.voxel.meshDirtyVoxelChunks');
  content = content.replace(/engine\.clearVoxelCursor/g, 'engine.voxel.clearVoxelCursor');
  content = content.replace(/engine\.setVoxelConstraints/g, 'engine.voxel.setVoxelConstraints');
  content = content.replace(/engine\.getVoxelSurfaceY/g, 'engine.voxel.getVoxelSurfaceY');
  
  // Also check babylonEngine
  content = content.replace(/babylonEngine\.voxelWorld/g, 'babylonEngine.voxel.voxelWorld');
  content = content.replace(/babylonEngine\.meshDirtyVoxelChunks/g, 'babylonEngine.voxel.meshDirtyVoxelChunks');
  content = content.replace(/babylonEngine\.clearVoxelCursor/g, 'babylonEngine.voxel.clearVoxelCursor');
  content = content.replace(/babylonEngine\.setVoxelConstraints/g, 'babylonEngine.voxel.setVoxelConstraints');
  content = content.replace(/babylonEngine\.getVoxelSurfaceY/g, 'babylonEngine.voxel.getVoxelSurfaceY');

  fs.writeFileSync(file, content);
}

console.log('Fixed external callers');
