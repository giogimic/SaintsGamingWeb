import { BabylonEngine } from './BabylonEngine';
import { isInGridFootprint } from '../shared/game/brushGeometry';
import { isTilePickTarget } from '../shared/game/tilePaint';
import { Vector3, Matrix, Ray } from '@babylonjs/core';
import { VoxelTargetResolution } from '../shared/game/voxel/VoxelTargetResolver';

export class InputController {
  private engine: BabylonEngine;
  constructor(engine: BabylonEngine) {
    this.engine = engine;
  }

public onEditorPointerDown = (e: PointerEvent) => this.handleEditorPointerDown(e);
public onEditorPointerMove = (e: PointerEvent) => this.handleEditorPointerMove(e);
public onEditorPointerUp = (e: PointerEvent) => this.handleEditorPointerUp(e);
public onEditorWheel = (e: WheelEvent) => {
    if (!this.engine.editorCameraMode) return;
    if (e.shiftKey || e.altKey) {
      e.preventDefault();
      const step = e.deltaY > 0 ? 15 : -15;
      window.dispatchEvent(new CustomEvent('studio_rotate_brush', { detail: { step } }));
      return;
    }
    if (this.engine.renderer.isFreeCam) {
      e.preventDefault();
      this.engine.renderer.zoomFreeCam(e.deltaY);
    }
  };
public onEditorKeyDown = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement)?.closest?.('input,textarea,[contenteditable]')) {
      return;
    }
    if (e.code === 'Space') {
      e.preventDefault();
      this.editorSpaceHeld = true;
    }

    // Brush / Stamp / Splat Rotation Hotkeys (R / Shift+R for 90°, [ / ] for 15°)
    if (e.code === 'KeyR') {
      e.preventDefault();
      const step = e.shiftKey ? -90 : 90;
      window.dispatchEvent(new CustomEvent('studio_rotate_brush', { detail: { step } }));
      return;
    }
    if (e.code === 'BracketLeft') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('studio_rotate_brush', { detail: { step: -15 } }));
      return;
    }
    if (e.code === 'BracketRight') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('studio_rotate_brush', { detail: { step: 15 } }));
      return;
    }

    if (!this.engine.editorCameraMode) return;

    // FreeCam 3D Orbit & Angle Shortcuts (Q/E Orbit, PageUp/PageDown Pitch, Numpad 1/3/7 Angles)
    if (this.engine.renderer.isFreeCam) {
      if (e.code === 'KeyQ') {
        this.engine.renderer.cameraVelocityYaw -= 0.035 * this.engine.renderer.cameraSettings.orbitSensitivity;
      } else if (e.code === 'KeyE') {
        this.engine.renderer.cameraVelocityYaw += 0.035 * this.engine.renderer.cameraSettings.orbitSensitivity;
      } else if (e.code === 'PageUp') {
        this.engine.renderer.cameraVelocityPitch = Math.min(Math.PI / 2 - 0.05, this.engine.renderer.cameraPitch + 0.06);
        this.engine.renderer.updateFreeCamPosition();
      } else if (e.code === 'PageDown') {
        this.engine.renderer.cameraVelocityPitch = Math.max(0.08, this.engine.renderer.cameraPitch - 0.06);
        this.engine.renderer.updateFreeCamPosition();
      } else if (e.code === 'Numpad1') {
        this.engine.renderer.setViewAngle('front');
      } else if (e.code === 'Numpad3') {
        this.engine.renderer.setViewAngle('east');
      } else if (e.code === 'Numpad7') {
        this.engine.renderer.setViewAngle('topdown');
      }
    }
  };
public onEditorDblClick = (e: MouseEvent) => {
    if (!this.engine.editorCameraMode || !this.engine.scene) return;
    const pick = this.engine.scene.pick(this.engine.scene.pointerX, this.engine.scene.pointerY);
    if (pick && pick.hit && pick.pickedPoint) {
      this.engine.renderer.snapCameraTo(pick.pickedPoint.x, pick.pickedPoint.z);
      if (this.engine.renderer.isFreeCam) {
        this.engine.renderer.updateFreeCamPosition();
      }
    }
  };
