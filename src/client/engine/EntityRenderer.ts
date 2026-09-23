/**
 * Entity Renderer — Sprite billboards and smooth interpolation for
 * local player, remote players, and map entities (NPCs, Creatures).
 *
 * Ported from the monolith's BabylonEngine entity rendering.
 * Uses billboard planes with sprite sheet textures when available,
 * falling back to colored placeholder billboards.
 *
 * Position interpolation uses framerate-independent Vector3.Lerp with
 * exponential smoothing (spring-damper) matching the Renderer.ts follow logic.
 */
import * as BABYLON from '@babylonjs/core';
import { AdvancedDynamicTexture, TextBlock, Rectangle } from '@babylonjs/gui';
import { useWorldStore } from '../state/useWorldStore';
import { useMultiplayerStore } from '../state/useMultiplayerStore';
import { usePlayerStore } from '../state/usePlayerStore';
import { resolveEntitySpriteUrl } from '@/shared/game/creatureCatalog';
import { mapMesher } from './MapMesher';

// Player is 2 blocks tall (like a classic voxel game character)
const PLAYER_HEIGHT = 2.0;
const PLAYER_WIDTH = 1.0;
const PLAYER_EYE_HEIGHT = 1.62; // ~81% of height, natural eye level

// NPCs / creatures keep their original compact sizing
const ENTITY_HEIGHT = 1.2;
const ENTITY_WIDTH = 1.2;

const INTERPOLATION_SPEED = 12; // Higher = snappier

interface ManagedSprite {
  mesh: BABYLON.Mesh;
  label?: BABYLON.Mesh;
  gui?: AdvancedDynamicTexture;
  targetX: number;
  targetZ: number;
  targetY: number;
  lastSeen: number;
}

export class EntityRenderer {
  private scene: BABYLON.Scene | null = null;
  private entityRoot: BABYLON.TransformNode | null = null;

  // Track active sprite meshes
  private sprites: Map<string, ManagedSprite> = new Map();

  // Sprite texture cache (avoid re-loading the same URLs)
  private textureCache: Map<string, BABYLON.Texture> = new Map();

  public initialize(scene: BABYLON.Scene) {
    this.scene = scene;
    this.entityRoot = new BABYLON.TransformNode('entityRoot', scene);

    // Register render loop updates
    scene.onBeforeRenderObservable.add(this.update);
  }

  // ── Per-Frame Update ───────────────────────────────────────────────────────

