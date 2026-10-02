'use client';

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Bounds, useBounds, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { ParsedGLB } from './glbParser';

export type LightingPreset = 'studio' | 'sunset' | 'dramatic' | 'night';

export interface AttachedSceneItem {
  id: string;
  scene: THREE.Object3D;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
}

export interface AssetInspector3DProps {
  parsedGLB: ParsedGLB;
  activeAnimationIndex?: number;
  showSkeleton?: boolean;
  showBounds?: boolean;
  showHumanReference?: boolean;
  wireframe?: boolean;
  lightingPreset?: LightingPreset;
  modelScale?: number;
  modelRotationY?: number;
  modelGrounding?: number;
  modelCameraYOffset?: number;
  attachedScenes?: AttachedSceneItem[];
}

export interface AssetInspector3DRef {
  takeSnapshot: () => string | null;
}

function SceneControls({ showBounds }: { showBounds?: boolean }) {
  const bounds = useBounds();
  useEffect(() => {
    if (showBounds) {
      bounds.refresh().clip().fit();
    }
  }, [bounds, showBounds]);
  return null;
}

function HumanHeightReference() {
  return (
    <group position={[1.1, 0, 0]}>
      {/* 1.75m human reference column */}
      <mesh position={[0, 0.875, 0]}>
        <cylinderGeometry args={[0.2, 0.22, 1.75, 16]} />
        <meshStandardMaterial color="#cbb26a" transparent opacity={0.25} wireframe />
      </mesh>
      {/* Head indicator sphere at 1.75m */}
      <mesh position={[0, 1.62, 0]}>
        <sphereGeometry args={[0.13, 16, 16]} />
        <meshStandardMaterial color="#f59e0b" transparent opacity={0.35} />
      </mesh>
      {/* 1.75m Top line ring */}
      <mesh position={[0, 1.75, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.22, 0.25, 24]} />
        <meshBasicMaterial color="#f59e0b" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Model({
  parsedGLB,
  activeAnimationIndex,
  showSkeleton,
  wireframe,
  modelScale = 0.8,
  modelRotationY = 0,
  modelGrounding = 0,
  attachedScenes = [],
}: AssetInspector3DProps) {
  const group = useRef<THREE.Group>(null);
  const { scene, rawAnimations } = parsedGLB;
  const mixer = useRef<THREE.AnimationMixer | null>(null);

  // Wireframe toggle
  useEffect(() => {
    if (!scene) return;
    scene.traverse((child: any) => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m: any) => {
          m.wireframe = !!wireframe;
        });
      }
    });
  }, [scene, wireframe]);

  useEffect(() => {
    if (group.current && rawAnimations.length > 0) {
      mixer.current = new THREE.AnimationMixer(group.current);
    }
    return () => {
      mixer.current?.stopAllAction();
      mixer.current = null;
    };
  }, [rawAnimations]);

  useEffect(() => {
    if (mixer.current && activeAnimationIndex !== undefined && rawAnimations[activeAnimationIndex]) {
      mixer.current.stopAllAction();
      const originalClip = rawAnimations[activeAnimationIndex];
      const rootObj = scene || group.current;

      const existingNodes = new Set<string>();
      if (rootObj) {
        rootObj.traverse((child: any) => {
          if (child.name) {
            existingNodes.add(child.name);
            const leaf = child.name.split(/[:\/|]/).pop();
            if (leaf) existingNodes.add(leaf);
          }
        });
      }

      const validTracks = originalClip.tracks.filter((track) => {
        const targetName = track.name.split('.')[0];
        const leaf = targetName.split(/[:\/|]/).pop() || targetName;
        return existingNodes.has(targetName) || existingNodes.has(leaf);
      });

      let clipToPlay = originalClip;
      if (validTracks.length !== originalClip.tracks.length) {
        clipToPlay = originalClip.clone();
        clipToPlay.tracks = validTracks;
      }

      const action = mixer.current.clipAction(clipToPlay);
      action.play();
    } else if (mixer.current) {
      mixer.current.stopAllAction();
    }
  }, [activeAnimationIndex, rawAnimations, scene]);

  useFrame((state, delta) => {
    mixer.current?.update(delta);
  });

  // Handle skeleton helper
  const skeletonHelperRef = useRef<THREE.SkeletonHelper | null>(null);
  useEffect(() => {
    if (scene && showSkeleton) {
      skeletonHelperRef.current = new THREE.SkeletonHelper(scene);
      scene.add(skeletonHelperRef.current);
    }
    return () => {
      if (skeletonHelperRef.current && scene) {
        scene.remove(skeletonHelperRef.current);
        skeletonHelperRef.current = null;
      }
    };
  }, [scene, showSkeleton]);

  return (
    <group 
      ref={group} 
      scale={[modelScale, modelScale, modelScale]}
      rotation={[0, (modelRotationY * Math.PI) / 180, 0]}
      position={[0, modelGrounding, 0]}
    >
      <primitive object={scene} />
      {/* Attached modular scenes (e.g. hair, armor, boots, hats) */}
      {attachedScenes.map((item) => (
        <primitive
          key={item.id}
          object={item.scene}
          position={item.position ?? [0, 0, 0]}
          rotation={
            item.rotation
              ? [(item.rotation[0] * Math.PI) / 180, (item.rotation[1] * Math.PI) / 180, (item.rotation[2] * Math.PI) / 180]
              : [0, 0, 0]
          }
          scale={item.scale ?? [1, 1, 1]}
        />
      ))}
    </group>
  );
}

