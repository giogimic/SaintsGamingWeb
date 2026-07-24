import fs from 'fs';
import path from 'path';

const SPRITES_DIR = path.join(process.cwd(), 'public/tuxemon-assets/npc');
const OUTPUT_FILE = path.join(process.cwd(), 'components/the-lobby/data/sprites.ts');

const files = fs.readdirSync(SPRITES_DIR)
  .filter(f => f.endsWith('.png'))
  .map(f => f.replace('.png', ''));

const content = `// Generated list of available sprites
export const TUXEMON_SPRITES = ${JSON.stringify(files, null, 2)};
`;

fs.writeFileSync(OUTPUT_FILE, content, 'utf8');
console.log(`Generated sprites.ts with ${files.length} sprites.`);
