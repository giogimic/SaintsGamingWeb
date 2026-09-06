import type { IToolHandler, ToolExecutionContext } from './IToolHandler';
import type { ToolPointerEvent } from '../types';
import { useEditorStore } from '../../editor-store';
import { useGameStore } from '../../../store';
import { VoxelWorld } from '@/shared/game/voxel/VoxelWorldDoc';
import { VoxelTransactionBuilder } from '@/shared/game/voxel/VoxelTransaction';

export class ExtrudeToolHandler implements IToolHandler {
  public readonly id = 'extrude' as const;
  
  private anchorVoxel: { x: number, y: number, z: number } | null = null;
  private extrudeNormal: { x: number, y: number, z: number } | null = null;
  private sourceWord: number = 0;
  private isDragging = false;
  private startPoint: { x: number, y: number, z: number } | null = null;

  public onPointerDown(event: ToolPointerEvent, context: ToolExecutionContext): boolean {
    if (event.button !== 0 && event.rawEvent.buttons !== 1) return false;
    
    if (event.voxelTarget && event.voxelTarget.hit) {
      const voxelWorld: VoxelWorld = (context.engine as any).voxelWorld;
      if (!voxelWorld) return false;

      const vT = event.voxelTarget;
      this.anchorVoxel = { 
        x: vT.voxelCoord.wx, 
        y: vT.voxelCoord.wy, 
        z: vT.voxelCoord.wz 
      };

      const word = voxelWorld.getVoxel(this.anchorVoxel.x, this.anchorVoxel.y, this.anchorVoxel.z);
      if (!word) return false; // Can't extrude air
      this.sourceWord = word;

      this.extrudeNormal = {
        x: Math.round(vT.hitNormal.x),
        y: Math.round(vT.hitNormal.y),
        z: Math.round(vT.hitNormal.z),
      };

      this.startPoint = { x: event.worldPos.x, y: event.worldPos.y, z: event.worldPos.z };
      this.isDragging = true;
      
      this.updatePreview(0, context);
      return true;
    }
    return false;
  }

  public onPointerMove(event: ToolPointerEvent, context: ToolExecutionContext): boolean {
    if (!this.isDragging || !this.anchorVoxel || !this.extrudeNormal || !this.startPoint) return false;
    
    // We project the drag delta onto the normal axis
    const dx = event.worldPos.x - this.startPoint.x;
    const dy = event.worldPos.y - this.startPoint.y; // note: event.worldPos.y might be 0 for 2D, we might need actual 3D ray hit
    // Wait, event.worldPos comes from the ground plane. For vertical extrusion, we should use pointer delta or raw Y.
    // If the hit normal is Y, dragging mouse Y (in 2D space) usually maps to Z.
    // We can just use the difference in voxelCoord for simplicity.

    const vT = event.voxelTarget;
    if (vT) {
      let delta = 0;
      if (this.extrudeNormal.x !== 0) delta = (vT.voxelCoord.wx - this.anchorVoxel.x) * this.extrudeNormal.x;
      if (this.extrudeNormal.y !== 0) delta = (vT.voxelCoord.wy - this.anchorVoxel.y) * this.extrudeNormal.y;
      if (this.extrudeNormal.z !== 0) delta = (vT.voxelCoord.wz - this.anchorVoxel.z) * this.extrudeNormal.z;
      
      // We only allow positive extrusion (pulling out) for now, or push in? 
      // Push could erase. Pull could draw. Let's do both.
      this.updatePreview(delta, context);
    }
    return true;
  }