  private update = () => {
    if (!this.scene) return;

    const engine = this.scene.getEngine();
    const dt = engine.getDeltaTime() / 1000.0;
    const smoothFactor = 1.0 - Math.exp(-INTERPOLATION_SPEED * dt);
    const now = Date.now();

    // 1. Local Player
    const player = usePlayerStore.getState().player;
    const is3D = player.position.z !== undefined;
    this.upsertSprite('local_player', {
      x: player.position.x,
      y: is3D ? (player.position.z as number) : player.position.y,
      name: player.name || 'You',
      color: new BABYLON.Color3(0.2, 0.6, 1),
      spriteUrl: player.assetProfileId ? resolveEntitySpriteUrl(player.assetProfileId, { kind: 'player' }) : undefined,
      isPlayer: true,
    }, now);

    // 2. Remote Players
    const remotePlayers = useMultiplayerStore.getState().otherPlayers as Record<string, any>;
    for (const [id, rp] of Object.entries(remotePlayers)) {
      // Dead reckoning: predict position based on velocity
      let px = rp.x ?? 0;
      let py = rp.z !== undefined ? rp.z : (rp.y ?? 0);
      if (rp.vx !== undefined && rp.vy !== undefined && rp.lastUpdateMs) {
        const elapsed = (now - rp.lastUpdateMs) / 1000.0;
        if (elapsed > 0 && elapsed < 2) {
          px += rp.vx * elapsed;
          // Note: if 3D, vz would be depth velocity. Assuming vy is used for depth if vz is undefined.
          const depthVel = rp.vz !== undefined ? rp.vz : rp.vy;
          py += depthVel * elapsed;
        }
      }

      this.upsertSprite(`remote_${id}`, {
        x: px,
        y: py,
        name: rp.name || 'Player',
        color: new BABYLON.Color3(1, 0.6, 0.2),
        spriteUrl: rp.assetProfileId ? resolveEntitySpriteUrl(rp.assetProfileId, { kind: 'player' }) : undefined,
        chatMessage: rp.chatMessage,
        isPlayer: true,
      }, now);
    }

    // 3. Map Entities (NPCs, Creatures)
    const mapEntities = useWorldStore.getState().mapEntities as any[];
    for (const ent of mapEntities) {
      const entitySpriteUrl = ent.spriteKey ? resolveEntitySpriteUrl(ent.spriteKey) : undefined;
      const entityColor = ent.type === 'NPC'
        ? new BABYLON.Color3(0.2, 0.8, 0.3)
        : new BABYLON.Color3(0.8, 0.2, 0.2);

      this.upsertSprite(`entity_${ent.id}`, {
        x: ent.position.x,
        y: ent.position.z !== undefined ? ent.position.z : ent.position.y,
        name: ent.name || ent.type,
        color: entityColor,
        spriteUrl: entitySpriteUrl,
      }, now);
    }

    // 4. Interpolate all sprites
    for (const [, sprite] of this.sprites) {
      sprite.mesh.position.x = BABYLON.Scalar.Lerp(sprite.mesh.position.x, sprite.targetX, smoothFactor);
      sprite.mesh.position.z = BABYLON.Scalar.Lerp(sprite.mesh.position.z, sprite.targetZ, smoothFactor);
      sprite.mesh.position.y = BABYLON.Scalar.Lerp(sprite.mesh.position.y, sprite.targetY, smoothFactor);
    }

    // 5. Clean up stale sprites (not seen for 5 seconds)
    const activeIds = new Set<string>();
    activeIds.add('local_player');
    for (const id of Object.keys(remotePlayers)) activeIds.add(`remote_${id}`);
    for (const ent of mapEntities) activeIds.add(`entity_${ent.id}`);

    for (const [id, sprite] of this.sprites.entries()) {
      if (!activeIds.has(id) || (now - sprite.lastSeen > 5000)) {
        sprite.mesh.dispose();
        sprite.label?.dispose();
        sprite.gui?.dispose();
        this.sprites.delete(id);
      }
    }
  };

  // ── Sprite Creation / Update ───────────────────────────────────────────────

