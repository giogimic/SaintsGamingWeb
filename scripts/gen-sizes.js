const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

(async () => {
  const dir = path.join(process.cwd(), 'public/tuxemon-assets/tilesets');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.png'));
  const sizes = {};
  for (const f of files) {
    const meta = await sharp(path.join(dir, f)).metadata();
    sizes[f] = { w: meta.width, h: meta.height };
  }
  const out = `export const TILESET_SIZES: Record<string, {w:number, h:number}> = ${JSON.stringify(sizes, null, 2)};`;
  fs.writeFileSync('components/the-lobby/data/tileset-sizes.ts', out);
  console.log('Wrote ' + Object.keys(sizes).length + ' sizes');
})();
