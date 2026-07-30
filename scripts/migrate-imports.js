const fs = require('fs');
const path = require('path');

const directories = ['app', 'src', 'server.ts'];

const replacements = [
  // UI and Shared
  { pattern: /@\/components\/ui/g, replacement: '@/shared/ui' },
  { pattern: /@\/components\/shared/g, replacement: '@/shared/components/shared' },
  { pattern: /@\/components\/dev/g, replacement: '@/editor/dev' },
  { pattern: /@\/components\/game/g, replacement: '@/engine/ui/game' },
  { pattern: /@\/components\/theme-provider/g, replacement: '@/web/components/theme-provider' },
  { pattern: /@\/components\/auth-provider/g, replacement: '@/web/components/auth-provider' },
  { pattern: /@\/components\/(\w+)/g, replacement: '@/web/components/$1' },
  
  // Game & Engine
  { pattern: /@\/lib\/game-server/g, replacement: '@/server' },
  // These specifically go to game
  { pattern: /@\/lib\/game\/(TuxemonDb|battle-engine|CharacterClassSystem|GameConfigManager|party-manager)/g, replacement: '@/game/$1' },
  // The rest go to engine
  { pattern: /@\/lib\/game/g, replacement: '@/engine' },
  
  // Lib utilities
  { pattern: /@\/lib\/(utils|validators|cache)/g, replacement: '@/shared/lib/$1' },
  { pattern: /@\/lib/g, replacement: '@/web/lib' },
  
  // Hooks and types
  { pattern: /@\/hooks/g, replacement: '@/shared/hooks' },
  { pattern: /@\/types/g, replacement: '@/shared/types' },
];

function processDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const stat = fs.statSync(dir);
  if (stat.isFile()) {
    processFile(dir);
    return;
  }
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const fstat = fs.statSync(fullPath);
    if (fstat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js')) {
      processFile(fullPath);
    }
  }
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  for (const { pattern, replacement } of replacements) {
    content = content.replace(pattern, replacement);
  }
  
  if (content !== original) {
    console.log(`Updated imports in ${filePath}`);
    fs.writeFileSync(filePath, content, 'utf8');
  }
}

directories.forEach(dir => {
  processDirectory(dir);
});
console.log('Done migrating imports.');
