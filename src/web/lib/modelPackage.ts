import * as THREE from 'three';
import JSZip from 'jszip';
import {
  OBJLoader,
  MTLLoader,
  VOXLoader,
  VOXMesh,
  ColladaLoader,
  STLLoader,
  PLYLoader,
  GLTFExporter,
  TGALoader,
  DDSLoader,
} from 'three-stdlib';
import { convertFbxToGlb } from './fbxConverter';

export interface Unpacked3DModelPackage {
  primaryModelFile: File;
  previewUrl: string;
  assetName: string;
  textureCount: number;
  textureFiles?: File[];
  animationFiles: File[];
  modularPieceFiles?: File[];
  metadata?: Record<string, any>;
}

import type { PbrChannel, PbrChannel as PbrChannelType } from './textureLoader';
import {
  PBR_CHANNELS,
  loadTextureFromFile,
  detectPbrChannel,
  attachTextureFilesToMaterials,
} from './textureLoader';

export type { PbrChannel, PbrChannelType };
export {
  PBR_CHANNELS,
  loadTextureFromFile,
  detectPbrChannel,
  attachTextureFilesToMaterials,
};

/**
 * Checks whether a given list of zip entries represents a 3D model archive (.fbx, .glb, .gltf, .obj, .vox, .dae, .stl, .ply)
 */
export function isZip3DModelPackage(entries: string[]): boolean {
  return entries.some((p) => {
    const lower = p.toLowerCase();
    return (
      !lower.startsWith('__macosx') &&
      (lower.endsWith('.fbx') ||
        lower.endsWith('.glb') ||
        lower.endsWith('.gltf') ||
        lower.endsWith('.obj') ||
        lower.endsWith('.vox') ||
        lower.endsWith('.dae') ||
        lower.endsWith('.stl') ||
        lower.endsWith('.ply'))
    );
  });
}

/**
 * Sanitizes Three.js materials to prevent GLTFExporter crashes caused by unresolved texture references.
 */
function sanitizeObjectMaterials(object: THREE.Object3D) {
  const ALL_MAP_TYPES = [
    'map',
    'normalMap',
    'roughnessMap',
    'metalnessMap',
    'emissiveMap',
    'specularMap',
    'alphaMap',
    'bumpMap',
    'displacementMap',
    'aoMap',
    'lightMap',
  ];

  object.traverse((child: any) => {
    if (child.isMesh && child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((m: any) => {
        for (const mapKey of ALL_MAP_TYPES) {
          if (m[mapKey]) {
            const img = m[mapKey].image;
            const isInvalid =
              !img ||
              (typeof img.width === 'number' && img.width === 0) ||
              (typeof img.height === 'number' && img.height === 0) ||
              (img instanceof HTMLImageElement && (!img.complete || img.naturalWidth === 0)) ||
              (img.data && img.data.length === 0);

            if (isInvalid) {
              m[mapKey] = null;
            }
          }
        }
      });
    }
  });
}

/**
 * Converts an OBJ model (and optional companion MTL / textures) into a self-contained GLB file.
 */
export async function convertObjToGlb(
  objFile: File,
  options?: { mtlFile?: File; textureFiles?: File[] }
): Promise<File> {
  const manager = new THREE.LoadingManager();
  manager.addHandler(/\.tga$/i, new TGALoader(manager));
  manager.addHandler(/\.dds$/i, new DDSLoader());

  const objectUrlsToRevoke: string[] = [];
  if (options?.textureFiles && options.textureFiles.length > 0) {
    const textureMap = new Map<string, string>();
    for (const tf of options.textureFiles) {
      const url = URL.createObjectURL(tf);
      objectUrlsToRevoke.push(url);
      const cleanName = tf.name.toLowerCase();
      textureMap.set(cleanName, url);
      const baseName = cleanName.replace(/\.[^/.]+$/, '');
      textureMap.set(baseName, url);
    }
    manager.setURLModifier((rawUrl: string) => {
      if (!rawUrl) return rawUrl;
      const clean = decodeURIComponent(rawUrl).replace(/\\/g, '/');
      const filename = clean.substring(clean.lastIndexOf('/') + 1).toLowerCase();
      if (textureMap.has(filename)) return textureMap.get(filename)!;
      const base = filename.replace(/\.[^/.]+$/, '');
      if (textureMap.has(base)) return textureMap.get(base)!;
      for (const [key, url] of textureMap.entries()) {
        if (filename.includes(key) || key.includes(filename)) return url;
      }
      return rawUrl;
    });
  }

  const objText = await objFile.text();
  const objLoader = new OBJLoader(manager);

  if (options?.mtlFile) {
    const mtlText = await options.mtlFile.text();
    const mtlLoader = new MTLLoader(manager);
    const materials = mtlLoader.parse(mtlText, '');
    materials.preload();
    objLoader.setMaterials(materials);
  }

  const object = objLoader.parse(objText);
  if (options?.textureFiles && options.textureFiles.length > 0) {
    await attachTextureFilesToMaterials(object, options.textureFiles);
  }
  sanitizeObjectMaterials(object);

  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    exporter.parse(
      object,
      (gltf) => {
        objectUrlsToRevoke.forEach((u) => URL.revokeObjectURL(u));
        if (gltf instanceof ArrayBuffer) {
          const blob = new Blob([gltf], { type: 'model/gltf-binary' });
          const newFilename = objFile.name.replace(/\.obj$/i, '.glb');
          resolve(new File([blob], newFilename, { type: 'model/gltf-binary' }));
        } else {
          reject(new Error('GLTFExporter did not return an ArrayBuffer.'));
        }
      },
      (err) => {
        objectUrlsToRevoke.forEach((u) => URL.revokeObjectURL(u));
        reject(err);
      },
      { binary: true, embedImages: true, animations: [] }
    );
  });
}

