const { Project } = require('ts-morph');
const fs = require('fs');

const project = new Project();
project.addSourceFileAtPath('src/engine/BabylonEngine.ts');
const sourceFile = project.getSourceFileOrThrow('src/engine/BabylonEngine.ts');
const engineClass = sourceFile.getClassOrThrow('BabylonEngine');

const inputProperties = [
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

let classBody = `import { BabylonEngine } from './BabylonEngine';\n\nexport class InputController {\n  private engine: BabylonEngine;\n  constructor(engine: BabylonEngine) {\n    this.engine = engine;\n  }\n\n`;

for (const p of inputProperties) {
  const prop = engineClass.getProperty(p);
  if (prop) {
    classBody += prop.getText() + '\n';
    prop.remove();
  }
}

for (const m of inputMethods) {
  const method = engineClass.getMethod(m);
  if (method) {
    let text = method.getText();
    classBody += text + '\n\n';
    method.remove();
  }
}

classBody += '}\n';

fs.writeFileSync('src/engine/InputController.ts', classBody);
sourceFile.saveSync();
console.log('Successfully extracted InputController and saved BabylonEngine.ts');
