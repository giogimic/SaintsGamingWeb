const fbx2gltf = require('fbx2gltf');
const path = require('path');
const fs = require('fs');

async function convert(inputDir) {
  if (!fs.existsSync(inputDir)) {
    console.error('Directory does not exist:', inputDir);
    return;
  }

  const files = fs.readdirSync(inputDir);
  for (const file of files) {
    if (file.toLowerCase().endsWith('.fbx')) {
      const inputPath = path.join(inputDir, file);
      const outputPath = path.join(inputDir, file.replace(/\.fbx$/i, '.glb'));
      console.log(`Converting ${inputPath} to ${outputPath}...`);
      try {
        await fbx2gltf(inputPath, outputPath, ['--khr-materials-unlit']);
        console.log(`Success: ${outputPath}`);
      } catch (err) {
        console.error(`Failed to convert ${inputPath}:`, err);
      }
    }
  }
}

const targetDirs = [
  'C:\\Users\\Matth\\OneDrive\\Desktop\\VaultCache\\FabLibrary\\Assassin-Thief-Rogue_-_Rigged-184f69d4',
  'C:\\Users\\Matth\\OneDrive\\Desktop\\VaultCache\\FabLibrary\\Creative_Characters_FREE_-_Animated_Low_Poly_3D_Models-94fd60a2\\fbx\\source_extracted\\Separate_assets_fbx_extracted\\Separate_assets_fbx'
];

async function main() {
  for (const dir of targetDirs) {
    console.log(`\nProcessing directory: ${dir}`);
    await convert(dir);
  }
}

main();
