/**
 * Map Mesher — Builds flat tiles and 3D voxels for the active map.
 */
import * as BABYLON from '@babylonjs/core';
import { useWorldStore } from '../state/useWorldStore';

export class MapMesher {
  private scene: BABYLON.Scene | null = null;
  private tileRoot: BABYLON.TransformNode | null = null;
  private voxelRoot: BABYLON.TransformNode | null = null;
  
  // Cache meshes to avoid rebuilding
  private tileMeshes: Map<string, BABYLON.Mesh> = new Map();

  public initialize(scene: BABYLON.Scene) {
    this.scene = scene;
    this.tileRoot = new BABYLON.TransformNode('tileRoot', scene);
    this.voxelRoot = new BABYLON.TransformNode('voxelRoot', scene);

    // Listen to map data changes
    useWorldStore.subscribe(
      (state: any) => state.activeMapData,
      (mapData: any) => this.buildMap(mapData)
    );
    
    // Initial build if data already exists
    const initialData = useWorldStore.getState().activeMapData;
    if (initialData) this.buildMap(initialData);
  }

  private buildMap(mapData: any) {
    if (!this.scene || !this.tileRoot || !mapData) return;

    this.clearMap();

    // Simple 2D ground placeholder
    const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 100, height: 100 }, this.scene);
    ground.parent = this.tileRoot;
    ground.position.y = -0.1; // Slightly below zero to avoid z-fighting with sprites
    
    const mat = new BABYLON.StandardMaterial('groundMat', this.scene);
    mat.diffuseColor = new BABYLON.Color3(0.1, 0.3, 0.1);
    ground.material = mat;

    // TODO: In Phase 3b, implement actual greedy meshing for tiles and voxels based on mapData
  }

  private clearMap() {
    this.tileMeshes.forEach(mesh => mesh.dispose());
    this.tileMeshes.clear();
    
    if (this.tileRoot) {
      this.tileRoot.getChildren().forEach(c => c.dispose());
    }
    if (this.voxelRoot) {
      this.voxelRoot.getChildren().forEach(c => c.dispose());
    }
  }

  public dispose() {
    this.clearMap();
    this.tileRoot?.dispose();
    this.voxelRoot?.dispose();
    this.scene = null;
  }
}

export const mapMesher = new MapMesher();
