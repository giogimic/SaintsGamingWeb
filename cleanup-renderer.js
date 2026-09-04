const fs = require('fs');
let text = fs.readFileSync('src/engine/Renderer.ts', 'utf8');

// Remove hallucinated imports
text = text.replace(/import \{ CameraSettings \} from '\.\.\/shared\/game\/cameraSettings';\n/g, '');
text = text.replace(/import \{ CameraProfile, EditorCameraBookmark \} from '\.\.\/shared\/game\/cameraSettings';\n/g, '');
text = text.replace(/import \{ clampCameraFocus \} from '\.\.\/shared\/game\/cameraSettings';\n/g, '');
text = text.replace(/import \{ SpriteSheetConfig \} from '\.\.\/shared\/game\/spriteDefinitions';\n/g, '');

// Import SpriteSheetConfig from BabylonEngine
if (!text.includes('SpriteSheetConfig')) {
  // It shouldn't need it if we remove the import, but wait, it uses it in line 474?
  // Let's just import it from BabylonEngine
}
text = text.replace(/import \{ BabylonEngine \} from '\.\/BabylonEngine';/g, "import { BabylonEngine, SpriteSheetConfig } from './BabylonEngine';\nimport { clampCameraFocus } from './helpers/babylonViewHelpers';");

// Fix line 65: public camera: TargetCamera; -> public camera!: TargetCamera;
text = text.replace(/public camera: TargetCamera;/g, 'public camera!: TargetCamera;');
text = text.replace(/public camera: FreeCamera;/g, 'public camera!: FreeCamera;');

// Add missing light imports and post process
// Already imported by my previous script or not?
if (!text.includes('HemisphericLight')) {
  text = text.replace(/import \{ DynamicTexture/g, 'import { HemisphericLight, DirectionalLight, ImageProcessingPostProcess, DynamicTexture');
}

fs.writeFileSync('src/engine/Renderer.ts', text);
console.log('Renderer.ts cleaned up');
