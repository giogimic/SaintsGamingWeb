import { GLTFLoader } from 'three-stdlib';
import * as THREE from 'three';
import {
  classifySkeletonRig,
  analyzeAnimationClip,
  RigAnalysisResult,
  CategorizedAnimationClip,
} from '@/shared/game/modelRigTaxonomy';

export interface ParsedMaterial {
  name: string;
  type: string;
  color?: string;
  hasTexture: boolean;
  hasNormalMap?: boolean;
  hasRoughnessMap?: boolean;
  hasMetalnessMap?: boolean;
  hasEmissiveMap?: boolean;
  hasAoMap?: boolean;
  textureNames?: Partial<Record<'map' | 'normalMap' | 'roughnessMap' | 'metalnessMap' | 'emissiveMap' | 'aoMap', string>>;
  roughness?: number;
  metalness?: number;
}

function getMaterialTextureNames(material: any): ParsedMaterial['textureNames'] {
  const channels = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap'] as const;
  const names: NonNullable<ParsedMaterial['textureNames']> = {};
  for (const channel of channels) {
    const texture = material?.[channel];
    if (!texture) continue;
    const image = texture.image || texture.source?.data;
    const imageName = image?.name || image?.currentSrc?.split('/').pop()?.split('?')[0] || image?.src?.split('/').pop()?.split('?')[0];
    names[channel] = texture.name || imageName || 'Attached texture';
  }
  return names;
}

export interface ParsedMesh {
  name: string;
  type: 'Mesh' | 'SkinnedMesh';
  materials: string[];
  morphTargets: string[];
}

export interface ParsedBone {
  name: string;
  parentName: string | null;
}

export interface ParsedAnimation {
  name: string;
  duration: number;
}

export interface ModelDimensions {
  width: number;
  height: number;
  depth: number;
  maxDimension: number;
  center: [number, number, number];
}

export interface ParsedGLB {
  scene: THREE.Group;
  animations: ParsedAnimation[];
  rawAnimations: THREE.AnimationClip[];
  categorizedAnimations: CategorizedAnimationClip[];
  meshes: ParsedMesh[];
  materials: Record<string, ParsedMaterial>;
  bones: ParsedBone[];
  isSkinned: boolean;
  rigAnalysis: RigAnalysisResult;
  dimensions: ModelDimensions;
}

export interface ParseGlbOptions {
  fileName?: string;
  isSingleClipOnActor?: boolean;
  modelBoneNames?: string[];
}

/**
 * Synchronizes parsed material descriptors with live Three.js materials on a scene object,
 * ensuring connected PBR textures are immediately reflected in UI and metadata.
 */
export function syncParsedMaterialsFromScene(
  scene: THREE.Object3D,
  materials: Record<string, ParsedMaterial>
): void {
  scene.traverse((child: any) => {
    if (child.isMesh && child.material) {
      const meshMaterials = Array.isArray(child.material) ? child.material : [child.material];
      meshMaterials.forEach((mat: any) => {
        const safeName = mat.name || 'Unnamed Material';
        const standardMat = mat as THREE.MeshStandardMaterial;
        materials[safeName] = {
          name: safeName,
          type: mat.type,
          color: standardMat.color ? standardMat.color.getHexString() : undefined,
          hasTexture: !!standardMat.map,
          hasNormalMap: !!standardMat.normalMap,
          hasRoughnessMap: !!standardMat.roughnessMap,
          hasMetalnessMap: !!standardMat.metalnessMap,
          hasEmissiveMap: !!standardMat.emissiveMap,
          hasAoMap: !!standardMat.aoMap,
          textureNames: getMaterialTextureNames(mat),
          roughness: typeof standardMat.roughness === 'number' ? standardMat.roughness : undefined,
          metalness: typeof standardMat.metalness === 'number' ? standardMat.metalness : undefined,
        };
      });
    }
  });
}

