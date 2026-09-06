import type { IToolHandler, ToolExecutionContext } from './IToolHandler';
import type { ToolPointerEvent } from '../types';
import { useEditorStore } from '../../editor-store';
import { useGameStore } from '../../../store';
import { VoxelWorld } from '@/shared/game/voxel/VoxelWorldDoc';
import { VoxelTransactionBuilder } from '@/shared/game/voxel/VoxelTransaction';
import { VOXEL_MAT_GRASS, packVoxel, VoxelShape, VoxelOrientation, VoxelPhysics, VoxelLogic } from '@/shared/game/voxel/VoxelWord';

export class SmoothToolHandler implements IToolHandler {
  public readonly id = 'smooth' as const;
  
  private isDragging = false;
  private lastProcTime = 0;

  public onPointerDown(event: ToolPointerEvent, context: ToolExecutionContext): boolean {
    if (event.button !== 0 && event.rawEvent.buttons !== 1) return false;
    this.isDragging = true;
    this.applySmoothing(event, context);
    return true;
  }

  public onPointerMove(event: ToolPointerEvent, context: ToolExecutionContext): boolean {
    if (!this.isDragging) return false;
    
    const now = Date.now();
    // Throttle smoothing to prevent lag during dragging
    if (now - this.lastProcTime > 100) {
      this.applySmoothing(event, context);
      this.lastProcTime = now;
    }
    return true;
  }

  public onPointerUp(event: ToolPointerEvent, context: ToolExecutionContext): boolean {
    this.isDragging = false;
    return true;
  }

  private applySmoothing(event: ToolPointerEvent, context: ToolExecutionContext) {
    if (!event.voxelTarget) return;

    const voxelWorld: VoxelWorld = (context.engine as any).voxelWorld;
    if (!voxelWorld) return;

    const store = useEditorStore.getState();
    const liveMap = useGameStore.getState().activeMapData;
    if (!liveMap) return;

    const radius = store.brushRadius || 2;
    const center = event.voxelTarget.voxelCoord;
    const txBuilder = new VoxelTransactionBuilder('Melt Brush', liveMap.id || '');

    // 3x3x3 or radius-based Cellular Automata smoothing
    const toRemove: {x:number, y:number, z:number, old:number}[] = [];
    const toAdd: {x:number, y:number, z:number}[] = [];

    const matId = store.activeVoxelMaterialId || VOXEL_MAT_GRASS;

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dz = -radius; dz <= radius; dz++) {
          const wx = center.wx + dx;
          const wy = center.wy + dy;
          const wz = center.wz + dz;
          
          if (wx < 0 || wx >= voxelWorld.totalWidthBlocks || wz < 0 || wz >= voxelWorld.totalDepthBlocks || wy < 0 || wy >= voxelWorld.totalHeightBlocks) continue;

          let neighbors = 0;
          for (let nx = -1; nx <= 1; nx++) {
            for (let ny = -1; ny <= 1; ny++) {
              for (let nz = -1; nz <= 1; nz++) {
                if (nx === 0 && ny === 0 && nz === 0) continue;
                if (voxelWorld.getVoxel(wx + nx, wy + ny, wz + nz)) neighbors++;
              }
            }
          }

          const currentWord = voxelWorld.getVoxel(wx, wy, wz);
          if (currentWord !== 0) {
            // Melt isolated blocks or sharp protrusions
            if (neighbors <= 10) {
              toRemove.push({x: wx, y: wy, z: wz, old: currentWord});
            }
          } else {
            // Fill in deep holes
            if (neighbors >= 14) {
              toAdd.push({x: wx, y: wy, z: wz});
            }
          }
        }
      }
    }

    // Apply the melt/fill
    for (const r of toRemove) {
      txBuilder.record(voxelWorld, r.x, r.y, r.z, 0);
      voxelWorld.setVoxel(r.x, r.y, r.z, 0);
    }
    for (const a of toAdd) {
      // Create a default full cube
      const packed = packVoxel(
        matId,
        VoxelShape.FULL_CUBE,
        VoxelOrientation.NORTH,
        0,
        VoxelPhysics.SOLID_OBSTACLE,
        VoxelLogic.NONE
      );
      txBuilder.record(voxelWorld, a.x, a.y, a.z, packed);
      voxelWorld.setVoxel(a.x, a.y, a.z, packed);
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