/**
 * Converts a MagicaVoxel (.vox) file into a standard GLB mesh with voxel vertex colors.
 */
export async function convertVoxToGlb(voxFile: File): Promise<File> {
  const arrayBuffer = await voxFile.arrayBuffer();
  const loader = new VOXLoader();
  const chunks = loader.parse(arrayBuffer);

  const group = new THREE.Group();
  for (const chunk of chunks) {
    const mesh = new VOXMesh(chunk as any);
    group.add(mesh);
  }

  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    exporter.parse(
      group,
      (gltf) => {
        if (gltf instanceof ArrayBuffer) {
          const blob = new Blob([gltf], { type: 'model/gltf-binary' });
          const newFilename = voxFile.name.replace(/\.vox$/i, '.glb');
          resolve(new File([blob], newFilename, { type: 'model/gltf-binary' }));
        } else {
          reject(new Error('GLTFExporter did not return an ArrayBuffer.'));
        }
      },
      (err) => reject(err),
      { binary: true, embedImages: true, animations: [] }
    );
  });
}

/**
 * Converts a Collada (.dae) file into a standard GLB file.
 */
export async function convertDaeToGlb(
  daeFile: File,
  options?: { textureFiles?: File[] }
): Promise<File> {
  const manager = new THREE.LoadingManager();
  manager.addHandler(/\.tga$/i, new TGALoader(manager));
  manager.addHandler(/\.dds$/i, new DDSLoader());

  const objectUrlsToRevoke: string[] = [];
  if (options?.textureFiles && options.textureFiles.length > 0) {
    const textureMap = new Map<string, string>();
    for (const tf of options.textureFiles) {
      const url = URL.createObjectURL(tf);
      objectUrlsToRevoke.push(url);
      const cleanName = tf.name.toLowerCase();
      textureMap.set(cleanName, url);
      const baseName = cleanName.replace(/\.[^/.]+$/, '');
      textureMap.set(baseName, url);
    }
    manager.setURLModifier((rawUrl: string) => {
      if (!rawUrl) return rawUrl;
      const clean = decodeURIComponent(rawUrl).replace(/\\/g, '/');
      const filename = clean.substring(clean.lastIndexOf('/') + 1).toLowerCase();
      if (textureMap.has(filename)) return textureMap.get(filename)!;
      const base = filename.replace(/\.[^/.]+$/, '');
      if (textureMap.has(base)) return textureMap.get(base)!;
      for (const [key, url] of textureMap.entries()) {
        if (filename.includes(key) || key.includes(filename)) return url;
      }
      return rawUrl;
    });
  }

  const daeText = await daeFile.text();
  const colladaLoader = new ColladaLoader(manager);
  const collada = colladaLoader.parse(daeText, '');
  const object = collada.scene;
  const rawAnimations = (collada as any).animations || [];
  const validAnimations = (Array.isArray(rawAnimations) ? rawAnimations : []).filter(
    (clip: any) => clip && Array.isArray(clip.tracks) && clip.tracks.length > 0
  );

  if (options?.textureFiles && options.textureFiles.length > 0) {
    await attachTextureFilesToMaterials(object, options.textureFiles);
  }

  sanitizeObjectMaterials(object);

  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    exporter.parse(
      object,
      (gltf) => {
        objectUrlsToRevoke.forEach((u) => URL.revokeObjectURL(u));
        if (gltf instanceof ArrayBuffer) {
          const blob = new Blob([gltf], { type: 'model/gltf-binary' });
          const newFilename = daeFile.name.replace(/\.dae$/i, '.glb');
          resolve(new File([blob], newFilename, { type: 'model/gltf-binary' }));
        } else {
          reject(new Error('GLTFExporter did not return an ArrayBuffer.'));
        }
      },
      (err) => {
        objectUrlsToRevoke.forEach((u) => URL.revokeObjectURL(u));
        reject(err);
      },
      { binary: true, embedImages: true, animations: validAnimations }
    );
  });
}

