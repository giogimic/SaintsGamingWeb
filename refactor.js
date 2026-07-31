const fs = require('fs');
const path = require('path');

const directories = [
  'src/web/components',
  'src/server',
  'src/engine',
  'src/game',
  'app/api'
];

const replacements = [
  { search: /TuxemonDb\.ts/g, replace: 'CreatureDb.ts' },
  { search: /TuxemonBattleScene/g, replace: 'CreatureBattleScene' },
  { search: /Tuxemon/g, replace: 'Creature' },
  { search: /tuxemon_/g, replace: 'creature_' },
  { search: /\/tuxemon/g, replace: '/creature' },
  { search: /tuxemon-standard/g, replace: 'creature-standard' },
  { search: /tuxemon_db\.json/g, replace: 'creature_db.json' },
  { search: /tuxemon/gi, replace: 'creature' },
  { search: /Tuxeball/g, replace: 'Capture Device' },
  { search: /tuxeball/g, replace: 'capture_device' },
  { search: /TUXEMON/g, replace: 'CREATURE' },
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const { search, replace } of replacements) {
        if (content.match(search)) {
          content = content.replace(search, replace);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

for (const dir of directories) {
  const fullDirPath = path.join(__dirname, dir);
  if (fs.existsSync(fullDirPath)) {
    processDirectory(fullDirPath);
  }
}

// Check index.tsx specifically just in case
const indexTsxPath = path.join(__dirname, 'src/web/components/the-lobby/index.tsx');
if (fs.existsSync(indexTsxPath)) {
  let content = fs.readFileSync(indexTsxPath, 'utf8');
  let changed = false;
  for (const { search, replace } of replacements) {
    if (content.match(search)) {
      content = content.replace(search, replace);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(indexTsxPath, content, 'utf8');
    console.log(`Updated specifically: ${indexTsxPath}`);
  }
}

console.log("Deep Refactoring complete.");
