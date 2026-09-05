const fs = require('fs');

// 1. Fix InputController properties privacy and imports
let inputText = fs.readFileSync('src/engine/InputController.ts', 'utf8');

// Make methods public
const inputMethods = [
  'handleEditorPointerDown', 'handleEditorPointerMove', 'handleEditorPointerUp',
  'panEditorCameraByScreenDelta', 'startEditorKeyboardPan', 'startEditorPanLoop',
  'panEditorCameraToTile', 'resolveTilePick', 'pickTileFromGroundPlane',
  'pickTileAtScreenCoord', 'pickWorldTarget', 'enableTilePicking', 'disableTilePicking'
];

for (const m of inputMethods) {
  inputText = inputText.replace(new RegExp(`private ${m}\\(`, 'g'), `public ${m}(`);
}

if (!inputText.includes('import { isInGridFootprint }')) {
  inputText = inputText.replace("import { Vector3", "import { isInGridFootprint } from '../shared/game/brushGeometry';\nimport { Vector3");
}

fs.writeFileSync('src/engine/InputController.ts', inputText);

// 2. Fix BabylonEngine engine property
let engineText = fs.readFileSync('src/engine/BabylonEngine.ts', 'utf8');

engineText = engineText.replace(/private engine:/g, 'public engine:');
engineText = engineText.replace(/private engine;/g, 'public engine;');
// Make sure it's public
if (engineText.includes('public engine = new Engine')) {
  // It's probably assigned in constructor, but declaration is private engine: Engine
}

fs.writeFileSync('src/engine/BabylonEngine.ts', engineText);

// 3. Fix GameCanvasBabylon.tsx
let canvas = fs.readFileSync('src/web/components/the-lobby/babylon/GameCanvasBabylon.tsx', 'utf8');
canvas = canvas.replace(/engineRef\.current\.panEditorCameraToTile/g, 'engineRef.current.input.panEditorCameraToTile');
canvas = canvas.replace(/engineRef\.current\.pickTileAtScreenCoord/g, 'engineRef.current.input.pickTileAtScreenCoord');

fs.writeFileSync('src/web/components/the-lobby/babylon/GameCanvasBabylon.tsx', canvas);

console.log('Fixed InputController round 4');
