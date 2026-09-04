const { Project } = require('ts-morph');
const fs = require('fs');

const project = new Project();
project.addSourceFileAtPath('src/engine/BabylonEngine.ts');
const sourceFile = project.getSourceFileOrThrow('src/engine/BabylonEngine.ts');
const engineClass = sourceFile.getClassOrThrow('BabylonEngine');

const entityProps = [
  'entities', 'nameplates', 'billboards', 'hoverIndicator', 'targetIndicator'
];

const entityMethods = [
  'updateEntities', 'updateLocalPlayerPos', 'destroyEntity', 'buildNameplate',
  'updatePlayerMovement', 'buildHoverHighlight', 'clearHoverHighlight',
  'setTargetSelectionIndicator', 'updateTargetSelectionIndicator',
  'startDeathAnimation', 'getInterpolatedPlayerPosition', 'startJumpAnimation'
];

let classBody = `import { BabylonEngine } from './BabylonEngine';\n\nexport class EntityController {\n  public engine: BabylonEngine;\n  constructor(engine: BabylonEngine) {\n    this.engine = engine;\n  }\n\n`;

for (const p of entityProps) {
  const prop = engineClass.getProperty(p);
  if (prop) {
    classBody += prop.getText() + '\n';
    prop.remove();
  }
}

for (const m of entityMethods) {
  const method = engineClass.getMethod(m);
  if (method) {
    classBody += method.getText() + '\n\n';
    method.remove();
  }
}

classBody += '}\n';

fs.writeFileSync('src/engine/EntityController.ts', classBody);
sourceFile.saveSync();
console.log('Successfully extracted EntityController and saved BabylonEngine.ts');
