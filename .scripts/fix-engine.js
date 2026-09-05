const fs = require('fs');

let content = fs.readFileSync('src/engine/BabylonEngine.ts', 'utf8');

// Add import if not present
if (!content.includes("import { VoxelController }")) {
  content = content.replace("export interface RenderedChunk {", "import { VoxelController } from './VoxelController';\n\nexport interface RenderedChunk {");
}

// Add initialization in constructor
if (!content.includes("this.voxel = new VoxelController(this);")) {
  content = content.replace("this.engine = new Engine(this.canvas, true, {", "this.voxel = new VoxelController(this);\n    this.engine = new Engine(this.canvas, true, {");
}

fs.writeFileSync('src/engine/BabylonEngine.ts', content);
console.log('Fixed BabylonEngine.ts');
