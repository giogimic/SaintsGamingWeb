const fs = require('fs');

let content = fs.readFileSync('src/engine/InputController.ts', 'utf8');

const inputProps = [
  'onEditorPointerDown', 'onEditorPointerMove', 'onEditorPointerUp',
  'onEditorWheel', 'onEditorKeyDown', 'onEditorDblClick',
  'onEditorAuxClick', 'onEditorKeyUp', 'onEntityClick',
  'editorPanPointerId', 'editorPanLastClientX', 'editorPanLastClientY',
  'editorSpaceHeld', 'editorPanKeysHeld', 'editorPanAnimFrameId'
];

const inputMethods = [
  'handleEditorPointerDown', 'handleEditorPointerMove', 'handleEditorPointerUp',
  'panEditorCameraByScreenDelta', 'startEditorKeyboardPan', 'startEditorPanLoop',
  'panEditorCameraToTile', 'resolveTilePick', 'pickTileFromGroundPlane',
  'pickTileAtScreenCoord', 'pickWorldTarget', 'enableTilePicking', 'disableTilePicking'
];

const ownMembers = ['engine', ...inputProps, ...inputMethods];

// Replace all this.foo with this.engine.foo IF foo is NOT in ownMembers
content = content.replace(/this\.([a-zA-Z0-9_]+)/g, (match, prop) => {
  if (ownMembers.includes(prop)) {
    return match;
  }
  return `this.engine.${prop}`;
});

// Also, in BabylonEngine, we need to initialize it and route references
let engineContent = fs.readFileSync('src/engine/BabylonEngine.ts', 'utf8');
if (!engineContent.includes("import { InputController }")) {
  engineContent = engineContent.replace("import { VoxelController } from './VoxelController';", "import { VoxelController } from './VoxelController';\nimport { InputController } from './InputController';");
}
if (!engineContent.includes("this.input = new InputController(this);")) {
  engineContent = engineContent.replace("this.voxel = new VoxelController(this);", "this.voxel = new VoxelController(this);\n    this.input = new InputController(this);");
}

for (const prop of ownMembers) {
  if (prop === 'engine') continue;
  engineContent = engineContent.replace(new RegExp(`this\\.${prop}\\b`, 'g'), `this.input.${prop}`);
}

// Make private members public in BabylonEngine if they were accessed (I already did a bunch, but maybe more)
fs.writeFileSync('src/engine/InputController.ts', content);
fs.writeFileSync('src/engine/BabylonEngine.ts', engineContent);

// Update GameCanvasBabylon.tsx
let canvas = fs.readFileSync('src/web/components/the-lobby/babylon/GameCanvasBabylon.tsx', 'utf8');
for (const prop of ownMembers) {
  if (prop === 'engine') continue;
  canvas = canvas.replace(new RegExp(`engine\\.${prop}\\b`, 'g'), `engine.input.${prop}`);
  canvas = canvas.replace(new RegExp(`babylonEngine\\.${prop}\\b`, 'g'), `babylonEngine.input.${prop}`);
}
fs.writeFileSync('src/web/components/the-lobby/babylon/GameCanvasBabylon.tsx', canvas);

console.log('Fixed InputController and references');