public onEditorAuxClick = (e: MouseEvent) => {
    if (e.button === 1) e.preventDefault();
  };
public onEditorKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Space') this.editorSpaceHeld = false;
  };
public onEntityClick?: (entityId: string) => void;
public editorPanPointerId: number | null = null;
public editorPanLastClientX: number = 0;
public editorPanLastClientY: number = 0;
public editorSpaceHeld: boolean = false;
public editorPanKeysHeld: Set<string> = new Set();
public editorPanAnimFrameId: number | null = null;
public handleEditorPointerDown(e: PointerEvent) {
    if (!this.engine.editorCameraMode) return;
    const middle = e.button === 1;
    const right = e.button === 2 && this.engine.renderer.isFreeCam;
    const spaceLeft = e.button === 0 && this.editorSpaceHeld;
    if (!middle && !right && !spaceLeft) return;
    e.preventDefault();
    this.engine.renderer.killCameraMomentum();
    this.editorPanPointerId = e.pointerId;
    this.editorPanLastClientX = e.clientX;
    this.editorPanLastClientY = e.clientY;
    try {
      this.engine.canvas.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

public handleEditorPointerMove(e: PointerEvent) {
    if (!this.engine.editorCameraMode || this.editorPanPointerId !== e.pointerId) return;
    const dx = e.clientX - this.editorPanLastClientX;
    const dy = e.clientY - this.editorPanLastClientY;
    this.editorPanLastClientX = e.clientX;
    this.editorPanLastClientY = e.clientY;

    if (this.engine.renderer.isFreeCam) {
      const isPan = e.shiftKey || this.editorSpaceHeld;
      if (isPan) {
        this.engine.renderer.panFreeCamByScreenDelta(dx, dy);
      } else {
        this.engine.renderer.rotateFreeCam(dx, dy);
      }
    } else {
      this.panEditorCameraByScreenDelta(dx, dy);
    }
  }

public handleEditorPointerUp(e: PointerEvent) {
    if (this.editorPanPointerId !== e.pointerId) return;
    this.editorPanPointerId = null;
    try {
      this.engine.canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

public panEditorCameraByScreenDelta(dxPx: number, dyPx: number) {
    const h = Math.max(1, this.engine.engine.getRenderHeight());
    const ortho = this.engine.renderer.camera.orthoTop || 10;
    // Match isometric view: screen Y maps roughly to world Z with pitch stretch.
    const worldPerPx = (ortho * 2) / h;
    const worldDx = -dxPx * worldPerPx;
    const worldDz = dyPx * worldPerPx * 1.414;
    // Editor pan must reach map edges — do not use play-mode hard clamp.
    this.engine.renderer.cameraTargetX += worldDx;
    this.engine.renderer.cameraTargetZ += worldDz;
    this.engine.renderer.camera.position = new Vector3(this.engine.renderer.cameraTargetX, 14, this.engine.renderer.cameraTargetZ - 14);
    this.engine.renderer.camera.setTarget(new Vector3(this.engine.renderer.cameraTargetX, 0, this.engine.renderer.cameraTargetZ));
    this.engine.renderer.cameraSnapped = true;
  }

public startEditorKeyboardPan() {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!this.engine.editorCameraMode) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const code = e.code;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home'].includes(code)) {
        e.preventDefault();
        if (code === 'Home') {
          this.engine.renderer.fitMapInView();
          return;
        }
        this.editorPanKeysHeld.add(code);
        this.startEditorPanLoop();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      this.editorPanKeysHeld.delete(e.code);
      if (this.editorPanKeysHeld.size === 0 && this.editorPanAnimFrameId !== null) {
        cancelAnimationFrame(this.editorPanAnimFrameId);
        this.editorPanAnimFrameId = null;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    // Return cleanup function.
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      this.editorPanKeysHeld.clear();
      if (this.editorPanAnimFrameId !== null) {
        cancelAnimationFrame(this.editorPanAnimFrameId);
        this.editorPanAnimFrameId = null;
      }
    };
  }

public startEditorPanLoop() {
    if (this.editorPanAnimFrameId !== null) return;
    let lastTime = performance.now();
    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      if (this.editorPanKeysHeld.size === 0) {
        this.editorPanAnimFrameId = null;
        return;
      }
      // Pan speed scales with current zoom level.
      const ortho = this.engine.renderer.camera.orthoTop || 10;
      const speed = ortho * 1.2 * dt;
      let dx = 0;
      let dz = 0;
      if (this.editorPanKeysHeld.has('KeyW') || this.editorPanKeysHeld.has('ArrowUp')) dz += speed;
      if (this.editorPanKeysHeld.has('KeyS') || this.editorPanKeysHeld.has('ArrowDown')) dz -= speed;
      if (this.editorPanKeysHeld.has('KeyA') || this.editorPanKeysHeld.has('ArrowLeft')) dx -= speed;
      if (this.editorPanKeysHeld.has('KeyD') || this.editorPanKeysHeld.has('ArrowRight')) dx += speed;
      if (dx !== 0 || dz !== 0) {
        this.engine.renderer.cameraTargetX += dx;
        this.engine.renderer.cameraTargetZ += dz;
        this.engine.renderer.camera.position = new Vector3(this.engine.renderer.cameraTargetX, 14, this.engine.renderer.cameraTargetZ - 14);
        this.engine.renderer.camera.setTarget(new Vector3(this.engine.renderer.cameraTargetX, 0, this.engine.renderer.cameraTargetZ));
        this.engine.renderer.cameraSnapped = true;
      }
      this.editorPanAnimFrameId = requestAnimationFrame(loop);
    };
    this.editorPanAnimFrameId = requestAnimationFrame(loop);
  }

public panEditorCameraToTile(r: number, c: number) {
    const w = this.engine.currentMapWidth;
    const h = this.engine.currentMapHeight;
    const s = this.engine.currentTileSize || 1;
    if (!w || !h) return;
    const worldX = (c - w / 2) * s;
    const worldZ = (h / 2 - r) * s;
    this.engine.renderer.snapCameraTo(worldX, worldZ);
  }

public resolveTilePick(
    pickResult: { hit?: boolean; pickedMesh?: { name: string } | null; pickedPoint?: { x: number; y: number; z: number } | null } | null
  ): { r: number; c: number; layerIdx: number; point?: { x: number; z: number } } | null {
    if (!pickResult?.hit || !pickResult.pickedMesh) return null;

    const name = pickResult.pickedMesh.name;

    // Prefer named logic / legacy per-tile meshes when present.
    if (name.startsWith('logic_') || name.startsWith('tile_')) {
      const parts = name.split('_');
      if (parts[0] === 'logic') {
        const r = parseInt(parts[1], 10);
        const c = parseInt(parts[2], 10);
        const point = pickResult.pickedPoint ? { x: pickResult.pickedPoint.x, z: pickResult.pickedPoint.z } : undefined;
        if (!Number.isNaN(r) && !Number.isNaN(c)) return { r, c, layerIdx: -2, point };
        return null;
      }
      if (parts.length === 3) {
        const r = parseInt(parts[1], 10);
        const c = parseInt(parts[2], 10);
        const point = pickResult.pickedPoint ? { x: pickResult.pickedPoint.x, z: pickResult.pickedPoint.z } : undefined;
        if (!Number.isNaN(r) && !Number.isNaN(c)) return { r, c, layerIdx: -1, point };
        return null;
      }
      if (parts.length === 4) {
        const layerIdx = parseInt(parts[1], 10);
        const r = parseInt(parts[2], 10);
        const c = parseInt(parts[3], 10);
        const point = pickResult.pickedPoint ? { x: pickResult.pickedPoint.x, z: pickResult.pickedPoint.z } : undefined;
        if (!Number.isNaN(r) && !Number.isNaN(c)) return { r, c, layerIdx, point };
        return null;
      }
    }

    // Batched tilesets (`tileset_mesh_*`), map_pick_plane, paint overlays, etc.
    // Ignore entity billboards — their picked points sit above the ground and
    // resolve to the wrong cell (or off-map).
    if (!isTilePickTarget(name)) return null;
    const point = pickResult.pickedPoint;
    if (!point) return null;
    const tile = this.engine.worldToTile(point.x, point.z);
    if (!tile) return null;
    return { r: tile.r, c: tile.c, layerIdx: -1, point: { x: point.x, z: point.z } };
  }

public pickTileFromGroundPlane(
    screenX: number,
    screenY: number
  ): { r: number; c: number; layerIdx: number; point?: { x: number; z: number } } | null {
    if (!this.engine.scene || !this.engine.renderer.camera) return null;
    const ray = this.engine.scene.createPickingRay(
      screenX,
      screenY,
      Matrix.Identity(),
      this.engine.renderer.camera
    );
    if (!ray || Math.abs(ray.direction.y) < 1e-6) return null;
    const t = -ray.origin.y / ray.direction.y;
    if (t < 0) return null;
    const worldX = ray.origin.x + t * ray.direction.x;
    const worldZ = ray.origin.z + t * ray.direction.z;
    const tile = this.engine.worldToTile(worldX, worldZ);
    if (!tile) return null;
    return { r: tile.r, c: tile.c, layerIdx: -1, point: { x: worldX, z: worldZ } };
  }

public pickTileAtScreenCoord(screenX: number, screenY: number): { r: number; c: number; layerIdx: number; point?: { x: number; z: number } } | null {
    if (!this.engine.scene) return null;
    const pickResult = this.engine.scene.pick(
      screenX,
      screenY,
      (mesh) => mesh.isPickable && isTilePickTarget(mesh.name)
    );
    const resolved = this.resolveTilePick(pickResult);
    if (resolved) return resolved;
    return this.pickTileFromGroundPlane(screenX, screenY);
  }

public pickWorldTarget(pointerX?: number, pointerY?: number): {
    kind: 'entity' | 'tile';
    entityId?: string;
    r: number;
    c: number;
    hitPoint?: Vector3;
  } | null {
    if (!this.engine.scene) return null;
    const px = pointerX !== undefined ? pointerX : this.engine.scene.pointerX;
    const py = pointerY !== undefined ? pointerY : this.engine.scene.pointerY;

    // 1. Raycast against entity meshes first (rendering group 1)
    const entityPick = this.engine.scene.pick(
      px,
      py,
      (mesh) =>
        mesh.isPickable &&
        mesh.renderingGroupId === 1 &&
        (mesh.name.startsWith('player_') ||
          mesh.name.startsWith('npc_') ||
          mesh.name.startsWith('creature_') ||
          this.engine.entityMeshes.has(mesh.name))
    );

    if (entityPick && entityPick.hit && entityPick.pickedMesh) {
      const meshName = entityPick.pickedMesh.name;
      let entityId = meshName;
      for (const [id, mesh] of this.engine.entityMeshes.entries()) {
        if (mesh === entityPick.pickedMesh) {
          entityId = id;
          break;
        }
      }
      const s = this.engine.currentTileSize || 1;
      const w = this.engine.currentMapWidth;
      const h = this.engine.currentMapHeight;
      const entityPos = entityPick.pickedMesh.position;
      const c = Math.round(entityPos.x / s + w / 2 - 0.5);
      const r = Math.round(h / 2 - entityPos.z / s - 0.5);
      return {
        kind: 'entity',
        entityId,
        r,
        c,
        hitPoint: entityPos.clone(),
      };
    }

    // 2. Raycast against ground plane / tiles
    const tilePick = this.engine.scene.pick(
      px,
      py,
      (mesh) => mesh.isPickable && isTilePickTarget(mesh.name)
    );
    const resolved = this.resolveTilePick(tilePick);
    if (resolved) {
      return {
        kind: 'tile',
        r: resolved.r,
        c: resolved.c,
        hitPoint: tilePick?.pickedPoint || undefined,
      };
    }

    return null;
  }

public enableTilePicking(
    onTileClick: (
      r: number,
      c: number,
      layerIdx?: number,
      eventType?: 'down' | 'move' | 'up',
      point?: { x: number; z: number },
      voxelTarget?: VoxelTargetResolution | null
    ) => void,
    options?: { 
      drag?: boolean; 
      onTileHover?: (r: number, c: number, voxelTarget?: VoxelTargetResolution | null) => void;
      onTileLeave?: () => void;
      onDragStart?: () => void;
      onDragEnd?: () => void;
      isPanActive?: () => boolean;
      onPanStateChange?: (panning: boolean) => void;
    }
  ) {
    let isPainting = false;
    let isPanning = false;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let lastKey = '';
    // Track last continuous world point for distance-based dedup in splat/freeform modes
    let lastContinuousX = -99999;
    let lastContinuousZ = -99999;
    /** Minimum squared world-unit distance before we emit another splat/freeform paint event */
    const CONTINUOUS_MIN_DIST_SQ = 0.0025; // 0.05 world units
    const allowDrag = !!options?.drag;

    const onContextMenu = (e: MouseEvent) => {
      if (this.engine.editorCameraMode) {
        e.preventDefault();
      }
    };
    this.engine.canvas.addEventListener('contextmenu', onContextMenu);

    const getResolvedTile = (screenX: number, screenY: number): { r: number; c: number; layerIdx: number; point?: { x: number; z: number } } | null => {
      if (!this.engine.scene) return null;
      const pickResult = this.engine.scene.pick(
        screenX,
        screenY,
        (mesh) => mesh.isPickable && isTilePickTarget(mesh.name)
      );
      const resolved = this.resolveTilePick(pickResult);
      if (resolved) return resolved;
      return this.pickTileFromGroundPlane(screenX, screenY);
    };

    const emitFromScenePick = (eventType?: 'down' | 'move' | 'up') => {
      if (!this.engine.scene) return;
      const resolved = getResolvedTile(this.engine.scene.pointerX, this.engine.scene.pointerY);
      const voxelTarget = this.engine.voxel.resolveVoxelTargetAtScreenCoord(this.engine.scene.pointerX, this.engine.scene.pointerY);
      const r = resolved?.r ?? (voxelTarget ? Math.max(0, Math.min(this.engine.currentMapHeight - 1, this.engine.currentMapHeight - 1 - voxelTarget.voxelCoord.wz)) : 0);
      const c = resolved?.c ?? (voxelTarget ? Math.max(0, Math.min(this.engine.currentMapWidth - 1, voxelTarget.voxelCoord.wx)) : 0);
      const layerIdx = resolved?.layerIdx ?? -1;
      const point = resolved?.point ?? (voxelTarget ? { x: voxelTarget.hitPoint.x, z: voxelTarget.hitPoint.z } : undefined);

      const isContinuousMode = this.engine.activeLayerType === 'paint-splat' || this.engine.activeLayerType === 'free-form';

      if (isContinuousMode && point) {
        // --- Continuous (splat / freeform) duplicate suppression ---
        if (eventType === 'move') {
          const dx = point.x - lastContinuousX;
          const dz = point.z - lastContinuousZ;
          if (dx * dx + dz * dz < CONTINUOUS_MIN_DIST_SQ) return;
        }
        lastContinuousX = point.x;
        lastContinuousZ = point.z;
        lastKey = '';

        onTileClick(r, c, layerIdx, eventType, point, voxelTarget);
        return;
      }

      // --- Grid / discrete mode duplicate suppression ---
      const key = voxelTarget ? `${voxelTarget.voxelCoord.wx}_${voxelTarget.voxelCoord.wy}_${voxelTarget.voxelCoord.wz}` : `${r},${c}`;
      if (key === lastKey && eventType === 'move') return;
      lastKey = key;

      // Apply brush radius for grid painting
      if (this.engine.brushRadius <= 1 || this.engine.activeBrushPattern) {
        onTileClick(r, c, layerIdx, eventType, point, voxelTarget);
      } else {
        const rad = this.engine.brushRadius - 1;
        const w = this.engine.currentMapWidth;
        const h = this.engine.currentMapHeight;
        for (let dr = -rad; dr <= rad; dr++) {
          for (let dc = -rad; dc <= rad; dc++) {
            if (!isInGridFootprint(dr, dc, rad, this.engine.brushShape)) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < h && nc >= 0 && nc < w) {
              const pt = point ? {
                x: point.x + (nc - c) * this.engine.currentTileSize,
                z: point.z - (nr - r) * this.engine.currentTileSize
              } : undefined;
              onTileClick(nr, nc, layerIdx, eventType, pt, voxelTarget);
            }
          }
        }
      }
    };

    const updateBrushPreview = () => {
      if (!this.engine.scene) {
        if (this.engine.lastHoveredR !== -1 || this.engine.lastHoveredC !== -1) {
          this.engine.lastHoveredR = -1;
          this.engine.lastHoveredC = -1;
          this.engine.clearBrushPreview();
          this.engine.voxel.clearVoxelCursor();
        }
        if (this.engine.canvas) this.engine.canvas.style.cursor = 'default';
        return;
      }

      const voxelTarget = this.engine.voxel.resolveVoxelTargetAtScreenCoord(this.engine.scene.pointerX, this.engine.scene.pointerY);
      const resolved = getResolvedTile(this.engine.scene.pointerX, this.engine.scene.pointerY);

      if (!resolved && !voxelTarget) {
        if (this.engine.lastHoveredR !== -1 || this.engine.lastHoveredC !== -1) {
          this.engine.lastHoveredR = -1;
          this.engine.lastHoveredC = -1;
          this.engine.clearBrushPreview();
          this.engine.voxel.clearVoxelCursor();
          if (options?.onTileLeave) options.onTileLeave();
        }
        if (this.engine.canvas) this.engine.canvas.style.cursor = 'default';
        return;
      }

      // Keep natural cursor visible
      if (this.engine.canvas && this.engine.canvas.style.cursor === 'none') this.engine.canvas.style.cursor = 'default';

      if (voxelTarget && this.engine.voxel.voxelWorld) {
        if (this.engine.footprintUnifiedMesh && this.engine.footprintUnifiedMesh.isVisible) {
          this.engine.footprintUnifiedMesh.isVisible = false;
        }
        this.engine.voxel.renderVoxelCursor(voxelTarget, this.engine.brushMode === 'eraser' ? 'erase' : this.engine.brushMode === 'eyedropper' ? 'inspect' : 'place');
      } else {
        this.engine.voxel.clearVoxelCursor();
      }

      const r = resolved?.r ?? (voxelTarget ? Math.max(0, Math.min(this.engine.currentMapHeight - 1, this.engine.currentMapHeight - 1 - voxelTarget.voxelCoord.wz)) : 0);
      const c = resolved?.c ?? (voxelTarget ? Math.max(0, Math.min(this.engine.currentMapWidth - 1, voxelTarget.voxelCoord.wx)) : 0);

      if (this.engine.activeLayerType === 'paint-splat' || this.engine.activeLayerType === 'free-form') {
        const pt = resolved?.point ?? (voxelTarget ? { x: voxelTarget.hitPoint.x, z: voxelTarget.hitPoint.z } : undefined);
        if (pt) {
          this.engine.renderContinuousSplatPreview(pt.x, pt.z);
        }
      } else if (!this.engine.voxel.voxelWorld) {
        if (this.engine.splatPreviewMesh && this.engine.splatPreviewMesh.isVisible) {
          this.engine.splatPreviewMesh.isVisible = false;
        }
        const sameCell = this.engine.lastHoveredR === r && this.engine.lastHoveredC === c;
        this.engine.lastHoveredR = r;
        this.engine.lastHoveredC = c;
        if (!sameCell) {
          this.engine.renderBrushPreview(r, c);
        }
      }

      if (options?.onTileHover) {
        options.onTileHover(r, c, voxelTarget);
      }
    };

    this.engine.scene.onPointerDown = (evt) => {
      if (!this.engine.scene) return;
      const button = evt.button;
      const isPanTrigger = button === 1 || (button === 0 && options?.isPanActive?.());

      if (isPanTrigger) {
        isPanning = true;
        lastPointerX = evt.clientX;
        lastPointerY = evt.clientY;
        if (this.engine.canvas) this.engine.canvas.style.cursor = 'grab';
        if (options?.onPanStateChange) options.onPanStateChange(true);
        return;
      }

      // Ignore right click (button === 2) for painting; context menu owns right click
      if (button === 2) {
        return;
      }

      if (button === 0) {
        isPainting = true;
        lastKey = '';
        if (options?.onDragStart) options.onDragStart();
        emitFromScenePick('down');
      }
    };

    this.engine.scene.onPointerUp = (evt) => {
      if (isPanning) {
        isPanning = false;
        if (this.engine.canvas) this.engine.canvas.style.cursor = 'default';
        if (options?.onPanStateChange) options.onPanStateChange(false);
      }
      if (isPainting) {
        isPainting = false;
        lastKey = '';
        emitFromScenePick('up');
        if (options?.onDragEnd) options.onDragEnd();
      }
    };

    this.engine.scene.onPointerMove = (evt) => {
      if (isPanning) {
        if (this.engine.canvas) this.engine.canvas.style.cursor = 'grabbing';
        const currentOrtho = this.engine.renderer.camera.orthoTop || 10;
        const renderHeight = Math.max(1, this.engine.engine.getRenderHeight());
        const worldPerPixel = (currentOrtho * 2) / renderHeight;
        const deltaX = evt.clientX - lastPointerX;
        const deltaY = evt.clientY - lastPointerY;
        lastPointerX = evt.clientX;
        lastPointerY = evt.clientY;

        const panX = -deltaX * worldPerPixel;
        const panZ = deltaY * worldPerPixel * 1.414;
        this.engine.renderer.cameraTargetX += panX;
        this.engine.renderer.cameraTargetZ += panZ;
        this.engine.renderer.camera.position = new Vector3(this.engine.renderer.cameraTargetX, 14, this.engine.renderer.cameraTargetZ - 14);
        this.engine.renderer.camera.setTarget(new Vector3(this.engine.renderer.cameraTargetX, 0, this.engine.renderer.cameraTargetZ));
        this.engine.renderer.cameraSnapped = true;
        return;
      }

      updateBrushPreview();
      if (!allowDrag || !isPainting || !this.engine.scene) return;
      emitFromScenePick('move');
    };
  }

public disableTilePicking() {
    this.engine.scene.onPointerDown = undefined;
    this.engine.scene.onPointerUp = undefined;
    this.engine.scene.onPointerMove = undefined;
    this.engine.lastHoveredR = -1;
    this.engine.lastHoveredC = -1;
    this.engine.clearBrushPreview();
    this.engine.clearActionPreview();
    if (this.engine.canvas) this.engine.canvas.style.cursor = 'default';
  }

}
