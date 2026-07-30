"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Center, Environment, Float, Box } from "@react-three/drei";
import { Suspense, useMemo } from "react";

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

function VoxelLetter({ grid, position, color }: { grid: number[][], position: [number, number, number], color: string }) {
  const cubes = [];
  const size = 1;
  const padding = 0.0; // Set to 0 to make the blocks sit completely flush against each other

  for (let z = 0; z < grid.length; z++) {
    for (let x = 0; x < grid[z].length; x++) {
      if (grid[z][x] === 1) {
        cubes.push(
          <Box
            key={`${x}-${z}`}
            args={[size, size, size]}
            position={[x * (size + padding), -z * (size + padding), 0]}
          >
            <meshStandardMaterial 
              color={color} 
              emissive={color}
              emissiveIntensity={color === "#ffffff" ? 1.5 : 0.6}
              roughness={0.1}
              metalness={0.8}
            />
          </Box>
        );
      }
    }
  }

  return (
    <group position={position}>
      {cubes}
    </group>
  );
}

function VoxelFrame() {
  // Create a hollow Hexagon frame made of voxels with split colors
  const cubes = useMemo(() => {
    const c = [];
    const size = 1.2; // Slightly thicker border
    const sides = 6;
    const radius = 10; // Large enough to comfortably fit the letters without clipping
    const vertices = [];

    // Calculate the 6 vertices of the hexagon, pointing top/bottom
    for (let i = 0; i < sides; i++) {
      const angle = (i * Math.PI * 2) / sides + Math.PI / 2;
      vertices.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
    }

    // We will track grid positions in a Set to prevent overlapping blocks (Z-fighting)
    const seen = new Set<string>();

    // Draw straight lines of voxels between each vertex
    for (let i = 0; i < sides; i++) {
      const v1 = vertices[i];
      const v2 = vertices[(i + 1) % sides];
      
      const dx = v2.x - v1.x;
      const dy = v2.y - v1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Use high resolution sampling to ensure we don't miss grid points
      const steps = Math.ceil(dist / (size * 0.5));
      
      for (let j = 0; j <= steps; j++) {
        const t = j / steps;
        const x = v1.x + dx * t;
        const y = v1.y + dy * t;
        
        // Snap to voxel grid
        const gridX = Math.round(x / size) * size;
        const gridY = Math.round(y / size) * size;
        const key = `${gridX.toFixed(2)},${gridY.toFixed(2)}`;
        
        if (seen.has(key)) continue;
        seen.add(key);
        
        let cubeColor = "#ffffff";
        let emissiveInt = 0.8;
        
        // Split marks at center (gridX near 0) for both top and bottom
        if (Math.abs(gridX) < size) {
          cubeColor = "#000000"; // Black mark at the split
          emissiveInt = 0.0;
        } else if (gridX > 0) {
          cubeColor = "#f20089"; // Pink on the right side (White G side)
        } else {
          cubeColor = "#ffffff"; // White on the left side (Pink S side)
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
              roughness={0.1}
              metalness={0.8}
            />
          </Box>
        );
      }
    }
    return c;
  }, []);

  // Center of the letters is roughly x=2.5, y=-3.
  return <group position={[2.5, -3, 0]}>{cubes}</group>;
}

export function SGVoxelLogo() {
  return (
    <div className="w-full h-full min-h-[300px] cursor-grab active:cursor-grabbing relative z-50">
      <Canvas camera={{ position: [0, 0, 45], fov: 40 }}>
        <Suspense fallback={null}>
          <OrbitControls 
            enableZoom={false} 
            enablePan={false}
            autoRotate 
            autoRotateSpeed={1.5} 
            // Allow right click rotation but orbit controls uses left click by default
            // By default orbit controls uses left mouse to rotate. We can leave it as is so user can drag.
          />
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={2} color="#f20089" />
          <pointLight position={[-10, -10, -10]} intensity={2} color="#00f5d4" />
          
          <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <Center>
              {/* Voxel Frame around the letters - Split color logic applied internally */}
              <VoxelFrame />

              {/* Offset them so they sit side by side perfectly */}
              <group position={[-3, 0, 0]}>
                <VoxelLetter grid={S_GRID} position={[0, 0, 0]} color="#f20089" />
              </group>
              <group position={[4, 0, 0]}>
                <VoxelLetter grid={G_GRID} position={[0, 0, 0]} color="#ffffff" />
              </group>
            </Center>
          </Float>
          
          {/* Preset city gives nice realistic reflections on the metalness material */}
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  );
}
