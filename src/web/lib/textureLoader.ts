import * as THREE from 'three';
import { TGALoader, DDSLoader } from 'three-stdlib';

export type PbrChannel =
  | 'map'
  | 'normalMap'
  | 'roughnessMap'
  | 'metalnessMap'
  | 'emissiveMap'
  | 'aoMap';

export const PBR_CHANNELS: ReadonlyArray<{ channel: PbrChannel; label: string; description: string }> = [
  { channel: 'map', label: 'Base Color / Albedo', description: 'Main diffuse color texture' },
  { channel: 'normalMap', label: 'Normal Map', description: 'Surface detail, bumps, and depth' },
  { channel: 'roughnessMap', label: 'Roughness', description: 'Surface glossiness vs matte finish' },
  { channel: 'metalnessMap', label: 'Metallic', description: 'Metallic vs non-metallic surfaces' },
  { channel: 'emissiveMap', label: 'Emissive / Glow', description: 'Self-illuminating glow map' },
  { channel: 'aoMap', label: 'Ambient Occlusion', description: 'Contact shadows and ambient shading' },
];

/**
 * Loads a texture from a local File object, supporting Web images (.png, .jpg, .webp),
 * Targa (.tga), DirectDraw Surface (.dds), and Bitmaps (.bmp).
 */
export async function loadTextureFromFile(file: File): Promise<THREE.Texture> {
  const lower = file.name.toLowerCase();

  if (lower.endsWith('.tga')) {
    const buffer = await file.arrayBuffer();
    const loader = new TGALoader();
    const tex = loader.parse(buffer);
    tex.flipY = false;
    tex.needsUpdate = true;
    return tex;
  }

  if (lower.endsWith('.dds')) {
    const buffer = await file.arrayBuffer();
    const loader = new DDSLoader();
    const dds = loader.parse(buffer, true);
    const tex = new THREE.CompressedTexture(
      dds.mipmaps as any,
      dds.width,
      dds.height,
      dds.format as any
    );
    tex.flipY = false;
    tex.needsUpdate = true;
    return tex;
  }

  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (tex) => {
        tex.flipY = false;
        tex.needsUpdate = true;
        resolve(tex);
      },
      undefined,
      (err) => reject(err)
    );
  });
}

/**
 * Detects the target PBR material channel for a texture based on filename conventions.
 */
export function detectPbrChannel(filename: string): PbrChannel | null {
  const lower = filename.toLowerCase();
  if (/(base_?color|albedo|diffuse|_col\b|_diff\b|_d\b|_c\b|color)/i.test(lower)) return 'map';
  if (/(normal|nrm|_norm\b|_n\b|_nm\b)/i.test(lower)) return 'normalMap';
  if (/(roughness|_rough\b|_r\b)/i.test(lower)) return 'roughnessMap';
  if (/(metalness|metallic|_metal\b|_m\b)/i.test(lower)) return 'metalnessMap';
  if (/(_orm\b|_arm\b)/i.test(lower)) return 'roughnessMap'; // Packed Occlusion-Roughness-Metallic
  if (/(emissive|emission|_emit\b|_glow\b|_e\b)/i.test(lower)) return 'emissiveMap';
  if (/(ao\b|occlusion|_occ\b|ambient)/i.test(lower)) return 'aoMap';
  return null;
}

/**
 * Attaches texture files to the best matching materials on an object based on
 * filename matching and PBR channel detection.
 */
export async function attachTextureFilesToMaterials(
  object: THREE.Object3D,
  textureFiles: File[]
): Promise<number> {
  if (!textureFiles || textureFiles.length === 0) return 0;

  // Gather all unique materials
  const materialsMap = new Map<string, THREE.MeshStandardMaterial>();
  object.traverse((child: any) => {
    if (child.isMesh && child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((m: any) => {
        if (m.name && !materialsMap.has(m.name)) {
          materialsMap.set(m.name, m);
        }
      });
    }
  });

  const materialsList = Array.from(materialsMap.values());
  let attachedCount = 0;

  for (const tf of textureFiles) {
    const channel = detectPbrChannel(tf.name) || 'map';
    try {
      const texture = await loadTextureFromFile(tf);
      texture.name = tf.name;

      let targetMat: THREE.MeshStandardMaterial | undefined = undefined;

      if (materialsList.length === 1) {
        targetMat = materialsList[0];
      } else {
        const tfClean = tf.name.toLowerCase().replace(/[^a-z0-9]/g, '');

        // Try to match material name
        targetMat = materialsList.find((m) => {
          const mClean = (m.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          return mClean && (tfClean.includes(mClean) || mClean.includes(tfClean));
        });

        // Fallback: match by mesh name
        if (!targetMat) {
          object.traverse((child: any) => {
            if (!targetMat && child.isMesh && child.material) {
              const meshClean = (child.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
              if (meshClean && (tfClean.includes(meshClean) || meshClean.includes(tfClean))) {
                targetMat = Array.isArray(child.material) ? child.material[0] : child.material;
              }
            }
          });
        }

        // Fallback to first material if unassigned
        if (!targetMat) {
          targetMat = materialsList.find((m) => !(m as any)[channel]) || materialsList[0];
        }
      }

      if (targetMat) {
        (targetMat as any)[channel] = texture;
        targetMat.needsUpdate = true;
        attachedCount++;
      }
    } catch (err) {
      console.warn(`[textureLoader] Failed to load/attach texture ${tf.name}:`, err);
    }
  }

  return attachedCount;
}
