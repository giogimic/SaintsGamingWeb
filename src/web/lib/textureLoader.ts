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
 * Extracts a normalized core identifier token from a filename or material/mesh name.
 * Strips engine prefixes (T_, M_, MI_, TX_, MAT_, SKM_, SM_, S_),
 * channel suffixes (_ALB, _NRM, _ARM, _COL, _D, etc.), and file extensions.
 *
 * Example: 'T_DKM_Armor_ALB.tga' -> 'dkmarmor'
 * Example: 'M_DKM_Armor' -> 'dkmarmor'
 * Result: Exact match!
 */
export function extractCoreToken(str: string): string {
  if (!str) return '';
  let s = str.replace(/\.[a-zA-Z0-9]+$/, ''); // strip extension
  // strip engine/asset prefixes (e.g. T_, M_, MI_, TX_, MAT_, SKM_, SM_, S_, TEXTURE_, MATERIAL_)
  s = s.replace(/^(t|m|mi|tx|mat|skm|sm|s|texture|material)_/i, '');
  // strip channel suffixes (e.g. _alb, _albedo, _basecolor, _col, _diff, _d, _c, _nrm, _norm, _normal, _n, _arm, _orm, _rough, _r, _metal, _m, _ao, _occ, _emissive, _e, _glow)
  s = s.replace(
    /(_alb|_albedo|_basecolor|_col|_diff|_d|_c|_nrm|_norm|_normal|_n|_nm|_arm|_orm|_rough|_r|_metal|_m|_ao|_occ|_emissive|_e|_glow)$/i,
    ''
  );
  // return lowercase alphanumeric
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Loads a texture from a local File object, supporting Web images (.png, .jpg, .webp),
 * Targa (.tga), DirectDraw Surface (.dds), and Bitmaps (.bmp).
 */
export async function loadTextureFromFile(file: File): Promise<THREE.Texture> {
  const lower = file.name.toLowerCase();

  if (lower.endsWith('.tga')) {
    const buffer = await file.arrayBuffer();
    const loader = new TGALoader();
    const tgaData = loader.parse(buffer) as any;
    const tex = new THREE.DataTexture(
      tgaData.data,
      tgaData.width,
      tgaData.height,
      THREE.RGBAFormat,
      THREE.UnsignedByteType
    );
    tex.flipY = false;
    tex.generateMipmaps = true;
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
 * Defaults any standard image file to 'map' (Base Color / Albedo) rather than returning null.
 */
export function detectPbrChannel(filename: string): PbrChannel {
  const lower = filename.toLowerCase();

  // 1. Normal Map
  if (/(normal|nrm|_norm\b|_n\b|_nm\b)/i.test(lower)) return 'normalMap';

  // 2. Packed Roughness-Metallic-AO (ARM / ORM)
  if (/(_orm\b|_arm\b)/i.test(lower)) return 'roughnessMap';

  // 3. Roughness
  if (/(roughness|_rough\b|_r\b)/i.test(lower)) return 'roughnessMap';

  // 4. Metalness / Metallic
  if (/(metalness|metallic|_metal\b|_m\b)/i.test(lower)) return 'metalnessMap';

  // 5. Emissive / Glow
  if (/(emissive|emission|_emit\b|_glow\b|_e\b)/i.test(lower)) return 'emissiveMap';

  // 6. Ambient Occlusion
  if (/(ao\b|occlusion|_occ\b|ambient)/i.test(lower)) return 'aoMap';

  // 7. Base Color / Albedo / Diffuse
  if (/(base_?color|albedo|_alb\b|diffuse|_col\b|_diff\b|_d\b|_c\b|color)/i.test(lower)) return 'map';

  // Default: Any generic image file (e.g. HEAD.png, PANT BASE.png, Textures_4.png) is Base Color!
  return 'map';
}

/**
 * Converts any non-PBR material on a mesh to MeshStandardMaterial, ensuring that
 * PBR texture channels (roughness, metalness, normal, emissive, ao) can be bound.
 */
export function ensureStandardMaterials(object: THREE.Object3D): void {
  const converted = new Map<any, THREE.MeshStandardMaterial>();

  object.traverse((child: any) => {
    if (child.isMesh && child.material) {
      const origMaterials = Array.isArray(child.material) ? child.material : [child.material];
      const newMaterials = origMaterials.map((origMat: any, idx: number) => {
        if (origMat.isMeshStandardMaterial) return origMat;
        if (converted.has(origMat)) return converted.get(origMat)!;

        const stdMat = new THREE.MeshStandardMaterial({
          name: origMat.name || `${child.name || 'Mesh'}_Mat_${idx + 1}`,
          color: origMat.color ? origMat.color.clone() : new THREE.Color(1, 1, 1),
          map: origMat.map || null,
          normalMap: origMat.normalMap || (origMat.bumpMap ? origMat.bumpMap : null),
          aoMap: origMat.aoMap || null,
          emissive: origMat.emissive ? origMat.emissive.clone() : new THREE.Color(0, 0, 0),
          emissiveMap: origMat.emissiveMap || null,
          roughness: 0.6,
          metalness: 0.1,
          transparent: origMat.transparent || false,
          opacity: typeof origMat.opacity === 'number' ? origMat.opacity : 1.0,
        });

        if (stdMat.map) {
          stdMat.map.flipY = false;
          stdMat.map.needsUpdate = true;
        }
        if (stdMat.normalMap) {
          stdMat.normalMap.flipY = false;
          stdMat.normalMap.needsUpdate = true;
        }

        converted.set(origMat, stdMat);
        return stdMat;
      });

      child.material = Array.isArray(child.material) ? newMaterials : newMaterials[0];
    }
  });
}

/**
 * Attaches texture files to the best matching materials on an object based on
 * token normalization, filename matching, and PBR channel detection.
 */
export async function attachTextureFilesToMaterials(
  object: THREE.Object3D,
  textureFiles: File[]
): Promise<number> {
  if (!textureFiles || textureFiles.length === 0) return 0;

  // First convert all materials to MeshStandardMaterial
  ensureStandardMaterials(object);

  // Gather all unique MeshStandardMaterials across meshes
  const materialsList: THREE.MeshStandardMaterial[] = [];
  const seenMats = new Set<THREE.Material>();
  const meshToMatMap = new Map<string, THREE.MeshStandardMaterial[]>();

  object.traverse((child: any) => {
    if (child.isMesh && child.material) {
      const mats: THREE.MeshStandardMaterial[] = Array.isArray(child.material)
        ? child.material
        : [child.material];

      mats.forEach((m) => {
        if (!seenMats.has(m)) {
          seenMats.add(m);
          materialsList.push(m);
        }
      });

      if (child.name) {
        meshToMatMap.set(child.name, mats);
      }
    }
  });

  if (materialsList.length === 0) return 0;

  let attachedCount = 0;

  // If there is only ONE texture file provided and it's a diffuse/albedo texture,
  // or a shared palette texture (e.g. Textures_4.png), assign it to ALL untextured materials!
  if (textureFiles.length === 1) {
    const singleFile = textureFiles[0];
    const channel = detectPbrChannel(singleFile.name);
    try {
      const texture = await loadTextureFromFile(singleFile);
      texture.name = singleFile.name;
      for (const mat of materialsList) {
        if (!(mat as any)[channel]) {
          (mat as any)[channel] = texture;
          mat.needsUpdate = true;
          attachedCount++;
        }
      }
      return attachedCount;
    } catch (err) {
      console.warn(`[textureLoader] Failed to load single texture ${singleFile.name}:`, err);
      return 0;
    }
  }

  // Multiple texture files: intelligently match each texture to its material and PBR channel
  for (const tf of textureFiles) {
    const channel = detectPbrChannel(tf.name);
    const tfToken = extractCoreToken(tf.name);

    try {
      const texture = await loadTextureFromFile(tf);
      texture.name = tf.name;

      let targetMat: THREE.MeshStandardMaterial | undefined = undefined;

      // 1. Exact token match against material name
      targetMat = materialsList.find((m) => {
        const matToken = extractCoreToken(m.name || '');
        return matToken && matToken === tfToken;
      });

      // 2. Substring token match against material name
      if (!targetMat) {
        targetMat = materialsList.find((m) => {
          const matToken = extractCoreToken(m.name || '');
          return (
            matToken &&
            matToken.length > 2 &&
            (tfToken.includes(matToken) || matToken.includes(tfToken))
          );
        });
      }

      // 3. Match against mesh name
      if (!targetMat) {
        for (const [meshName, mats] of meshToMatMap.entries()) {
          const meshToken = extractCoreToken(meshName);
          if (
            meshToken &&
            meshToken.length > 2 &&
            (tfToken.includes(meshToken) || meshToken.includes(tfToken))
          ) {
            targetMat = mats[0];
            break;
          }
        }
      }

      // 3b. Anatomical Body-Part Matching (e.g. HEAD.png -> Head/Skin, PANT -> Pants, TORSO -> Torso/Chest, WRIST -> Wrist/Hand)
      if (!targetMat) {
        const tfLower = tf.name.toLowerCase();
        const isHead = /head|face|skin/i.test(tfLower);
        const isTorso = /torso|chest|body|shirt/i.test(tfLower);
        const isPants = /pant|leg|boot|shoe/i.test(tfLower);
        const isWrist = /wrist|glove|hand|arm/i.test(tfLower);

        targetMat = materialsList.find((m) => {
          const mName = (m.name || '').toLowerCase();
          if (isHead && /head|face|skin/i.test(mName)) return true;
          if (isTorso && /torso|chest|body|shirt/i.test(mName)) return true;
          if (isPants && /pant|leg|boot|shoe/i.test(mName)) return true;
          if (isWrist && /wrist|glove|hand|arm/i.test(mName)) return true;
          return false;
        });
      }

      // 4. Fallback: Assign to the first material that lacks this PBR channel
      if (!targetMat) {
        targetMat = materialsList.find((m) => !(m as any)[channel]) || materialsList[0];
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
