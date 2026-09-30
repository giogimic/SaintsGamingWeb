'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';
import { resolveEntitySpriteUrl } from '@/shared/game/creatureCatalog';
import { GripTransform } from './WorldModelSelector';
import { RotateCw, Compass, Eye, Maximize2 } from 'lucide-react';

interface ItemModelPreview3DProps {
  assetId?: string;
  modelUrl?: string;
  socket?: string;
  attachOffset?: GripTransform;
  modelScale?: number;
  className?: string;
}

function ItemMesh({
  url,
  attachOffset,
  modelScale = 1,
  showAxes = true,
  autoRotate = false,
}: {
  url: string;
  attachOffset?: GripTransform;
  modelScale?: number;
  showAxes?: boolean;
  autoRotate?: boolean;
}) {
  const [scene, setScene] = useState<THREE.Group | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pivotRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!url) return;
    let isCancelled = false;
    const loader = new GLTFLoader();

    loader.load(
      url,
      (gltf) => {
        if (!isCancelled) {
          setScene(gltf.scene);
          setError(null);
        }
      },
      undefined,
      (err) => {
        if (!isCancelled) {
          console.error('[ItemModelPreview3D] Failed to load GLB model:', err);
          setError('Failed to load 3D model.');
        }
      }
    );

    return () => {
      isCancelled = true;
    };
  }, [url]);

  useFrame((_, delta) => {
    if (autoRotate && pivotRef.current) {
      pivotRef.current.rotation.y += delta * 0.8;
    }
  });

  const posX = attachOffset?.position?.[0] ?? 0;
  const posY = attachOffset?.position?.[1] ?? 0;
  const posZ = attachOffset?.position?.[2] ?? 0;

  const rotX = ((attachOffset?.rotation?.[0] ?? 0) * Math.PI) / 180;
  const rotY = ((attachOffset?.rotation?.[1] ?? 0) * Math.PI) / 180;
  const rotZ = ((attachOffset?.rotation?.[2] ?? 0) * Math.PI) / 180;

  const effectiveScale = (modelScale || 1) * (attachOffset?.scale || 1);

  if (error) {
    return null;
  }

  return (
    <group ref={pivotRef}>
      {/* Hand / Socket Origin Marker (RGB Axis) */}
      {showAxes && (
        <group>
          <primitive object={new THREE.AxesHelper(0.35)} />
          {/* Subtle bone socket origin sphere */}
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.02, 16, 16]} />
            <meshBasicMaterial color="#06b6d4" wireframe />
          </mesh>
        </group>
      )}

      {/* Item Object with calibrated grip transform */}
      {scene && (
        <group
          position={[posX, posY, posZ]}
          rotation={[rotX, rotY, rotZ]}
          scale={[effectiveScale, effectiveScale, effectiveScale]}
        >
          <primitive object={scene} />
        </group>
      )}
    </group>
  );
}

export function ItemModelPreview3D({
  assetId,
  modelUrl,
  socket,
  attachOffset,
  modelScale = 1,
  className = 'h-56',
}: ItemModelPreview3DProps) {
  const [showAxes, setShowAxes] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);

  const effectiveUrl = useMemo(() => {
    if (modelUrl) return modelUrl;
    if (assetId) return resolveEntitySpriteUrl(assetId);
    return null;
  }, [assetId, modelUrl]);

  if (!effectiveUrl) {
    return (
      <div className={`w-full ${className} bg-[#050b14]/90 border border-slate-800 rounded-xl flex flex-col items-center justify-center p-4 text-center`}>
        <Compass className="w-8 h-8 text-slate-700 mb-2 animate-pulse" />
        <span className="text-xs font-bold text-slate-400">Select a 3D Model asset to preview</span>
        <span className="text-[10px] text-slate-600 mt-1">Calibrate weapon and tool grip alignment relative to player hands</span>
      </div>
    );
  }

  return (
    <div className={`w-full ${className} bg-[#050b14] border border-cyan-500/20 rounded-xl overflow-hidden relative shadow-inner flex flex-col`}>
      {/* Viewport Top Bar */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10">
        <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">
          3D Grip View
        </span>
        {socket && (
          <span className="text-[8.5px] font-mono text-amber-400 bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.2 rounded">
            {socket}
          </span>
        )}
      </div>

      {/* Viewport Controls */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-black/60 backdrop-blur-md p-1 rounded-md border border-white/10">
        <button
          type="button"
          onClick={() => setShowAxes(!showAxes)}
          title="Toggle Bone Socket Origin Axes"
          className={`p-1 rounded text-xs transition-colors ${showAxes ? 'bg-cyan-500/30 text-cyan-300' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <CrosshairsIcon active={showAxes} />
        </button>
        <button
          type="button"
          onClick={() => setAutoRotate(!autoRotate)}
          title="Toggle Turntable Rotation"
          className={`p-1 rounded text-xs transition-colors ${autoRotate ? 'bg-amber-500/30 text-amber-300' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <RotateCw size={12} className={autoRotate ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* 3D Canvas */}
      <div className="flex-1 w-full h-full">
        <Canvas
          camera={{ position: [0, 0.4, 1.2], fov: 45 }}
          gl={{ preserveDrawingBuffer: true }}
        >
          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 8, 5]} intensity={1.2} />
          <directionalLight position={[-5, -2, -5]} intensity={0.4} />
          <Environment preset="city" />

          <ItemMesh
            url={effectiveUrl}
            attachOffset={attachOffset}
            modelScale={modelScale}
            showAxes={showAxes}
            autoRotate={autoRotate}
          />

          <OrbitControls makeDefault target={[0, 0, 0]} />
          <Grid infiniteGrid sectionColor="#0891b2" cellColor="#1e293b" fadeDistance={8} />
        </Canvas>
      </div>

      {/* Bottom hint */}
      <div className="absolute bottom-1.5 left-2 right-2 flex justify-between items-center pointer-events-none text-[8.5px] text-slate-500">
        <span>RGB gizmo: Socket Pivot (Hand Bone)</span>
        <span>Drag to rotate • Scroll to zoom</span>
      </div>
    </div>
  );
}

function CrosshairsIcon({ active }: { active: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="22" y1="12" x2="18" y2="12" />
      <line x1="6" y1="12" x2="2" y2="12" />
      <line x1="12" y1="6" x2="12" y2="2" />
      <line x1="12" y1="22" x2="12" y2="18" />
    </svg>
  );
}
