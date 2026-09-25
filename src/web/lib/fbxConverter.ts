import { FBXLoader } from 'three-stdlib';
import { GLTFExporter } from 'three-stdlib';

/**
 * Converts an uploaded FBX file into a GLB file in the browser.
 * This avoids sending heavy, proprietary FBX files to the server and 
 * ensures compatibility with Babylon.js (which natively supports GLB).
 */
export async function convertFbxToGlb(fbxFile: File): Promise<File> {
  // Try native Electron conversion first if available
  if (typeof window !== 'undefined' && (window as any).electronAPI?.convertFbx && (fbxFile as any).path) {
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

  // Fallback to in-browser conversion
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          if (!e.target?.result) {
            return reject(new Error("Failed to read FBX file."));
          }
          
          const loader = new FBXLoader();
          const object = loader.parse(e.target.result as ArrayBuffer, '');
          
          // Sanitize materials to prevent GLTFExporter crashes on missing external textures
          object.traverse((child: any) => {
            if (child.isMesh && child.material) {
              const materials = Array.isArray(child.material) ? child.material : [child.material];
              for (const mat of materials) {
                const mapTypes = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'specularMap', 'alphaMap'];
                for (const mapType of mapTypes) {
                  if (mat[mapType]) {
                    // GLTFExporter throws if image is undefined or invalid
                    if (!mat[mapType].image || mat[mapType].image.width === 0) {
                      console.warn(`Stripping invalid/missing external texture: ${mapType} on material ${mat.name}`);
                      mat[mapType] = null;
                    }
                  }
                }
              }
            }
          });
          
          const exporter = new GLTFExporter();
          exporter.parse(
            object,
            (gltf) => {
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
              reject(error);
            },
            { binary: true } // GLB format
          );
        } catch (err) {
          reject(err);
        }
      };
      
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(fbxFile);
      
    } catch (err) {
      reject(err);
    }
  });
}
