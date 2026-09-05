const { Project } = require('ts-morph');
const fs = require('fs');

const project = new Project();
project.addSourceFileAtPath('src/engine/BabylonEngine.ts');
const sourceFile = project.getSourceFileOrThrow('src/engine/BabylonEngine.ts');
const engineClass = sourceFile.getClassOrThrow('BabylonEngine');

const rendererProps = [
  'ambientLight', 'dirLight', 'shadowGen', 'vignettePostProcess',
  'isFreeCam', 'cameraYaw', 'cameraPitch', 'cameraDistance',
  'targetCameraDistance', 'cameraVelocityYaw', 'cameraVelocityPitch',
  'cameraVelocityPanX', 'cameraVelocityPanZ', 'cameraSettings',
  'updateCameraAspect', 'onResize', 'cameraProfile', 'editorCameraBookmark'
];
// 'camera', 'cameraTargetX', 'cameraTargetZ', 'cameraSnapped' were used by InputController, so if we move them, we have to rewrite InputController to use engine.renderer.cameraTargetX etc.
// For now, let's leave 'camera', 'cameraTargetX', 'cameraTargetZ', 'cameraSnapped', 'canvas', 'engine', 'scene', 'rootNode' in BabylonEngine to avoid massive rewrite chains, or we can move them and fix InputController.
// Actually, `InputController` only uses a few of them. Let's move ALL camera state to Renderer.
rendererProps.push('camera', 'cameraTargetX', 'cameraTargetZ', 'cameraSnapped');

const rendererMethods = [
  'createProceduralTextures', 'updateWaterTexture', 'updateRealmVisuals',
  'createDefaultPlayerTexture', 'startRenderLoop', 'stopRenderLoop',
  'snapCameraTo', 'setCameraPosition', 'isEditorCameraMode', 'setEditorCameraMode',
  'restoreEditorCameraBookmark', 'getCameraFocus', 'setFreeCam', 'getCameraSettings',
  'applyPlayerCameraStyle', 'setCameraSettings', 'setViewAngle', 'updateFreeCamPosition',
  'rotateFreeCam', 'panFreeCamByScreenDelta', 'zoomFreeCam', 'applyFreeCamMomentum',
  'killCameraMomentum', 'resetCameraSnap', 'zoomCamera', 'setZoomPercent', 'fitMapInView'
];

let classBody = `import { BabylonEngine } from './BabylonEngine';\n\nexport class Renderer {\n  public engine: BabylonEngine;\n  constructor(engine: BabylonEngine) {\n    this.engine = engine;\n  }\n\n`;

for (const p of rendererProps) {
  const prop = engineClass.getProperty(p);
  if (prop) {
    classBody += prop.getText() + '\n';
    prop.remove();
  }
}

for (const m of rendererMethods) {
  const method = engineClass.getMethod(m);
  if (method) {
    classBody += method.getText() + '\n\n';
    method.remove();
  }
}

classBody += '}\n';

fs.writeFileSync('src/engine/Renderer.ts', classBody);
sourceFile.saveSync();
console.log('Successfully extracted Renderer and saved BabylonEngine.ts');
