const fs = require('fs');
let text = fs.readFileSync('src/engine/Renderer.ts', 'utf8');

text = text.replace(/import \{ Light,/g, 'import { HemisphericLight, DirectionalLight, ImageProcessingPostProcess, Light,');
text = text.replace(/this\.engine\.resize\(\)/g, 'this.engine.engine.resize()');

fs.writeFileSync('src/engine/Renderer.ts', text);
console.log('Fixed Renderer round 3');
