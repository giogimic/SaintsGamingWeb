'use client';

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Bounds, useBounds, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { ParsedGLB } from './glbParser';

interface AssetInspector3DProps {
  parsedGLB: ParsedGLB;
  activeAnimationIndex?: number;
  showSkeleton?: boolean;
  showBounds?: boolean;
  modelScale?: number;
  modelRotationY?: number;
  modelGrounding?: number;
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

function Model({ parsedGLB, activeAnimationIndex, showSkeleton, modelScale = 1.0, modelRotationY = 0, modelGrounding = 0 }: AssetInspector3DProps) {
  const group = useRef<THREE.Group>(null);
  const { scene, rawAnimations } = parsedGLB;
  const mixer = useRef<THREE.AnimationMixer | null>(null);

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
      const action = mixer.current.clipAction(rawAnimations[activeAnimationIndex]);
      action.play();
    } else if (mixer.current) {
      mixer.current.stopAllAction();
    }
  }, [activeAnimationIndex, rawAnimations]);

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
    </group>
  );
}

export const AssetInspector3D = forwardRef<AssetInspector3DRef, AssetInspector3DProps>(
  (props, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

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
      <div className="w-full h-full bg-slate-900 rounded-md overflow-hidden border border-slate-700 relative">
        <Canvas
          ref={canvasRef}
          camera={{ position: [0, 2, 5], fov: 45 }}
          gl={{ preserveDrawingBuffer: true }} // required for takeSnapshot
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <directionalLight position={[-10, 10, -5]} intensity={0.5} />
          <Environment preset="city" />
          
          <Bounds fit clip observe margin={1.2}>
            <Model {...props} />
            <SceneControls showBounds={props.showBounds} />
          </Bounds>

          <OrbitControls makeDefault />
          <Grid infiniteGrid fadeDistance={20} sectionColor="#444" cellColor="#222" />
        </Canvas>
      </div>
    );
  }
);
AssetInspector3D.displayName = 'AssetInspector3D';
