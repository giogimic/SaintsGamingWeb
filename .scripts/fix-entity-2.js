const fs = require('fs');
let text = fs.readFileSync('src/engine/BabylonEngine.ts', 'utf8');

const toPublic = ['activeTargetEntityId', 'selectionRingMesh', 'selectionRingMaterial', 'ensureSelectionRingMesh'];

for (const prop of toPublic) {
  text = text.replace(new RegExp(`private ${prop}:`, 'g'), `public ${prop}:`);
  text = text.replace(new RegExp(`private ${prop} `, 'g'), `public ${prop} `);
  text = text.replace(new RegExp(`private ${prop}\\?`, 'g'), `public ${prop}?`);
  text = text.replace(new RegExp(`private ${prop}=`, 'g'), `public ${prop}=`);
  text = text.replace(new RegExp(`private ${prop}\\(`, 'g'), `public ${prop}(`);
}

fs.writeFileSync('src/engine/BabylonEngine.ts', text);
console.log('Fixed EntityController privacy issues');
