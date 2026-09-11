'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as BABYLON from '@babylonjs/core';
import { VoxelChunkMesher } from '@/engine/voxel/VoxelChunkMesher';
import { VoxelWorld } from '@/shared/game/voxel/VoxelWorldDoc';
import type { SpawnValidationResult } from '@/shared/game/voxel/SpawnResolver';

export type ViewportCameraMode = 'orbit' | 'topdown' | 'free' | 'slice';

interface SetupVoxelViewportProps {
  world: VoxelWorld | null;
  spawnResult: SpawnValidationResult | null;
  cameraMode: ViewportCameraMode;
  autoOrbit: boolean;
  showChunkBorders: boolean;
  showWireframe: boolean;
}

export function SetupVoxelViewport({
  world,
  spawnResult,
  cameraMode,
  autoOrbit,
  showChunkBorders,
  showWireframe,
}: SetupVoxelViewportProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Babylon Refs
  const engineRef = useRef<BABYLON.Engine | null>(null);
  const sceneRef = useRef<BABYLON.Scene | null>(null);
  const mesherRef = useRef<VoxelChunkMesher | null>(null);
  const cameraRef = useRef<BABYLON.ArcRotateCamera | BABYLON.FreeCamera | null>(null);
  const rootNodeRef = useRef<BABYLON.TransformNode | null>(null);
  const chunkBordersRef = useRef<BABYLON.Mesh[]>([]);
  const spawnBeaconRef = useRef<BABYLON.Mesh | null>(null);

  // 1. Initialize Engine & Scene
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const engine = new BABYLON.Engine(canvasRef.current, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    });
    engineRef.current = engine;

    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.02, 0.04, 0.08, 1);
    sceneRef.current = scene;

    // Lighting
    const hemiLight = new BABYLON.HemisphericLight('hemiLight', new BABYLON.Vector3(0, 1, 0), scene);
    hemiLight.intensity = 0.7;
    hemiLight.groundColor = new BABYLON.Color3(0.15, 0.15, 0.2);

    const dirLight = new BABYLON.DirectionalLight('dirLight', new BABYLON.Vector3(-1, -2, -1.5), scene);
    dirLight.intensity = 0.5;

    // Root Node for all meshes
    const rootNode = new BABYLON.TransformNode('setupRootNode', scene);
    rootNodeRef.current = rootNode;

    // Mesher
    mesherRef.current = new VoxelChunkMesher(scene);

    // Initial Camera (Orbit by default)
    const camera = new BABYLON.ArcRotateCamera(
      'setupCamera',
      Math.PI / 4,
      Math.PI / 3,
      60,
      BABYLON.Vector3.Zero(),
      scene
    );
    camera.attachControl(canvasRef.current, true);
    camera.wheelPrecision = 20;
    camera.minZ = 0.1;
    camera.maxZ = 1000;
    cameraRef.current = camera;

    // Render Loop
    engine.runRenderLoop(() => {
      scene.render();
    });

    // Resize
    const resizeObserver = new ResizeObserver(() => {
      engine.resize();
    });
    resizeObserver.observe(canvasRef.current);

    return () => {
      resizeObserver.disconnect();
      engine.dispose();
      engineRef.current = null;
      sceneRef.current = null;
    };
  }, []);

  // 2. Mesh the World
  // Track which chunks we've already meshed for the CURRENT world instance
  const meshedChunksRef = useRef<Map<string, BABYLON.Mesh>>(new Map());
  const currentWorldInstanceRef = useRef<VoxelWorld | null>(null);

  useEffect(() => {
    if (!sceneRef.current || !rootNodeRef.current || !mesherRef.current) return;

    if (!world) {
      // Clear if world is null
      rootNodeRef.current.getChildren().forEach(child => child.dispose());
      chunkBordersRef.current = [];
      meshedChunksRef.current.clear();
      currentWorldInstanceRef.current = null;
      return;
    }

    // If it's a completely new world instance, wipe the slate clean
    if (currentWorldInstanceRef.current !== world) {
      rootNodeRef.current.getChildren().forEach(child => child.dispose());
      chunkBordersRef.current = [];
      meshedChunksRef.current.clear();
      currentWorldInstanceRef.current = world;
    }

    // Mesh chunks that haven't been meshed yet
    for (const [key, chunk] of world.chunks.entries()) {
      if (chunk.isEmpty()) continue;
      
      if (!meshedChunksRef.current.has(key)) {
        const result = mesherRef.current.meshChunk(world, chunk);
        if (result?.mesh) {
          result.mesh.parent = rootNodeRef.current;
          // Apply wireframe if requested
          if (showWireframe && result.mesh.material) {
            result.mesh.material.wireframe = true;
          }
          meshedChunksRef.current.set(key, result.mesh);
        }

        // Draw Chunk Borders if requested
        if (showChunkBorders) {
          const box = BABYLON.MeshBuilder.CreateBox(
            `border_${chunk.cx}_${chunk.cz}_${chunk.cy}`,
            { width: 32, height: 32, depth: 32 },
            sceneRef.current
          );
          box.position = new BABYLON.Vector3(
            chunk.cx * 32 + 16,
            chunk.cy * 32 + 16 + world.originOffsetY,
            chunk.cz * 32 + 16
          );
          box.parent = rootNodeRef.current;
          const mat = new BABYLON.StandardMaterial('borderMat', sceneRef.current);
          mat.wireframe = true;
          mat.emissiveColor = new BABYLON.Color3(1, 1, 0);
          mat.alpha = 0.2;
          box.material = mat;
          box.isPickable = false;
          chunkBordersRef.current.push(box);
        }
      }
    }

  }, [world, showWireframe, showChunkBorders]); // We rely on the parent triggering re-renders via generatedChunksCount

  // 3. Spawn Beacon
  useEffect(() => {
    if (!sceneRef.current || !rootNodeRef.current) return;

    if (spawnBeaconRef.current) {
      spawnBeaconRef.current.dispose();
      spawnBeaconRef.current = null;
    }

    if (spawnResult) {
      const yOffset = world?.originOffsetY || -16;
      
      // Volume box representing the player size (approx 1x2x1)
      const beacon = BABYLON.MeshBuilder.CreateBox(
        'spawnBeacon',
        { width: 1, height: 2, depth: 1 },
        sceneRef.current
      );
      // Position at the feet center + 1 for height
      beacon.position = new BABYLON.Vector3(
        spawnResult.position.x + 0.5,
        spawnResult.position.y + yOffset + 1,
        spawnResult.position.z + 0.5
      );
      
      const mat = new BABYLON.StandardMaterial('beaconMat', sceneRef.current);
      mat.emissiveColor = spawnResult.isSafe ? new BABYLON.Color3(0.2, 0.8, 0.2) : new BABYLON.Color3(0.8, 0.2, 0.2);
      mat.alpha = 0.5;
      mat.wireframe = true;
      beacon.material = mat;
      beacon.parent = rootNodeRef.current;
      spawnBeaconRef.current = beacon;
    }
  }, [spawnResult, world]);

  // 4. Camera Mode & Target
  useEffect(() => {
    if (!sceneRef.current || !cameraRef.current || !canvasRef.current) return;

    // Focus Target
    let targetX = 0, targetY = 0, targetZ = 0;
    if (spawnResult && world) {
      targetX = spawnResult.position.x;
      targetY = spawnResult.position.y + world.originOffsetY;
      targetZ = spawnResult.position.z;
    }

    const targetVec = new BABYLON.Vector3(targetX, targetY, targetZ);

    if (cameraMode === 'orbit' || cameraMode === 'topdown' || cameraMode === 'slice') {
      // Ensure we are using ArcRotateCamera
      if (!(cameraRef.current instanceof BABYLON.ArcRotateCamera)) {
        cameraRef.current.dispose();
        cameraRef.current = new BABYLON.ArcRotateCamera(
          'setupCamera',
          Math.PI / 4,
          Math.PI / 3,
          60,
          targetVec,
          sceneRef.current
        );
        cameraRef.current.attachControl(canvasRef.current, true);
        cameraRef.current.wheelPrecision = 20;
      }
      
      const arcCam = cameraRef.current as BABYLON.ArcRotateCamera;
      arcCam.setTarget(targetVec);

      if (cameraMode === 'topdown') {
        arcCam.alpha = -Math.PI / 2;
        arcCam.beta = 0.01; // nearly straight down
      } else if (cameraMode === 'slice') {
        arcCam.alpha = 0;
        arcCam.beta = Math.PI / 2; // parallel to ground
      } else {
        // Normal orbit
        arcCam.beta = Math.PI / 3;
      }
    } else if (cameraMode === 'free') {
      if (!(cameraRef.current instanceof BABYLON.FreeCamera)) {
        cameraRef.current.dispose();
        cameraRef.current = new BABYLON.FreeCamera(
          'freeCamera',
          new BABYLON.Vector3(targetX, targetY + 10, targetZ - 20),
          sceneRef.current
        );
        cameraRef.current.setTarget(targetVec);
        cameraRef.current.attachControl(canvasRef.current, true);
        (cameraRef.current as BABYLON.FreeCamera).speed = 1.5;
      }
    }
  }, [cameraMode, spawnResult, world]);

  // 5. Auto Orbit Loop
  useEffect(() => {
    if (!autoOrbit || !sceneRef.current || cameraMode !== 'orbit') return;
    
    const arcCam = cameraRef.current as BABYLON.ArcRotateCamera;
    if (!arcCam || !(arcCam instanceof BABYLON.ArcRotateCamera)) return;

    const observer = sceneRef.current.onBeforeRenderObservable.add(() => {
      arcCam.alpha -= 0.005;
    });

    return () => {
      sceneRef.current?.onBeforeRenderObservable.remove(observer);
    };
  }, [autoOrbit, cameraMode]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block focus:outline-none"
      style={{ touchAction: 'none' }}
    />
  );
}
