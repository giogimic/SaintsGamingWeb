import { GLTFLoader } from 'three-stdlib';
import * as THREE from 'three';

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
  roughness?: number;
  metalness?: number;
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

export interface ParsedGLB {
  scene: THREE.Group;
  animations: ParsedAnimation[];
  rawAnimations: THREE.AnimationClip[];
  meshes: ParsedMesh[];
  materials: Record<string, ParsedMaterial>;
  bones: ParsedBone[];
  isSkinned: boolean;
}

export async function parseGLB(url: string): Promise<ParsedGLB> {
  const loader = new GLTFLoader();
  
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        const scene = gltf.scene;
        const rawAnimations = Array.isArray(gltf.animations) ? gltf.animations : [];
        
        const animations: ParsedAnimation[] = rawAnimations.map(anim => ({
          name: anim.name || 'Unnamed Anim',
          duration: anim.duration || 0,
        }));

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

        resolve({
          scene,
          animations,
          rawAnimations,
          meshes,
          materials,
          bones,
          isSkinned,
        });
      },
      undefined,
      (error) => {
        reject(error);
      }
    );
  });
}