export const AssetInspector3D = forwardRef<AssetInspector3DRef, AssetInspector3DProps>(
  (props, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const lighting = props.lightingPreset || 'studio';

    useImperativeHandle(ref, () => ({
      takeSnapshot: () => {
        if (!canvasRef.current) return null;
        try {
          return canvasRef.current.toDataURL('image/jpeg', 0.85);
        } catch (e) {
          console.error("Failed to take snapshot of 3D canvas", e);
          return null;
        }
      },
    }));

    return (
      <div className="w-full h-full bg-[#050b14] rounded-md overflow-hidden border border-slate-800 relative select-none">
        <Canvas
          ref={canvasRef}
          camera={{ position: [0, 1.8, 4.5], fov: 45 }}
          gl={{ preserveDrawingBuffer: true, antialias: true }}
        >
          {/* Lighting Presets */}
          {lighting === 'studio' && (
            <>
              <ambientLight intensity={0.65} />
              <directionalLight position={[8, 12, 6]} intensity={1.2} />
              <directionalLight position={[-8, 6, -6]} intensity={0.4} />
              <Environment preset="city" />
            </>
          )}

          {lighting === 'sunset' && (
            <>
              <ambientLight intensity={0.35} color="#ffedd5" />
              <directionalLight position={[10, 8, 6]} intensity={1.8} color="#f59e0b" />
              <directionalLight position={[-8, 4, -6]} intensity={0.5} color="#60a5fa" />
              <Environment preset="sunset" />
            </>
          )}

          {lighting === 'dramatic' && (
            <>
              <ambientLight intensity={0.2} color="#0f172a" />
              <directionalLight position={[0, 10, -7]} intensity={2.5} color="#38bdf8" />
              <directionalLight position={[7, 4, 5]} intensity={1.0} color="#ec4899" />
              <Environment preset="night" />
            </>
          )}

          {lighting === 'night' && (
            <>
              <ambientLight intensity={0.18} color="#1e293b" />
              <directionalLight position={[-6, 8, 6]} intensity={1.2} color="#93c5fd" />
              <pointLight position={[0, 2, 2]} intensity={0.6} color="#38bdf8" />
              <Environment preset="park" />
            </>
          )}

          {props.showHumanReference && <HumanHeightReference />}
          
          <Bounds fit clip observe margin={1.2}>
            <Model {...props} />
            <SceneControls showBounds={props.showBounds} />
          </Bounds>

          <OrbitControls 
            makeDefault 
            target={[0, (props.modelCameraYOffset && props.modelCameraYOffset > 0 ? props.modelCameraYOffset : 0.9 * (props.modelScale ?? 0.8)), 0]} 
          />
          <Grid infiniteGrid fadeDistance={25} sectionColor="#334155" cellColor="#1e293b" sectionSize={1} cellSize={0.2} />
        </Canvas>
      </div>
    );
  }
);
AssetInspector3D.displayName = 'AssetInspector3D';

