const fs = require('fs');
let c3 = fs.readFileSync('test/world-connections.test.ts', 'utf8');
c3 = c3.replace(/gameId:/g, 'projectId:');
fs.writeFileSync('test/world-connections.test.ts', c3);
console.log('Fixed world-connections');
