const fs = require('fs');

// 1. Fix InputController properties privacy and imports
let inputText = fs.readFileSync('src/engine/InputController.ts', 'utf8');

const inputProps = [
  'onEditorPointerDown', 'onEditorPointerMove', 'onEditorPointerUp',
  'onEditorWheel', 'onEditorKeyDown', 'onEditorDblClick',
  'onEditorAuxClick', 'onEditorKeyUp', 'onEntityClick',
  'editorPanPointerId', 'editorPanLastClientX', 'editorPanLastClientY',
  'editorSpaceHeld', 'editorPanKeysHeld', 'editorPanAnimFrameId'
];

for (const prop of inputProps) {
  inputText = inputText.replace(new RegExp(`private ${prop}:`, 'g'), `public ${prop}:`);
  inputText = inputText.replace(new RegExp(`private ${prop} `, 'g'), `public ${prop} `);
  inputText = inputText.replace(new RegExp(`private ${prop}\\?`, 'g'), `public ${prop}?`);
  inputText = inputText.replace(new RegExp(`private ${prop}=`, 'g'), `public ${prop}=`);
}

// Fix missing imports
const additionalImports = `import { isTilePickTarget, isInGridFootprint } from '../shared/game/tilePaint';\n`;
if (!inputText.includes('isTilePickTarget')) {
  inputText = inputText.replace("import { Vector3", additionalImports + "import { Vector3");
}

// Fix getRenderHeight
inputText = inputText.replace(/this\.engine\.getRenderHeight\(\)/g, 'this.engine.engine.getRenderHeight()');
// Actually let's check if it was this.engine.engine.getRenderHeight() in BabylonEngine...
// Yes, BabylonEngine has this.engine.getRenderHeight(). But inside InputController, this.engine is BabylonEngine, so it should be this.engine.engine.getRenderHeight().

fs.writeFileSync('src/engine/InputController.ts', inputText);

// 2. Fix BabylonEngine properties privacy
let engineText = fs.readFileSync('src/engine/BabylonEngine.ts', 'utf8');

const enginePropsToPublic = [
  'editorCameraMode', 'cameraVelocityYaw', 'cameraSettings',
  'cameraVelocityPitch', 'cameraPitch', 'currentTileSize', 'entityMeshes'
];

for (const prop of enginePropsToPublic) {
  engineText = engineText.replace(new RegExp(`private ${prop}:`, 'g'), `public ${prop}:`);
  engineText = engineText.replace(new RegExp(`private ${prop} `, 'g'), `public ${prop} `);
  engineText = engineText.replace(new RegExp(`private ${prop}\\?`, 'g'), `public ${prop}?`);
  engineText = engineText.replace(new RegExp(`private ${prop}=`, 'g'), `public ${prop}=`);
}

fs.writeFileSync('src/engine/BabylonEngine.ts', engineText);

// 3. Fix GameCanvasBabylon.tsx
let canvas = fs.readFileSync('src/web/components/the-lobby/babylon/GameCanvasBabylon.tsx', 'utf8');
canvas = canvas.replace(/engine\.panEditorCameraToTile/g, 'engine.input.panEditorCameraToTile');
canvas = canvas.replace(/engine\.pickTileAtScreenCoord/g, 'engine.input.pickTileAtScreenCoord');
canvas = canvas.replace(/babylonEngine\.panEditorCameraToTile/g, 'babylonEngine.input.panEditorCameraToTile');
canvas = canvas.replace(/babylonEngine\.pickTileAtScreenCoord/g, 'babylonEngine.input.pickTileAtScreenCoord');

fs.writeFileSync('src/web/components/the-lobby/babylon/GameCanvasBabylon.tsx', canvas);

console.log('Fixed InputController remaining privacy and imports');
