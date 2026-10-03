import fs from 'fs';
import path from 'path';

function analyzeGlb(filePath: string) {
  try {
    const buffer = fs.readFileSync(filePath);
    const magic = buffer.readUInt32LE(0);
    if (magic !== 0x46546C67) {
      return { error: 'Not a valid GLB' };
    }
    
    const jsonChunkLength = buffer.readUInt32LE(12);
    const jsonChunkType = buffer.readUInt32LE(16);
    if (jsonChunkType !== 0x4E4F534A) {
      return { error: 'JSON chunk missing' };
    }

    const jsonString = buffer.slice(20, 20 + jsonChunkLength).toString('utf-8');
    const gltf = JSON.parse(jsonString);

    const result: any = {
      meshes: gltf.meshes ? gltf.meshes.length : 0,
      nodes: gltf.nodes ? gltf.nodes.length : 0,
      animations: gltf.animations ? gltf.animations.map((a: any) => a.name || 'unnamed') : [],
      skins: gltf.skins ? gltf.skins.length : 0,
      materials: gltf.materials ? gltf.materials.length : 0,
      hasSkeleton: !!gltf.skins,
      hasAnimations: gltf.animations && gltf.animations.length > 0
    };

    return result;
  } catch (err: any) {
    return { error: err.message };
  }
}

function scanDirectory(dir: string, type: string) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.glb'));
  console.log(`\n--- ${type.toUpperCase()} (${files.length} files) ---`);
  
  let animCount = 0;
  let skinCount = 0;

  files.forEach(file => {
    const info = analyzeGlb(path.join(dir, file));
    if (info.error) {
      console.log(`[ERR] ${file}: ${info.error}`);
    } else {
      if (type === 'monsters' || type === 'characters') {
        // We expect monsters and characters to have skeletons and animations (unless characters use shared anims)
        console.log(`[OK] ${file} | Skinned: ${info.hasSkeleton} | Anims: ${info.animations.length}`);
      }
      if (info.hasAnimations) animCount++;
      if (info.hasSkeleton) skinCount++;
    }
  });

  console.log(`Summary for ${type}: ${skinCount} skinned, ${animCount} animated.`);
}

scanDirectory(path.join(__dirname, '..', 'public', 'models', 'monsters'), 'monsters');
scanDirectory(path.join(__dirname, '..', 'public', 'models', 'items'), 'items');
scanDirectory(path.join(__dirname, '..', 'public', 'models', 'quaternius'), 'characters');
