const { Project } = require('ts-morph');
const fs = require('fs');

const project = new Project();
project.addSourceFileAtPath('src/engine/BabylonEngine.ts');
const sourceFile = project.getSourceFileOrThrow('src/engine/BabylonEngine.ts');
const engineClass = sourceFile.getClassOrThrow('BabylonEngine');

const methods = engineClass.getMethods().map(m => m.getName());
const properties = engineClass.getProperties().map(p => p.getName());

fs.writeFileSync('engine-methods.json', JSON.stringify({ methods, properties }, null, 2));
console.log('Dumped ' + methods.length + ' methods and ' + properties.length + ' properties.');
