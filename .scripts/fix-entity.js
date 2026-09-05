const fs = require('fs');

const entityProps = [
  'entities', 'nameplates', 'billboards', 'hoverIndicator', 'targetIndicator'
];

const entityMethods = [
  'updateEntities', 'updateLocalPlayerPos', 'destroyEntity', 'buildNameplate',
  'updatePlayerMovement', 'buildHoverHighlight', 'clearHoverHighlight',
  'setTargetSelectionIndicator', 'updateTargetSelectionIndicator',
  'startDeathAnimation', 'getInterpolatedPlayerPosition', 'startJumpAnimation'
];

const ownMembers = ['engine', ...entityProps, ...entityMethods];

// 1. Fix EntityController.ts
let entityText = fs.readFileSync('src/engine/EntityController.ts', 'utf8');

// Replace all this.foo with this.engine.foo IF foo is NOT in ownMembers
entityText = entityText.replace(/this\.([a-zA-Z0-9_]+)/g, (match, prop) => {
  if (ownMembers.includes(prop)) {
    return match;
  }
  return `this.engine.${prop}`;
});

// Add imports
const entityImports = `
import { Mesh, TransformNode, Vector3, Color3, StandardMaterial, ParticleSystem, Animation, MeshBuilder } from '@babylonjs/core';
import { AdvancedDynamicTexture, Rectangle, TextBlock } from '@babylonjs/gui';
import { ItemBillboardRenderer } from './ItemBillboardRenderer';
import { resolveEntitySpriteUrl } from '../shared/game/creatureCatalog';
import { resolveSpriteDefinition, spriteDefinitionToBabylonConfig } from '../shared/game/spriteDefinitions';
import { ENTITY_GROUND_CLEARANCE } from './helpers/babylonViewHelpers';
`;

if (!entityText.includes('import { Mesh')) {
  entityText = entityText.replace("import { BabylonEngine } from './BabylonEngine';", "import { BabylonEngine } from './BabylonEngine';\n" + entityImports);
}

// Ensure properties are public
for (const prop of entityProps) {
  entityText = entityText.replace(new RegExp(`private ${prop}:`, 'g'), `public ${prop}:`);
  entityText = entityText.replace(new RegExp(`private ${prop} `, 'g'), `public ${prop} `);
  entityText = entityText.replace(new RegExp(`private ${prop}\\?`, 'g'), `public ${prop}?`);
  entityText = entityText.replace(new RegExp(`private ${prop}=`, 'g'), `public ${prop}=`);
}

for (const m of entityMethods) {
  entityText = entityText.replace(new RegExp(`private ${m}\\(`, 'g'), `public ${m}(`);
}

fs.writeFileSync('src/engine/EntityController.ts', entityText);

// 2. Fix BabylonEngine.ts
let engineText = fs.readFileSync('src/engine/BabylonEngine.ts', 'utf8');

if (!engineText.includes("import { EntityController }")) {
  engineText = engineText.replace("import { Renderer } from './Renderer';", "import { Renderer } from './Renderer';\nimport { EntityController } from './EntityController';");
}
if (!engineText.includes("public entity: EntityController;")) {
  engineText = engineText.replace("public renderer: Renderer;", "public renderer: Renderer;\n  public entity: EntityController;");
}
if (!engineText.includes("this.entity = new EntityController(this);")) {
  engineText = engineText.replace("this.renderer = new Renderer(this);", "this.renderer = new Renderer(this);\n    this.entity = new EntityController(this);");
}

for (const prop of ownMembers) {
  if (prop === 'engine') continue;
  engineText = engineText.replace(new RegExp(`this\\.${prop}\\b`, 'g'), `this.entity.${prop}`);
}

fs.writeFileSync('src/engine/BabylonEngine.ts', engineText);

// 3. Fix InputController.ts, VoxelController.ts, Renderer.ts
const controllers = ['src/engine/InputController.ts', 'src/engine/VoxelController.ts', 'src/engine/Renderer.ts'];
for (const file of controllers) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  for (const prop of ownMembers) {
    if (prop === 'engine') continue;
    content = content.replace(new RegExp(`this\\.engine\\.${prop}\\b`, 'g'), `this.engine.entity.${prop}`);
  }
  fs.writeFileSync(file, content);
}

// 4. Fix GameCanvasBabylon.tsx
let canvas = fs.readFileSync('src/web/components/the-lobby/babylon/GameCanvasBabylon.tsx', 'utf8');
for (const prop of ownMembers) {
  if (prop === 'engine') continue;
  canvas = canvas.replace(new RegExp(`engine\\.${prop}\\b`, 'g'), `engine.entity.${prop}`);
  canvas = canvas.replace(new RegExp(`babylonEngine\\.${prop}\\b`, 'g'), `babylonEngine.entity.${prop}`);
  canvas = canvas.replace(new RegExp(`engineRef\\.current\\.${prop}\\b`, 'g'), `engineRef.current.entity.${prop}`);
}
fs.writeFileSync('src/web/components/the-lobby/babylon/GameCanvasBabylon.tsx', canvas);

console.log('Fixed Entity and references');
