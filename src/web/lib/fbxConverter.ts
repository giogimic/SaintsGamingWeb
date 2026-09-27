import * as THREE from 'three';
import { FBXLoader, GLTFExporter, TGALoader, DDSLoader } from 'three-stdlib';
import { attachTextureFilesToMaterials, loadTextureFromFile, detectPbrChannel } from './textureLoader';

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

          const DUMMY_PNG_1X1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
          const textureMap = new Map<string, string>();

          if (options?.textureFiles && options.textureFiles.length > 0) {
            for (const tf of options.textureFiles) {
              const url = URL.createObjectURL(tf);
              objectUrlsToRevoke.push(url);
              const cleanName = tf.name.toLowerCase();
              textureMap.set(cleanName, url);
              const baseName = cleanName.replace(/\.[^/.]+$/, '');
              if (baseName.length > 2) {
                textureMap.set(baseName, url);
              }
            }
          }

          manager.setURLModifier((rawUrl: string) => {
            if (!rawUrl) return rawUrl;
            const clean = decodeURIComponent(rawUrl).replace(/\\/g, '/');
            const filename = clean.substring(clean.lastIndexOf('/') + 1).toLowerCase();
            if (textureMap.has(filename)) {
              return textureMap.get(filename)!;
            }
            const base = filename.replace(/\.[^/.]+$/, '');
            if (base.length > 2 && textureMap.has(base)) {
              return textureMap.get(base)!;
            }
            // Fuzzy suffix match (e.g. Diffuse, BaseColor, Normal)
            for (const [key, url] of textureMap.entries()) {
              if (key.length > 3 && (filename.includes(key) || key.includes(filename))) {
                return url;
              }
            }
            // If the FBX requests an unsupported PSD or TIF/TIFF, fallback to neutral 1x1 to prevent FBXLoader crashes
            if (/\.(psd|tif|tiff)$/i.test(filename)) {
              return DUMMY_PNG_1X1;
            }
            return rawUrl;
          });

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
          let object: any;
          try {
            if (typeof Object.defineProperty === 'function') {
              try {
                Object.defineProperty(Object.prototype, 'Colors', {
                  value: { a: [] },
                  configurable: true,
                  writable: true,
                });
              } catch {}
              try {
                Object.defineProperty(Object.prototype, 'ColorIndex', {
                  value: { a: [] },
                  configurable: true,
                  writable: true,
                });
              } catch {}
            }
            object = loader.parse(e.target.result as ArrayBuffer, '');
          } finally {
            try {
              delete (Object.prototype as any).Colors;
              delete (Object.prototype as any).ColorIndex;
            } catch {}
          }

          // Wait for any async texture loads initiated by FBXLoader
          await new Promise<void>((res) => {
            if (pendingLoads > 0) {
              manager.onLoad = () => res();
              setTimeout(() => res(), 3000);
            } else {
              setTimeout(() => res(), 100);
            }
          });

          // Convert materials to MeshStandardMaterial (PBR)
          const standardMaterials = new Map<any, THREE.MeshStandardMaterial>();
          object.traverse((child: any) => {
            if (child.isMesh && child.material) {
              const origMaterials = Array.isArray(child.material) ? child.material : [child.material];
              const newMaterials = origMaterials.map((origMat: any) => {
                if (origMat.isMeshStandardMaterial) return origMat;
                if (standardMaterials.has(origMat)) return standardMaterials.get(origMat)!;

                const stdMat = new THREE.MeshStandardMaterial({
                  name: origMat.name || 'Material',
                  color: origMat.color ? origMat.color.clone() : new THREE.Color(1, 1, 1),
                  map: origMat.map || null,
                  normalMap: origMat.normalMap || (origMat.bumpMap ? origMat.bumpMap : null),
                  aoMap: origMat.aoMap || null,
                  emissive: origMat.emissive ? origMat.emissive.clone() : new THREE.Color(0, 0, 0),
                  emissiveMap: origMat.emissiveMap || null,
                  roughness: 0.5,
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

                standardMaterials.set(origMat, stdMat);
                return stdMat;
              });

              child.material = Array.isArray(child.material) ? newMaterials : newMaterials[0];
            }
          });

          // If external texture files were provided, intelligently attach them to PBR channels
          if (options?.textureFiles && options.textureFiles.length > 0) {
            await attachTextureFilesToMaterials(object, options.textureFiles);
          }

          // Await any pending image decodes
          const pendingImages: Promise<void>[] = [];
          const ALL_MAP_TYPES = [
            'map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap',
            'specularMap', 'alphaMap', 'bumpMap', 'displacementMap', 'aoMap',
            'lightMap', 'envMap', 'clearcoatMap', 'clearcoatNormalMap', 'clearcoatRoughnessMap',
          ];

          object.traverse((child: any) => {
            if (child.isMesh && child.material) {
              const materials = Array.isArray(child.material) ? child.material : [child.material];
              for (const mat of materials) {
                for (const mapType of ALL_MAP_TYPES) {
                  const tex = mat[mapType];
                  if (tex && tex.image instanceof HTMLImageElement && !tex.image.complete) {
                    pendingImages.push(
                      new Promise<void>((res) => {
                        tex.image.onload = () => res();
                        tex.image.onerror = () => res();
                      })
                    );
                  }
                }
              }
            }
          });

          if (pendingImages.length > 0) {
            await Promise.race([
              Promise.all(pendingImages),
              new Promise((res) => setTimeout(res, 4000)),
            ]);
          }

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
          const isGenericClipName = (name?: string) => {
            if (!name) return true;
            const trimmed = name.trim().toLowerCase();
            return /^(take\s*\d+|unreal\s*take|animstack|default\s*take|mixamo\.com|scene|untitled)$/i.test(trimmed);
          };

          const rawBase = fbxFile.name.replace(/\.[^/.]+$/, '').trim();
          const semanticBase = rawBase
            .replace(/^([0-9]+[_\s-])+/, '')
            .replace(/[_-]+/g, ' ')
            .trim() || rawBase;

          const rawAnimations = Array.isArray(object.animations) ? object.animations : [];
          const validAnimations = rawAnimations.filter((clip: any) => {
            return clip && Array.isArray(clip.tracks) && clip.tracks.length > 0;
          });

          // Rename generic clips (e.g. Take 001, Unreal Take) using file semantics so slots map correctly
          validAnimations.forEach((clip: any, idx: number) => {
            if (isGenericClipName(clip.name) || validAnimations.length === 1) {
              clip.name = validAnimations.length === 1 ? semanticBase : `${semanticBase} ${idx + 1}`;
            }
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
