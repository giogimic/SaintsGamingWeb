"use client";

import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Center, Environment, Float } from "@react-three/drei";
import { Suspense, useMemo, useRef, useLayoutEffect } from "react";

// 7x5 Voxel Grid for 'S'
const S_GRID = [
  [1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0],
  [1, 0, 0, 0, 0],
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 1],
  [0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1]
];

// 7x5 Voxel Grid for 'G'
const G_GRID = [
  [1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0],
  [1, 0, 0, 0, 0],
  [1, 0, 1, 1, 1],
  [1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1],
  [1, 1, 1, 1, 1]
];

interface VoxelInstance {
  pos: [number, number, number];
  scale: number;
}

function InstancedVoxelGroup({
  instances,
  color,
  emissiveIntensity,
}: {
  instances: VoxelInstance[];
  color: string;
  emissiveIntensity: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    if (!meshRef.current || instances.length === 0) return;
    const temp = new THREE.Object3D();
    for (let i = 0; i < instances.length; i++) {
      const inst = instances[i];
      temp.position.set(inst.pos[0], inst.pos[1], inst.pos[2]);
      temp.scale.set(inst.scale, inst.scale, inst.scale);
      temp.updateMatrix();
      meshRef.current.setMatrixAt(i, temp.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [instances]);

  if (instances.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, instances.length]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={emissiveIntensity}
        roughness={0.1}
        metalness={0.8}
      />
    </instancedMesh>
  );
}

function BatchedVoxelLogo() {
  const { pinkInstances, whiteInstances, blackInstances } = useMemo(() => {
    const pink: VoxelInstance[] = [];
    const white: VoxelInstance[] = [];
    const black: VoxelInstance[] = [];

    // 1. Letter S (Pink)
    const sOffsetX = -3;
    for (let z = 0; z < S_GRID.length; z++) {
      for (let x = 0; x < S_GRID[z].length; x++) {
        if (S_GRID[z][x] === 1) {
          pink.push({ pos: [sOffsetX + x, -z, 0], scale: 1 });
        }
      }
    }

    // 2. Letter G (White)
    const gOffsetX = 4;
    for (let z = 0; z < G_GRID.length; z++) {
      for (let x = 0; x < G_GRID[z].length; x++) {
        if (G_GRID[z][x] === 1) {
          white.push({ pos: [gOffsetX + x, -z, 0], scale: 1 });
        }
      }
    }

    // 3. Hexagon Frame
    const frameOffsetX = 2.5;
    const frameOffsetY = -3;
    const size = 1.2;
    const sides = 6;
    const radius = 10;
    const vertices: { x: number; y: number }[] = [];

    for (let i = 0; i < sides; i++) {
      const angle = (i * Math.PI * 2) / sides + Math.PI / 2;
      vertices.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
    }

    const seen = new Set<string>();
    for (let i = 0; i < sides; i++) {
      const v1 = vertices[i];
      const v2 = vertices[(i + 1) % sides];
      const dx = v2.x - v1.x;
      const dy = v2.y - v1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.ceil(dist / (size * 0.5));

      for (let j = 0; j <= steps; j++) {
        const t = j / steps;
        const x = v1.x + dx * t;
        const y = v1.y + dy * t;
        const gridX = Math.round(x / size) * size;
        const gridY = Math.round(y / size) * size;
        const key = `${gridX.toFixed(2)},${gridY.toFixed(2)}`;

        if (seen.has(key)) continue;
        seen.add(key);

        const pos: [number, number, number] = [frameOffsetX + gridX, frameOffsetY + gridY, 0];

        if (Math.abs(gridX) < size) {
          black.push({ pos, scale: size });
        } else if (gridX > 0) {
          pink.push({ pos, scale: size });
        } else {
          white.push({ pos, scale: size });
        }
      }
    }

    return { pinkInstances: pink, whiteInstances: white, blackInstances: black };
  }, []);

  return (
    <group>
      <InstancedVoxelGroup instances={pinkInstances} color="#f20089" emissiveIntensity={0.6} />
      <InstancedVoxelGroup instances={whiteInstances} color="#ffffff" emissiveIntensity={1.4} />
      <InstancedVoxelGroup instances={blackInstances} color="#000000" emissiveIntensity={0.0} />
    </group>
  );
}

export function SGVoxelLogo() {
  return (
    <div className="w-full h-full min-h-[300px] cursor-grab active:cursor-grabbing relative z-50 pointer-events-auto">
      <Canvas
        camera={{ position: [0, 0, 45], fov: 40 }}
        gl={{ powerPreference: "high-performance", antialias: true }}
      >
        <Suspense fallback={null}>
          <OrbitControls 
            enableZoom={false} 
            enablePan={false}
            autoRotate 
            autoRotateSpeed={1.5} 
          />
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={2} color="#f20089" />
          <pointLight position={[-10, -10, -10]} intensity={2} color="#00f5d4" />
          
          <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <Center>
              <BatchedVoxelLogo />
            </Center>
          </Float>
          
          {/* Preset city gives realistic reflections on the metalness material */}
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  );
}