/**
 * Converts a Stereolithography (.stl) file into a standard GLB mesh.
 */
export async function convertStlToGlb(stlFile: File): Promise<File> {
  const arrayBuffer = await stlFile.arrayBuffer();
  const loader = new STLLoader();
  const geometry = loader.parse(arrayBuffer);
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: 0xd4af37, // warm Saints gold / neutral
    roughness: 0.5,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geometry, material);

  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    exporter.parse(
      mesh,
      (gltf) => {
        if (gltf instanceof ArrayBuffer) {
          const blob = new Blob([gltf], { type: 'model/gltf-binary' });
          const newFilename = stlFile.name.replace(/\.stl$/i, '.glb');
          resolve(new File([blob], newFilename, { type: 'model/gltf-binary' }));
        } else {
          reject(new Error('GLTFExporter did not return an ArrayBuffer.'));
        }
      },
      (err) => reject(err),
      { binary: true, embedImages: true, animations: [] }
    );
  });
}

/**
 * Converts a Stanford Triangle (.ply) file into a standard GLB mesh with vertex color preservation.
 */
export async function convertPlyToGlb(plyFile: File): Promise<File> {
  const arrayBuffer = await plyFile.arrayBuffer();
  const loader = new PLYLoader();
  const geometry = loader.parse(arrayBuffer);
  geometry.computeVertexNormals();

  const hasVertexColors = !!geometry.attributes.color;
  const material = new THREE.MeshStandardMaterial({
    vertexColors: hasVertexColors,
    color: hasVertexColors ? 0xffffff : 0xd4af37,
    roughness: 0.5,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geometry, material);

  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    exporter.parse(
      mesh,
      (gltf) => {
        if (gltf instanceof ArrayBuffer) {
          const blob = new Blob([gltf], { type: 'model/gltf-binary' });
          const newFilename = plyFile.name.replace(/\.ply$/i, '.glb');
          resolve(new File([blob], newFilename, { type: 'model/gltf-binary' }));
        } else {
          reject(new Error('GLTFExporter did not return an ArrayBuffer.'));
        }
      },
      (err) => reject(err),
      { binary: true, embedImages: true, animations: [] }
    );
  });
}