  private upsertSprite(
    id: string,
    data: {
      x: number;
      y: number;
      name?: string;
      color: BABYLON.Color3;
      spriteUrl?: string;
      chatMessage?: string;
      isPlayer?: boolean;
    },
    now: number
  ) {
    if (!this.scene || !this.entityRoot) return;

    let sprite = this.sprites.get(id);

    const spriteW = data.isPlayer ? PLAYER_WIDTH : ENTITY_WIDTH;
    const spriteH = data.isPlayer ? PLAYER_HEIGHT : ENTITY_HEIGHT;

    if (!sprite) {
      // Create billboard mesh
      const mesh = BABYLON.MeshBuilder.CreatePlane(`sprite_${id}`, {
        width: spriteW,
        height: spriteH,
      }, this.scene);
      mesh.parent = this.entityRoot;
      mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

      // Material
      const mat = new BABYLON.StandardMaterial(`mat_${id}`, this.scene);
      mat.emissiveColor = data.color.scale(0.3);
      mat.specularColor = new BABYLON.Color3(0, 0, 0);
      mat.backFaceCulling = false;

      // Try to load sprite texture
      if (data.spriteUrl) {
        const tex = this.getOrLoadTexture(data.spriteUrl);
        if (tex) {
          tex.hasAlpha = true;
          // Apply foundational 3x4 sprite formatting abstraction (Idle, Facing Down)
          // TODO: Read this dynamically from sprite definitions and action state
          tex.uScale = 1 / 3;
          tex.vScale = 1 / 4;
          tex.uOffset = 1 / 3; // Idle frame (col 1)
          tex.vOffset = 0;     // Facing down (row 0)
          
          mat.diffuseTexture = tex;
          mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHATEST;
          mat.alphaCutOff = 0.3;
        } else {
          mat.diffuseColor = data.color;
        }
      } else {
        mat.diffuseColor = data.color;
      }

      mesh.material = mat;

      // Name label (floating GUI above head)
      let labelMesh: BABYLON.Mesh | undefined;
      let gui: AdvancedDynamicTexture | undefined;
      if (data.name && id !== 'local_player') {
        labelMesh = BABYLON.MeshBuilder.CreatePlane(`label_${id}`, { width: 2, height: 0.4 }, this.scene);
        labelMesh.parent = mesh;
        labelMesh.position.y = spriteH / 2 + 0.3;
        labelMesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

        gui = AdvancedDynamicTexture.CreateForMesh(labelMesh, 256, 64);
        const rect = new Rectangle();
        rect.background = 'rgba(0, 0, 0, 0.6)';
        rect.cornerRadius = 8;
        rect.thickness = 0;
        gui.addControl(rect);

        const text = new TextBlock();
        text.text = data.name;
        text.color = '#ffffff';
        text.fontSize = 20;
        text.fontFamily = 'Inter, sans-serif';
        rect.addControl(text);
      }

      const activeMap = useWorldStore.getState().activeMapData;
      const is3D = activeMap && (activeMap.mapType === 'VOXEL' || activeMap.mapType === 'FRACTAL' || activeMap.mapType === 'HYBRID');

      sprite = {
        mesh,
        label: labelMesh,
        gui,
        targetX: data.x,
        targetZ: is3D ? data.y : -data.y,
        targetY: spriteH / 2,
        lastSeen: now,
      };
      this.sprites.set(id, sprite);
    }

    // Update target position (interpolation happens in update loop)
    const activeMap = useWorldStore.getState().activeMapData;
    const is3D = activeMap && (activeMap.mapType === 'VOXEL' || activeMap.mapType === 'FRACTAL' || activeMap.mapType === 'HYBRID');

    sprite.targetX = data.x;
    sprite.targetZ = is3D ? data.y : -data.y; // Babylon Z is inverted 2D Y only for 2D maps
    
    // Auto-resolve terrain height so sprites aren't trapped in the geometry floor
    let terrainY = 0;
    const world = mapMesher.getVoxelWorld();
    if (world) {
      terrainY = world.getTopSolidVoxelY(data.x, sprite.targetZ) + world.originOffsetY;
    }
    sprite.targetY = terrainY + spriteH / 2;
    
    sprite.lastSeen = now;
  }

  // ── Texture Cache ──────────────────────────────────────────────────────────

  private getOrLoadTexture(url: string): BABYLON.Texture | null {
    if (!this.scene) return null;

    let tex = this.textureCache.get(url);
    if (tex) return tex;

    try {
      tex = new BABYLON.Texture(url, this.scene, true, false, BABYLON.Texture.NEAREST_SAMPLINGMODE);
      tex.hasAlpha = true;
      this.textureCache.set(url, tex);
      return tex;
    } catch {
      return null;
    }
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────

  public dispose() {
    if (this.scene) {
      this.scene.onBeforeRenderObservable.removeCallback(this.update);
    }

    for (const [, sprite] of this.sprites) {
      sprite.mesh.dispose();
      sprite.label?.dispose();
      sprite.gui?.dispose();
    }
    this.sprites.clear();

    for (const [, tex] of this.textureCache) {
      tex.dispose();
    }
    this.textureCache.clear();

    this.entityRoot?.dispose();
    this.scene = null;
  }
}

export const entityRenderer = new EntityRenderer();
