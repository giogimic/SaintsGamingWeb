import * as THREE from 'three';
import { FBXLoader, GLTFExporter, TGALoader, DDSLoader } from 'three-stdlib';

export interface FbxConversionOptions {
  textureFiles?: File[];
  onProgress?: (stage: string) => void;
}

/**
 * Converts an uploaded FBX file into a GLB file in the browser or via native Electron bridge.
 * Preserves all skeletal animations and connects external or embedded textures into the GLB.
 */
export async function convertFbxToGlb(
  fbxFile: File,
  options?: FbxConversionOptions
): Promise<File> {
  // Try native Electron conversion first if available and no browser texture remapping is specified
  if (
    typeof window !== 'undefined' &&
    (window as any).electronAPI?.convertFbx &&
    (fbxFile as any).path &&
    (!options?.textureFiles || options.textureFiles.length === 0)
  ) {
    try {
      console.log('Attempting native FBX conversion via Electron...', (fbxFile as any).path);
      const res = await (window as any).electronAPI.convertFbx((fbxFile as any).path);
      if (res.success && res.buffer) {
        const blob = new Blob([res.buffer], { type: 'model/gltf-binary' });
        const newFilename = fbxFile.name.replace(/\.fbx$/i, '.glb');
        return new File([blob], newFilename, { type: 'model/gltf-binary' });
      } else {
        console.warn('Native conversion failed, falling back to Three.js:', res.error);
      }
    } catch (err) {
      console.warn('Native IPC failed, falling back to Three.js:', err);
    }
  }

  // Fallback to in-browser conversion with full texture & animation support
  return new Promise((resolve, reject) => {
    const objectUrlsToRevoke: string[] = [];

    try {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          if (!e.target?.result) {
            return reject(new Error("Failed to read FBX file."));
          }

          // Build LoadingManager to intercept and supply external textures
          const manager = new THREE.LoadingManager();
          manager.addHandler(/\.tga$/i, new TGALoader(manager));
          manager.addHandler(/\.dds$/i, new DDSLoader());

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
              if (textureMap.has(filename)) {
                return textureMap.get(filename)!;
              }
              const base = filename.replace(/\.[^/.]+$/, '');
              if (textureMap.has(base)) {
                return textureMap.get(base)!;
              }
              // Fuzzy suffix match (e.g. Diffuse, BaseColor, Normal)
              for (const [key, url] of textureMap.entries()) {
                if (filename.includes(key) || key.includes(filename)) {
                  return url;
                }
              }
              return rawUrl;
            });
          }

          let pendingLoads = 0;
          manager.onStart = () => {
            pendingLoads++;
          };
          manager.onLoad = () => {
            pendingLoads = 0;
          };
          manager.onError = (url) => {
            console.warn('[FBXConverter] Texture load warning:', url);
          };

          const loader = new FBXLoader(manager);
          const object = loader.parse(e.target.result as ArrayBuffer, '');

          // Wait for any async texture loads initiated by FBXLoader
          await new Promise<void>((res) => {
            if (pendingLoads > 0) {
              manager.onLoad = () => res();
              // Safety timeout in case an unresolvable asset hangs
              setTimeout(() => res(), 1500);
            } else {
              setTimeout(() => res(), 100);
            }
          });

          const ALL_MAP_TYPES = [
            'map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap',
            'specularMap', 'specularColorMap', 'specularIntensityMap', 'alphaMap',
            'bumpMap', 'displacementMap', 'aoMap', 'lightMap', 'envMap',
            'gradientMap', 'clearcoatMap', 'clearcoatNormalMap', 'clearcoatRoughnessMap',
            'transmissionMap', 'thicknessMap', 'sheenColorMap', 'sheenRoughnessMap'
          ];

          // Sanitize materials and mesh properties to prevent GLTFExporter crashes on missing/corrupted textures
          object.traverse((child: any) => {
            if (child.isMesh) {
              if (child.morphTargetDictionary && !child.morphTargetInfluences) {
                child.morphTargetInfluences = [];
              }
              if (child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                for (const mat of materials) {
                  for (const mapType of ALL_MAP_TYPES) {
                    if (mat[mapType]) {
                      const tex = mat[mapType];
                      const img = tex?.image;
                      const isInvalid = !img ||
                                        (typeof img.width === 'number' && img.width === 0) ||
                                        (typeof img.height === 'number' && img.height === 0) ||
                                        (img instanceof HTMLImageElement && (!img.complete || img.naturalWidth === 0)) ||
                                        (img.data && img.data.length === 0);

                      if (isInvalid) {
                        mat[mapType] = null;
                      }
                    }
                  }
                }
              }
            }
          });

          // Filter animations to ensure only valid clips with populated tracks are exported
          const rawAnimations = Array.isArray(object.animations) ? object.animations : [];
          const validAnimations = rawAnimations.filter((clip: any) => {
            return clip && Array.isArray(clip.tracks) && clip.tracks.length > 0;
          });

          const exporter = new GLTFExporter();
          exporter.parse(
            object,
            (gltf) => {
              // Revoke all temporary object URLs
              objectUrlsToRevoke.forEach(u => URL.revokeObjectURL(u));

              if (gltf instanceof ArrayBuffer) {
                const blob = new Blob([gltf], { type: 'model/gltf-binary' });
                const newFilename = fbxFile.name.replace(/\.fbx$/i, '.glb');
                const newFile = new File([blob], newFilename, { type: 'model/gltf-binary' });
                resolve(newFile);
              } else {
                reject(new Error("GLTFExporter did not return an ArrayBuffer (is binary mode enabled?)."));
              }
            },
            (error) => {
              objectUrlsToRevoke.forEach(u => URL.revokeObjectURL(u));
              reject(error);
            },
            {
              binary: true,
              animations: validAnimations,
              embedImages: true,
            }
          );
        } catch (err) {
          objectUrlsToRevoke.forEach(u => URL.revokeObjectURL(u));
          reject(err);
        }
      };

      reader.onerror = (err) => {
        objectUrlsToRevoke.forEach(u => URL.revokeObjectURL(u));
        reject(err);
      };
      reader.readAsArrayBuffer(fbxFile);

    } catch (err) {
      objectUrlsToRevoke.forEach(u => URL.revokeObjectURL(u));
      reject(err);
    }
  });
}
