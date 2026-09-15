const fs = require('fs');
['test/creature-release.test.ts', 'test/dependency-release.test.ts', 'test/npc-release.test.ts', 'test/world-connections.test.ts'].forEach(f => {
  let c3 = fs.readFileSync(f, 'utf8');
  c3 = c3.replace(/worldMap\.create\(\{[\s\S]*?gameId: 'test-game'[\s\S]*?\}\)/g, match => match.replace(/gameId: 'test-game'/g, 'projectId: \'test-game\''));
  c3 = c3.replace(/worldMap\.upsert\(\{[\s\S]*?gameId: 'test-game'[\s\S]*?\}\)/g, match => match.replace(/gameId: 'test-game'/g, 'projectId: \'test-game\''));
  c3 = c3.replace(/worldMap\.createMany\(\{[\s\S]*?gameId: 'test-game'[\s\S]*?\}\)/g, match => match.replace(/gameId: 'test-game'/g, 'projectId: \'test-game\''));
  c3 = c3.replace(/where: \{ gameId: 'test-game' \}/g, 'where: { projectId: \'test-game\' }');
  fs.writeFileSync(f, c3);
});
console.log('Fixed WorldMap test errors');
