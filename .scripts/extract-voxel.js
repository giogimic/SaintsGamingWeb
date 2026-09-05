const { Project, SyntaxKind } = require('ts-morph');
const fs = require('fs');

const project = new Project();
project.addSourceFileAtPath('src/engine/BabylonEngine.ts');
const sourceFile = project.getSourceFileOrThrow('src/engine/BabylonEngine.ts');
const engineClass = sourceFile.getClassOrThrow('BabylonEngine');

const voxelProperties = [
  'voxelSelectionBoxMesh', 'voxelMesher', 'voxelWorld', 'adjacentVoxelMeshes',
  'voxelCursorMesh', 'voxelCursorMaterial', 'voxelCursorBoxes', 'voxelCursorRoot',
  'voxelPlaneLockEnabled', 'voxelTargetPlaneY', 'voxelPlaneMask', 'voxelBuildUpMode', 'voxelBrushAxis'
];

const voxelMethods = [
  'loadVoxelWorld', 'clearAdjacentVoxelMeshes', 'streamAdjacentVoxelMap',
  'meshDirtyVoxelChunks', 'getVoxelSurfaceY', 'setVoxelConstraints',
  'resolveVoxelTargetAtScreenCoord', 'renderVoxelCursor', 'clearVoxelCursor'
];

let classBody = `import { BabylonEngine } from './BabylonEngine';\n\nexport class VoxelController {\n  private engine: BabylonEngine;\n  constructor(engine: BabylonEngine) {\n    this.engine = engine;\n  }\n\n`;

for (const p of voxelProperties) {
  const prop = engineClass.getProperty(p);
  if (prop) {
    classBody += prop.getText() + '\n';
    prop.remove();
  }
}

for (const m of voxelMethods) {
  const method = engineClass.getMethod(m);
  if (method) {
    let text = method.getText();
    classBody += text + '\n\n';
    method.remove();
  }
}

classBody += '}\n';

engineClass.addProperty({
  name: 'voxel',
  type: 'VoxelController',
  scope: 'public'
});

fs.writeFileSync('src/engine/VoxelController.ts', classBody);
sourceFile.saveSync();
console.log('Successfully extracted VoxelController and saved BabylonEngine.ts');