/**
 * Unpacks a 3D model package ZIP containing an FBX, OBJ, VOX, DAE, STL, PLY, or GLB model,
 * companion textures, and optional companion animation FBX clips.
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
    return (
      l.endsWith('.fbx') ||
      l.endsWith('.glb') ||
      l.endsWith('.gltf') ||
      l.endsWith('.obj') ||
      l.endsWith('.vox') ||
      l.endsWith('.dae') ||
      l.endsWith('.stl') ||
      l.endsWith('.ply')
    );
  });

  if (modelEntries.length === 0) {
    throw new Error(
      'No supported 3D model files (.fbx, .glb, .gltf, .obj, .vox, .dae, .stl, .ply) found in ZIP archive.'
    );
  }

  // 2. Identify textures and materials
  const textureEntries = entries.filter((p) => {
    const l = p.toLowerCase();
    return (
      l.endsWith('.png') ||
      l.endsWith('.jpg') ||
      l.endsWith('.jpeg') ||
      l.endsWith('.webp') ||
      l.endsWith('.tga') ||
      l.endsWith('.dds') ||
      l.endsWith('.bmp')
    );
  });

  const textureFiles: File[] = [];
  for (const tPath of textureEntries) {
    const blob = await zip.files[tPath].async('blob');
    const filename = tPath.split('/').pop() || 'texture.png';
    textureFiles.push(new File([blob], filename, { type: blob.type || 'image/png' }));
  }

  const mtlEntry = entries.find((p) => p.toLowerCase().endsWith('.mtl'));
  let mtlFile: File | undefined;
  if (mtlEntry) {
    const mtlBlob = await zip.files[mtlEntry].async('blob');
    mtlFile = new File([mtlBlob], mtlEntry.split('/').pop() || 'material.mtl', {
      type: 'text/plain',
    });
  }

  // 3. Separate primary mesh, modular piece meshes, and animation clips
  const isAnimFileName = (name: string) =>
    /anim|walk|run|idle|jump|turn|jog|mocap|atk|attack|die|death|hit|react|claw|bite|cast|roar|crouch|stand/i.test(name);

  const isModularPieceName = (name: string) =>
    /hair|beard|hat|helmet|shirt|t_shirt|top|torso|jacket|armor|pant|leg|short|shoe|boot|sneaker|slipper|glove|hand|gauntlet|glass|face|emotion|cloth|cape|cloak|wing|weapon|sword|shield/i.test(name);

  const isPrimaryBodyName = (name: string) =>
    /body|base|character|hero|full|creative_character|skeleton/i.test(name) && !isModularPieceName(name);

  let primaryEntry = modelEntries[0];
  const animationEntries: string[] = [];
  const modularPieceEntries: string[] = [];

  if (modelEntries.length > 1) {
    const primaryCandidate = modelEntries.find((p) => isPrimaryBodyName(p.split('/').pop() || ''));
    if (primaryCandidate) {
      primaryEntry = primaryCandidate;
    } else {
      // Pick the non-animation mesh that isn't a modular piece or the largest file
      const nonAnims = modelEntries.filter((p) => !isAnimFileName(p));
      primaryEntry = nonAnims[0] || modelEntries[0];
    }

    for (const other of modelEntries) {
      if (other === primaryEntry) continue;
      if (isAnimFileName(other)) {
        animationEntries.push(other);
      } else {
        modularPieceEntries.push(other);
      }
    }
  }

  onProgress?.(`Extracting primary model: ${primaryEntry.split('/').pop()}`);
  const primaryBlob = await zip.files[primaryEntry].async('blob');
  const primaryFilename = primaryEntry.split('/').pop() || 'model.fbx';
  const rawModelFile = new File([primaryBlob], primaryFilename, {
    type: 'application/octet-stream',
  });

  // 4. Convert primary model to GLB based on format
  let finalGlbFile: File;
  const lowerExt = primaryFilename.toLowerCase();

  if (lowerExt.endsWith('.fbx')) {
    onProgress?.(`Converting FBX with ${textureFiles.length} textures...`);
    finalGlbFile = await convertFbxToGlb(rawModelFile, { textureFiles });
  } else if (lowerExt.endsWith('.obj')) {
    onProgress?.(`Converting OBJ with ${textureFiles.length} textures...`);
    finalGlbFile = await convertObjToGlb(rawModelFile, { mtlFile, textureFiles });
  } else if (lowerExt.endsWith('.vox')) {
    onProgress?.('Converting MagicaVoxel model...');
    finalGlbFile = await convertVoxToGlb(rawModelFile);
  } else if (lowerExt.endsWith('.dae')) {
    onProgress?.(`Converting Collada DAE with ${textureFiles.length} textures...`);
    finalGlbFile = await convertDaeToGlb(rawModelFile, { textureFiles });
  } else if (lowerExt.endsWith('.stl')) {
    onProgress?.('Converting STL model...');
    finalGlbFile = await convertStlToGlb(rawModelFile);
  } else if (lowerExt.endsWith('.ply')) {
    onProgress?.('Converting PLY model...');
    finalGlbFile = await convertPlyToGlb(rawModelFile);
  } else {
    finalGlbFile = rawModelFile;
  }

  // 5. Convert companion modular piece meshes to GLB with textures attached
  const modularPieceFiles: File[] = [];
  if (modularPieceEntries.length > 0) {
    onProgress?.(`Converting ${modularPieceEntries.length} modular attachment pieces...`);
    for (const modEntry of modularPieceEntries) {
      try {
        const modBlob = await zip.files[modEntry].async('blob');
        const modName = modEntry.split('/').pop() || 'piece.fbx';
        const rawMod = new File([modBlob], modName, { type: 'application/octet-stream' });
        const lowerMod = modName.toLowerCase();
        if (lowerMod.endsWith('.fbx')) {
          const convertedMod = await convertFbxToGlb(rawMod, { textureFiles });
          modularPieceFiles.push(convertedMod);
        } else if (lowerMod.endsWith('.obj')) {
          const convertedMod = await convertObjToGlb(rawMod, { mtlFile, textureFiles });
          modularPieceFiles.push(convertedMod);
        } else if (lowerMod.endsWith('.dae')) {
          const convertedMod = await convertDaeToGlb(rawMod, { textureFiles });
          modularPieceFiles.push(convertedMod);
        } else {
          modularPieceFiles.push(rawMod);
        }
      } catch (e) {
        console.warn('Failed to convert modular piece:', modEntry, e);
      }
    }
  }

  // 6. Convert any companion animation FBXs to GLB
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
    textureFiles,
    animationFiles,
    modularPieceFiles,
  };
}