export async function parseGLB(url: string, options?: ParseGlbOptions): Promise<ParsedGLB> {
  const loader = new GLTFLoader();
  
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        const scene = gltf.scene;
        const rawAnimations = Array.isArray(gltf.animations) ? gltf.animations : [];
        
        const usedClipNames = new Set<string>();
        const animations: ParsedAnimation[] = rawAnimations.map((anim, index) => {
          const fileStem = options?.fileName?.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();
          const baseName = anim.name?.trim() || (rawAnimations.length === 1 && fileStem ? fileStem : `Animation ${index + 1}`);
          let name = baseName;
          let duplicateIndex = 2;
          while (usedClipNames.has(name)) name = `${baseName} (${duplicateIndex++})`;
          usedClipNames.add(name);
          // Keep the source clip, catalog entry, and categorized label on one stable name.
          anim.name = name;
          return {
          name,
          duration: anim.duration || 0,
          };
        });

        const meshes: ParsedMesh[] = [];
        const materials: Record<string, ParsedMaterial> = {};
        const bones: ParsedBone[] = [];
        let isSkinned = false;

        scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            const meshMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            
            const materialNames = meshMaterials.map(mat => {
              const safeName = mat.name || 'Unnamed Material';
              if (!materials[safeName]) {
                const standardMat = mat as THREE.MeshStandardMaterial;
                materials[safeName] = {
                  name: safeName,
                  type: mat.type,
                  color: standardMat.color ? standardMat.color.getHexString() : undefined,
                  hasTexture: !!standardMat.map,
                  hasNormalMap: !!standardMat.normalMap,
                  hasRoughnessMap: !!standardMat.roughnessMap,
                  hasMetalnessMap: !!standardMat.metalnessMap,
                  hasEmissiveMap: !!standardMat.emissiveMap,
                  hasAoMap: !!standardMat.aoMap,
                  textureNames: getMaterialTextureNames(mat),
                  roughness: typeof standardMat.roughness === 'number' ? standardMat.roughness : undefined,
                  metalness: typeof standardMat.metalness === 'number' ? standardMat.metalness : undefined,
                };
              }
              return safeName;
            });

            const morphTargets = mesh.morphTargetDictionary ? Object.keys(mesh.morphTargetDictionary) : [];

            const isSkinnedMesh = !!(child as THREE.SkinnedMesh).isSkinnedMesh;
            if (isSkinnedMesh) isSkinned = true;

            meshes.push({
              name: mesh.name || 'Unnamed Mesh',
              type: isSkinnedMesh ? 'SkinnedMesh' : 'Mesh',
              materials: materialNames,
              morphTargets,
            });
          }

          if ((child as THREE.Bone).isBone) {
            const bone = child as THREE.Bone;
            bones.push({
              name: bone.name,
              parentName: bone.parent && (bone.parent as THREE.Bone).isBone ? bone.parent.name : null,
            });
          }
        });

        // Bone analysis & Rig classification
        const boneNames = bones.map((b) => b.name);
        const rigAnalysis = classifySkeletonRig(boneNames);

        // Analyze and categorize all animations against the model's skeleton
        const targetBoneNames =
          options?.modelBoneNames && options.modelBoneNames.length > 0
            ? options.modelBoneNames
            : boneNames;

        const categorizedAnimations = rawAnimations.map((clip) =>
          analyzeAnimationClip(
            {
              name: clip.name,
              duration: clip.duration,
              tracks: clip.tracks,
            },
            {
              fileName: options?.fileName,
              modelBoneNames: targetBoneNames,
              isSingleClipOnActor: options?.isSingleClipOnActor ?? (rawAnimations.length === 1),
            }
          )
        );

        // Compute model dimensions from bounding box
        const bbox = new THREE.Box3().setFromObject(scene);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        bbox.getSize(size);
        bbox.getCenter(center);
        const dimensions: ModelDimensions = {
          width: Number(size.x.toFixed(3)),
          height: Number(size.y.toFixed(3)),
          depth: Number(size.z.toFixed(3)),
          maxDimension: Number(Math.max(size.x, size.y, size.z).toFixed(3)),
          center: [Number(center.x.toFixed(3)), Number(center.y.toFixed(3)), Number(center.z.toFixed(3))],
        };

        resolve({
          scene,
          animations,
          rawAnimations,
          categorizedAnimations,
          meshes,
          materials,
          bones,
          isSkinned,
          rigAnalysis,
          dimensions,
        });
      },
      undefined,
      (error) => {
        reject(error);
      }
    );
  });
}
