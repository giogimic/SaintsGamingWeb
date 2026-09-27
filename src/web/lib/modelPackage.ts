import JSZip from 'jszip';
import { convertFbxToGlb } from './fbxConverter';

export interface Unpacked3DModelPackage {
  primaryModelFile: File;
  previewUrl: string;
  assetName: string;
  textureCount: number;
  animationFiles: File[];
  metadata?: Record<string, any>;
}

/**
 * Checks whether a given list of zip entries represents a 3D model archive (.fbx, .glb, .gltf)
 */
export function isZip3DModelPackage(entries: string[]): boolean {
  return entries.some((p) => {
    const lower = p.toLowerCase();
    return (
      !lower.startsWith('__macosx') &&
      (lower.endsWith('.fbx') || lower.endsWith('.glb') || lower.endsWith('.gltf'))
    );
  });
}

/**
 * Unpacks a 3D model package ZIP containing an FBX/GLB model, sibling textures,
 * and optional animation FBX clips. Converts everything to a self-contained GLB
 * with textures and animations properly connected.
 */
export async function unpack3DModelZipPackage(
  zipFile: File,
  onProgress?: (msg: string) => void
): Promise<Unpacked3DModelPackage> {
  const zip = await JSZip.loadAsync(zipFile);
  const entries = Object.keys(zip.files).filter(
    (p) => !zip.files[p].dir && !p.startsWith('__MACOSX')
  );

  // 1. Identify 3D files
  const modelEntries = entries.filter((p) => {
    const l = p.toLowerCase();
    return l.endsWith('.fbx') || l.endsWith('.glb') || l.endsWith('.gltf');
  });

  if (modelEntries.length === 0) {
    throw new Error('No 3D model files (.fbx, .glb, .gltf) found in ZIP archive.');
  }

  // 2. Identify textures
  const textureEntries = entries.filter((p) => {
    const l = p.toLowerCase();
    return (
      l.endsWith('.png') ||
      l.endsWith('.jpg') ||
      l.endsWith('.jpeg') ||
      l.endsWith('.webp')
    );
  });

  const textureFiles: File[] = [];
  for (const tPath of textureEntries) {
    const blob = await zip.files[tPath].async('blob');
    const filename = tPath.split('/').pop() || 'texture.png';
    textureFiles.push(new File([blob], filename, { type: blob.type || 'image/png' }));
  }

  // 3. Separate primary mesh from animation clips
  let primaryEntry = modelEntries[0];
  const animationEntries: string[] = [];

  if (modelEntries.length > 1) {
    const candidates = [...modelEntries].sort((a, b) => {
      const aIsAnim = /anim|walk|run|idle|jump|turn|jog|mocap/i.test(a);
      const bIsAnim = /anim|walk|run|idle|jump|turn|jog|mocap/i.test(b);
      if (aIsAnim && !bIsAnim) return 1;
      if (!aIsAnim && bIsAnim) return -1;
      return 0;
    });
    primaryEntry = candidates[0];
    for (const other of modelEntries) {
      if (other !== primaryEntry) {
        animationEntries.push(other);
      }
    }
  }

  onProgress?.(`Extracting primary model: ${primaryEntry.split('/').pop()}`);
  const primaryBlob = await zip.files[primaryEntry].async('blob');
  const primaryFilename = primaryEntry.split('/').pop() || 'model.fbx';
  const rawModelFile = new File([primaryBlob], primaryFilename, {
    type: 'application/octet-stream',
  });

  // 4. Convert FBX to GLB if needed, passing all extracted textures
  let finalGlbFile: File;
  if (primaryFilename.toLowerCase().endsWith('.fbx')) {
    onProgress?.(`Converting FBX with ${textureFiles.length} textures...`);
    finalGlbFile = await convertFbxToGlb(rawModelFile, { textureFiles });
  } else {
    finalGlbFile = rawModelFile;
  }

  // 5. Convert any companion animation FBXs to GLB
  const animationFiles: File[] = [];
  for (const animEntry of animationEntries) {
    const animBlob = await zip.files[animEntry].async('blob');
    const animName = animEntry.split('/').pop() || 'anim.fbx';
    const rawAnim = new File([animBlob], animName, { type: 'application/octet-stream' });
    if (animName.toLowerCase().endsWith('.fbx')) {
      try {
        const convertedAnim = await convertFbxToGlb(rawAnim);
        animationFiles.push(convertedAnim);
      } catch (e) {
        console.warn('Failed to convert companion animation:', animName, e);
      }
    } else {
      animationFiles.push(rawAnim);
    }
  }

  const assetName = primaryFilename.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
  const previewUrl = URL.createObjectURL(finalGlbFile);

  return {
    primaryModelFile: finalGlbFile,
    previewUrl,
    assetName,
    textureCount: textureFiles.length,
    animationFiles,
  };
}
