const fs = require('fs');

let content = fs.readFileSync('src/engine/VoxelController.ts', 'utf8');

const engineProps = [
  'scene',
  'camera',
  'rootNode',
  'currentMapId',
  'currentMapWidth',
  'currentMapHeight',
  'brushRadius',
  'brushShape'
];

for (const prop of engineProps) {
  const regex = new RegExp(`this\\.${prop}`, 'g');
  content = content.replace(regex, `this.engine.${prop}`);
}

const methodCalls = [
  'getCurrentTileSize'
];

for (const method of methodCalls) {
  const regex = new RegExp(`this\\.${method}`, 'g');
  content = content.replace(regex, `this.engine.${method}`);
}

// Remove empty VoxelWorldDoc import from my previous run if exists
content = content.replace(/import \{ VoxelWorld, VoxelWorldDocV3.*/g, '');
content = content.replace(/import \{ resolveVoxelTarget.*/g, '');
content = content.replace(/import \{ BrushShape.*/g, '');
content = content.replace(/import \{ isTilePickTarget.*/g, '');
content = content.replace(/import \{ Mesh,.*/g, '');
content = content.replace(/import \{ VoxelChunkMesher.*/g, '');


const imports = `import { Mesh, TransformNode, StandardMaterial, Color3, Color4, MeshBuilder, Matrix } from '@babylonjs/core';
import { VoxelChunkMesher } from './voxel/VoxelChunkMesher';
import { VoxelWorld, type VoxelWorldDocV3, SpatialVoxelWorldManager } from '../shared/game/voxel/VoxelWorldDoc';
import { resolveVoxelTarget, type VoxelTargetResolution } from '../shared/game/voxel/VoxelTargetResolver';
import { resolveConstrainedVoxelCoordinates, type VoxelBrushAxis } from '../shared/game/voxel/VoxelWord';
import { type BrushShape } from '../shared/game/brushGeometry';
import { isTilePickTarget } from '../shared/game/tilePaint';
`;

content = content.replace("import { BabylonEngine } from './BabylonEngine';", "import { BabylonEngine } from './BabylonEngine';\n" + imports);

fs.writeFileSync('src/engine/VoxelController.ts', content);
console.log('Fixed VoxelController.ts');
