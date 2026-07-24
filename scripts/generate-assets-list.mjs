import fs from 'fs';
import path from 'path';

const ASSETS_DIR = path.join(process.cwd(), 'public/tuxemon-assets');
const OUTPUT_DIR = path.join(process.cwd(), 'components/the-lobby/data');

function scanDir(subDir) {
  const dirPath = path.join(ASSETS_DIR, subDir);
  if (!fs.existsSync(dirPath)) return [];
  
  return fs.readdirSync(dirPath)
    .filter(file => file.endsWith('.png'))
    .map(file => {
      const name = file.replace('.png', '');
      return { id: name, path: `/tuxemon-assets/${subDir}/${file}` };
    });
}

function generateCombinedTsFile(monsters, items, outputPath) {
  const content = `// Auto-generated asset list\n` +
    `export const TUXEMON_MONSTERS = [\n` +
    monsters.map(item => `  { id: '${item.id}', path: '${item.path}' }`).join(',\n') +
    `\n];\n\n` +
    `export const TUXEMON_ITEMS = [\n` +
    items.map(item => `  { id: '${item.id}', path: '${item.path}' }`).join(',\n') +
    `\n];\n`;
  fs.writeFileSync(outputPath, content, 'utf8');
  console.log(`Generated ${outputPath}`);
}

const monsters = scanDir('monster/player');
const items = scanDir('items');

generateCombinedTsFile(monsters, items, path.join(OUTPUT_DIR, 'generated-assets.ts'));

console.log(`Indexed ${monsters.length} monsters and ${items.length} items.`);
