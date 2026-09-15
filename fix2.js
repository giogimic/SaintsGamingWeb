const fs = require('fs');
['test/creature-release.test.ts', 'test/dependency-release.test.ts', 'test/npc-release.test.ts', 'test/world-connections.test.ts'].forEach(f => {
  let c3 = fs.readFileSync(f, 'utf8');
  c3 = c3.replace(/gameId:\s*'saints'/g, 'projectId: \'saints\'');
  c3 = c3.replace(/gameId:\s*'test-game'/g, 'projectId: \'test-game\'');
  fs.writeFileSync(f, c3);
});
console.log('Fixed WorldMap test errors');
