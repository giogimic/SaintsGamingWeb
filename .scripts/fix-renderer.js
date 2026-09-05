const fs = require('fs');

const rendererProps = [
  'ambientLight', 'dirLight', 'shadowGen', 'vignettePostProcess',
  'isFreeCam', 'cameraYaw', 'cameraPitch', 'cameraDistance',
  'targetCameraDistance', 'cameraVelocityYaw', 'cameraVelocityPitch',
  'cameraVelocityPanX', 'cameraVelocityPanZ', 'cameraSettings',
  'updateCameraAspect', 'onResize', 'cameraProfile', 'editorCameraBookmark',
  'camera', 'cameraTargetX', 'cameraTargetZ', 'cameraSnapped'
];

const rendererMethods = [
  'createProceduralTextures', 'updateWaterTexture', 'updateRealmVisuals',
  'createDefaultPlayerTexture', 'startRenderLoop', 'stopRenderLoop',
  'snapCameraTo', 'setCameraPosition', 'isEditorCameraMode', 'setEditorCameraMode',
  'restoreEditorCameraBookmark', 'getCameraFocus', 'setFreeCam', 'getCameraSettings',
  'applyPlayerCameraStyle', 'setCameraSettings', 'setViewAngle', 'updateFreeCamPosition',
  'rotateFreeCam', 'panFreeCamByScreenDelta', 'zoomFreeCam', 'applyFreeCamMomentum',
  'killCameraMomentum', 'resetCameraSnap', 'zoomCamera', 'setZoomPercent', 'fitMapInView'
];

const ownMembers = ['engine', ...rendererProps, ...rendererMethods];

// 1. Fix Renderer.ts
let rendererText = fs.readFileSync('src/engine/Renderer.ts', 'utf8');

// Replace all this.foo with this.engine.foo IF foo is NOT in ownMembers
rendererText = rendererText.replace(/this\.([a-zA-Z0-9_]+)/g, (match, prop) => {
  if (ownMembers.includes(prop)) {
    return match;
  }
  return `this.engine.${prop}`;
});

// Add imports
const rendererImports = `
import { CameraSettings } from '../shared/game/cameraSettings';
import { CameraProfile, EditorCameraBookmark } from '../shared/game/cameraSettings';
import { Light, ShadowGenerator, Camera, TargetCamera, Vector3, Matrix, Color3, Color4, Texture, StandardMaterial } from '@babylonjs/core';
import { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline';
`;

if (!rendererText.includes('import { CameraSettings }')) {
  rendererText = rendererText.replace("import { BabylonEngine } from './BabylonEngine';", "import { BabylonEngine } from './BabylonEngine';\n" + rendererImports);
}

// Ensure properties are public
for (const prop of rendererProps) {
  rendererText = rendererText.replace(new RegExp(`private ${prop}:`, 'g'), `public ${prop}:`);
  rendererText = rendererText.replace(new RegExp(`private ${prop} `, 'g'), `public ${prop} `);
  rendererText = rendererText.replace(new RegExp(`private ${prop}\\?`, 'g'), `public ${prop}?`);
  rendererText = rendererText.replace(new RegExp(`private ${prop}=`, 'g'), `public ${prop}=`);
}

for (const m of rendererMethods) {
  rendererText = rendererText.replace(new RegExp(`private ${m}\\(`, 'g'), `public ${m}(`);
}

fs.writeFileSync('src/engine/Renderer.ts', rendererText);

// 2. Fix BabylonEngine.ts
let engineText = fs.readFileSync('src/engine/BabylonEngine.ts', 'utf8');

if (!engineText.includes("import { Renderer }")) {
  engineText = engineText.replace("import { InputController } from './InputController';", "import { InputController } from './InputController';\nimport { Renderer } from './Renderer';");
}
if (!engineText.includes("public renderer: Renderer;")) {
  engineText = engineText.replace("public input: InputController;", "public input: InputController;\n  public renderer: Renderer;");
}
if (!engineText.includes("this.renderer = new Renderer(this);")) {
  engineText = engineText.replace("this.input = new InputController(this);", "this.input = new InputController(this);\n    this.renderer = new Renderer(this);");
}

for (const prop of ownMembers) {
  if (prop === 'engine') continue;
  engineText = engineText.replace(new RegExp(`this\\.${prop}\\b`, 'g'), `this.renderer.${prop}`);
}

fs.writeFileSync('src/engine/BabylonEngine.ts', engineText);

// 3. Fix InputController.ts and VoxelController.ts
const controllers = ['src/engine/InputController.ts', 'src/engine/VoxelController.ts'];
for (const file of controllers) {
  let content = fs.readFileSync(file, 'utf8');
  for (const prop of ownMembers) {
    if (prop === 'engine') continue;
    content = content.replace(new RegExp(`this\\.engine\\.${prop}\\b`, 'g'), `this.engine.renderer.${prop}`);
  }
  fs.writeFileSync(file, content);
}

// 4. Fix GameCanvasBabylon.tsx
let canvas = fs.readFileSync('src/web/components/the-lobby/babylon/GameCanvasBabylon.tsx', 'utf8');
for (const prop of ownMembers) {
  if (prop === 'engine') continue;
  canvas = canvas.replace(new RegExp(`engine\\.${prop}\\b`, 'g'), `engine.renderer.${prop}`);
  canvas = canvas.replace(new RegExp(`babylonEngine\\.${prop}\\b`, 'g'), `babylonEngine.renderer.${prop}`);
  canvas = canvas.replace(new RegExp(`engineRef\\.current\\.${prop}\\b`, 'g'), `engineRef.current.renderer.${prop}`);
}
fs.writeFileSync('src/web/components/the-lobby/babylon/GameCanvasBabylon.tsx', canvas);

console.log('Fixed Renderer and references');
