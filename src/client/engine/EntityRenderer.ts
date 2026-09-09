/**
 * Entity Renderer — Sprite planes and animations for players/creatures.
 */
import * as BABYLON from '@babylonjs/core';
import { useWorldStore } from '../state/useWorldStore';
import { useMultiplayerStore } from '../state/useMultiplayerStore';
import { usePlayerStore } from '../state/usePlayerStore';

export class EntityRenderer {
  private scene: BABYLON.Scene | null = null;
  private entityRoot: BABYLON.TransformNode | null = null;
  
  // Track active sprite meshes
  private spriteMeshes: Map<string, BABYLON.Mesh> = new Map();

  public initialize(scene: BABYLON.Scene) {
    this.scene = scene;
    this.entityRoot = new BABYLON.TransformNode('entityRoot', scene);

    // Register render loop updates
    scene.onBeforeRenderObservable.add(this.update);
  }

  private update = () => {
    if (!this.scene) return;

    // 1. Local Player
    const player = usePlayerStore.getState().player;
    this.updateSprite('local_player', player.position.x, player.position.y, new BABYLON.Color3(0.2, 0.5, 1));

    // 2. Remote Players
    const remotePlayers = useMultiplayerStore.getState().otherPlayers as Record<string, any>;
    Object.entries(remotePlayers).forEach(([id, rp]) => {
      this.updateSprite(`remote_${id}`, rp.x, rp.y, new BABYLON.Color3(1, 0.5, 0.2));
    });

    // 3. Map Entities (NPCs, Creatures)
    const mapEntities = useWorldStore.getState().mapEntities as any[];
    mapEntities.forEach(ent => {
      this.updateSprite(`entity_${ent.id}`, ent.position.x, ent.position.y, new BABYLON.Color3(0.8, 0.2, 0.2));
    });

    // Clean up stale sprites (simplistic approach for Phase 3)
    const activeIds = new Set<string>();
    activeIds.add('local_player');
    Object.keys(remotePlayers).forEach(id => activeIds.add(`remote_${id}`));
    mapEntities.forEach(ent => activeIds.add(`entity_${ent.id}`));

    for (const [id, mesh] of this.spriteMeshes.entries()) {
      if (!activeIds.has(id)) {
        mesh.dispose();
        this.spriteMeshes.delete(id);
      }
    }
  };

  private updateSprite(id: string, x: number, y: number, color: BABYLON.Color3) {
    if (!this.scene) return;

    let mesh = this.spriteMeshes.get(id);
    if (!mesh) {
      // Create a billboard plane as placeholder sprite
      mesh = BABYLON.MeshBuilder.CreatePlane(`sprite_${id}`, { size: 1 }, this.scene);
      mesh.parent = this.entityRoot;
      mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
      
      const mat = new BABYLON.StandardMaterial(`mat_${id}`, this.scene);
      mat.diffuseColor = color;
      mat.emissiveColor = color.scale(0.5);
      mesh.material = mat;
      
      this.spriteMeshes.set(id, mesh);
    }

    // Smooth interpolation could happen here, but for now just snap
    // Babylon Z is inverted 2D Y
    mesh.position.x = BABYLON.Scalar.Lerp(mesh.position.x, x, 0.3);
    mesh.position.z = BABYLON.Scalar.Lerp(mesh.position.z, -y, 0.3);
    mesh.position.y = 0.5; // Half size above ground
  }

  public dispose() {
    if (this.scene) {
      this.scene.onBeforeRenderObservable.removeCallback(this.update);
    }
    
    this.spriteMeshes.forEach(mesh => mesh.dispose());
    this.spriteMeshes.clear();
    
    this.entityRoot?.dispose();
    this.scene = null;
  }
}

export const entityRenderer = new EntityRenderer();
