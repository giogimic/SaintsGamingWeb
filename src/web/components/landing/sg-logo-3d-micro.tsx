"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Center, Float, Box } from "@react-three/drei";
import { Suspense, useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";

// 7x5 Voxel Grid for 'S' (Identical to landing page 3D model)
const S_GRID = [
  [1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0],
  [1, 0, 0, 0, 0],
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 1],
  [0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1],
];

// 7x5 Voxel Grid for 'G' (Identical to landing page 3D model)
const G_GRID = [
  [1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0],
  [1, 0, 0, 0, 0],
  [1, 0, 1, 1, 1],
  [1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1],
  [1, 1, 1, 1, 1],
];

function MicroVoxelLetter({
  grid,
  position,
  color,
}: {
  grid: number[][];
  position: [number, number, number];
  color: string;
}) {
  const cubes = [];
  const size = 1;

  for (let z = 0; z < grid.length; z++) {
    for (let x = 0; x < grid[z].length; x++) {
      if (grid[z][x] === 1) {
        cubes.push(
          <Box
            key={`${x}-${z}`}
            args={[size, size, size]}
            position={[x * size, -z * size, 0]}
          >
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={color === "#ffffff" ? 1.2 : 0.6}
              roughness={0.15}
              metalness={0.85}
            />
          </Box>
        );
      }
    }
  }

  return <group position={position}>{cubes}</group>;
}

function MicroVoxelFrame() {
  const cubes = useMemo(() => {
    const c = [];
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

        let cubeColor = "#ffffff";
        let emissiveInt = 0.8;

        if (Math.abs(gridX) < size) {
          cubeColor = "#000000";
          emissiveInt = 0.0;
        } else if (gridX > 0) {
          cubeColor = "#f20089";
        } else {
          cubeColor = "#ffffff";
          emissiveInt = 1.2;
        }

        c.push(
          <Box
            key={`hex-${key}`}
            args={[size, size, size]}
            position={[gridX, gridY, 0]}
          >
            <meshStandardMaterial
              color={cubeColor}
              emissive={cubeColor}
              emissiveIntensity={emissiveInt}
              roughness={0.15}
              metalness={0.85}
            />
          </Box>
        );
      }
    }
    return c;
  }, []);

  return <group position={[2.5, -3, 0]}>{cubes}</group>;
}

function SpinningModel({ isHovered }: { isHovered: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      // Smooth continuous auto-rotation; accelerates on hover
      const speed = isHovered ? 3.5 : 1.2;
      groupRef.current.rotation.y += delta * speed;
    }
  });

  return (
    <group ref={groupRef}>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.3}>
        <Center>
          <MicroVoxelFrame />
          <group position={[-3, 0, 0]}>
            <MicroVoxelLetter grid={S_GRID} position={[0, 0, 0]} color="#f20089" />
          </group>
          <group position={[4, 0, 0]}>
            <MicroVoxelLetter grid={G_GRID} position={[0, 0, 0]} color="#ffffff" />
          </group>
        </Center>
      </Float>
    </group>
  );
}

interface SGMicro3DLogoProps {
  size?: number;
  className?: string;
}

export function SGMicro3DLogo({ size = 36, className = "" }: SGMicro3DLogoProps) {
  const [mounted, setMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={`inline-block rounded-lg shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 cursor-pointer overflow-visible ${className}`}
      style={{ width: size, height: size }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title="Saints Gaming (3D Interactive Logo)"
    >
      <Canvas
        camera={{ position: [0, 0, 48], fov: 38 }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        dpr={[1, 2]}
        className="w-full h-full pointer-events-none"
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.8} />
          <pointLight position={[10, 10, 15]} intensity={2.5} color="#f20089" />
          <pointLight position={[-10, -10, 15]} intensity={2.5} color="#00f5d4" />
          <directionalLight position={[0, 15, 10]} intensity={1.2} color="#ffffff" />

          <SpinningModel isHovered={isHovered} />
        </Suspense>
      </Canvas>
    </div>
  );
}
