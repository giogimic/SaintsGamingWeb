/**
 * Copy Tuxemon Assets
 * 
 * Extracts and copies all Tuxemon game assets to public/tuxemon-assets/
 * 
 * Source: C:\Users\Matth\Downloads\Tuxemon-0.5-rc1.zip
 * Destination: public/tuxemon-assets/
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Tuxemon source — already extracted on desktop
const TUXEMON_SOURCE = process.env.TUXEMON_PATH || 'C:\\Users\\Matth\\OneDrive\\Desktop\\Tuxemon-0.5-rc1';
const DEST_BASE = path.join(process.cwd(), 'public', 'tuxemon-assets');

// Asset mappings: source subdirectory → destination subdirectory
const ASSET_MAPPINGS = [
  {
    source: 'mods/tuxemon/gfx/tilesets',
    dest: 'tilesets',
    description: 'Tileset sprite sheets + .tsx definitions'
  },
  {
    source: 'mods/tuxemon/sprites',
    dest: 'npc',
    description: 'NPC sprites (221 files)'
  },
  {
    source: 'mods/tuxemon/gfx/sprites',
    dest: 'monster',
    description: 'Monster battle sprites (front/back)'
  },
  {
    source: 'mods/tuxemon/gfx/items',
    dest: 'items',
    description: 'Item icons (223 files)'
  },
  {
    source: 'mods/tuxemon/gfx/ui',
    dest: 'ui',
    description: 'UI elements (borders, bubbles, buttons, element icons)'
  },
  {
    source: 'mods/tuxemon/sprites_obj',
    dest: 'objects',
    description: 'Map object sprites (24 files)'
  },
  {
    source: 'mods/tuxemon/music',
    dest: 'audio/music',
    description: 'Background music tracks'
  },
  {
    source: 'mods/tuxemon/sounds',
    dest: 'audio/sfx',
    description: 'Sound effects'
  }
];

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✓ Created directory: ${dir}`);
  }
}

function copyRecursive(src: string, dest: string) {
  if (!fs.existsSync(src)) {
    console.warn(`⚠ Source not found: ${src}`);
    return 0;
  }

  const stat = fs.statSync(src);
  
  if (stat.isDirectory()) {
    ensureDir(dest);
    let count = 0;
    const entries = fs.readdirSync(src);
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry);
      const destPath = path.join(dest, entry);
      count += copyRecursive(srcPath, destPath);
    }
    
    return count;
  } else {
    fs.copyFileSync(src, dest);
    return 1;
  }
}

function verifySource() {
  console.log('\n=== Verifying Tuxemon Source ===');
  
  if (!fs.existsSync(TUXEMON_SOURCE)) {
    console.error(`✗ Tuxemon source not found: ${TUXEMON_SOURCE}`);
    console.error('Set TUXEMON_PATH env var to the Tuxemon root directory.');
    process.exit(1);
  }
  
  console.log(`✓ Source: ${TUXEMON_SOURCE}`);
}

function copyAssets() {
  console.log('\n=== Copying Assets ===');
  
  let totalFiles = 0;
  
  for (const mapping of ASSET_MAPPINGS) {
    const sourcePath = path.join(TUXEMON_SOURCE, mapping.source);
    const destPath = path.join(DEST_BASE, mapping.dest);
    
    console.log(`\nCopying ${mapping.description}...`);
    console.log(`  From: ${sourcePath}`);
    console.log(`  To: ${destPath}`);
    
    const count = copyRecursive(sourcePath, destPath);
    totalFiles += count;
    
    console.log(`  ✓ Copied ${count} files`);
  }
  
  return totalFiles;
}

function printSummary(totalFiles: number) {
  console.log('\n=== Summary ===');
  console.log(`✓ Total files copied: ${totalFiles}`);
  console.log(`✓ Assets location: ${DEST_BASE}`);
  console.log('\nNext step: Run scripts/build-tile-registry.ts to parse .tsx files');
}

function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   Tuxemon Asset Copy Script                     ║');
  console.log('╚══════════════════════════════════════════════════╝');
  
  // Verify source exists
  verifySource();
  
  // Create destination base directory
  ensureDir(DEST_BASE);
  
  // Copy assets
  const totalFiles = copyAssets();
  
  // Print summary
  printSummary(totalFiles);
}

main();