  private updatePreview(delta: number, context: ToolExecutionContext) {
    if (!this.anchorVoxel || !this.extrudeNormal) return;
    if (context.engine.set3DBoxSelectionPreview) {
      // Extrude starts from anchor + normal (so we don't overwrite the anchor itself when pushing)
      // Actually, if delta > 0, we fill from anchor+normal to anchor+(normal*delta).
      // If delta < 0, we erase from anchor to anchor+(normal*delta).
      
      let minX = this.anchorVoxel.x;
      let maxX = this.anchorVoxel.x + this.extrudeNormal.x * delta;
      let minY = this.anchorVoxel.y;
      let maxY = this.anchorVoxel.y + this.extrudeNormal.y * delta;
      let minZ = this.anchorVoxel.z;
      let maxZ = this.anchorVoxel.z + this.extrudeNormal.z * delta;

      // If pulling out, we don't highlight the anchor itself.
      if (delta > 0) {
        minX += this.extrudeNormal.x;
        maxX = Math.max(minX, maxX);
        minY += this.extrudeNormal.y;
        maxY = Math.max(minY, maxY);
        minZ += this.extrudeNormal.z;
        maxZ = Math.max(minZ, maxZ);
      }

      context.engine.set3DBoxSelectionPreview(minX, minY, minZ, maxX, maxY, maxZ);
    }
  }

  public onPointerUp(event: ToolPointerEvent, context: ToolExecutionContext): boolean {
    if (!this.isDragging || !this.anchorVoxel || !this.extrudeNormal) {
      this.isDragging = false;
      this.anchorVoxel = null;
      return false;
    }
    
    const vT = event.voxelTarget;
    if (vT) {
      let delta = 0;
      if (this.extrudeNormal.x !== 0) delta = (vT.voxelCoord.wx - this.anchorVoxel.x) * this.extrudeNormal.x;
      if (this.extrudeNormal.y !== 0) delta = (vT.voxelCoord.wy - this.anchorVoxel.y) * this.extrudeNormal.y;
      if (this.extrudeNormal.z !== 0) delta = (vT.voxelCoord.wz - this.anchorVoxel.z) * this.extrudeNormal.z;
      
      this.executeExtrusion(delta, context);
    }

    if (context.engine.clear3DBoxSelectionPreview) {
      context.engine.clear3DBoxSelectionPreview();
    }

    this.isDragging = false;
    this.anchorVoxel = null;
    return true;
  }

  private executeExtrusion(delta: number, context: ToolExecutionContext) {
    if (delta === 0 || !this.anchorVoxel || !this.extrudeNormal) return;

    const store = useEditorStore.getState();
    const gameStore = useGameStore.getState();
    const liveMap = gameStore.activeMapData;
    if (!liveMap) return;

    const voxelWorld: VoxelWorld = (context.engine as any).voxelWorld;
    if (!voxelWorld) return;

    const txBuilder = new VoxelTransactionBuilder('Face Extrusion', liveMap.id || '');

    const isPull = delta > 0; // True = Create, False = Erase
    const absDelta = Math.abs(delta);
    
    // For pull, start 1 unit away from anchor. For push, start at anchor and go backward.
    const startOffset = isPull ? 1 : 0; 

    for (let i = startOffset; i <= absDelta; i++) {
      // If push, we move in the opposite direction of the normal
      const sign = isPull ? 1 : -1;
      const x = this.anchorVoxel.x + this.extrudeNormal.x * i * sign;
      const y = this.anchorVoxel.y + this.extrudeNormal.y * i * sign;
      const z = this.anchorVoxel.z + this.extrudeNormal.z * i * sign;

      const currentWord = voxelWorld.getVoxel(x, y, z) || 0;
      const finalWord = isPull ? this.sourceWord : 0;

      if (currentWord !== finalWord) {
        txBuilder.record(voxelWorld, x, y, z, finalWord);
        voxelWorld.setVoxel(x, y, z, finalWord);
      }
    }

    const tx = txBuilder.build();
    if (tx && tx.mutations.length > 0) {
      const changedVoxels = tx.mutations.map(mut => ({
        wx: mut.worldX,
        wy: mut.worldY,
        wz: mut.worldZ,
        before: mut.previousVoxel,
        after: mut.newVoxel,
      }));
      store.pushVoxelOp(changedVoxels);
      store.markMapDirty();
    }
  }
}
