import type { IToolHandler, ToolExecutionContext } from './IToolHandler';
import type { ToolPointerEvent } from '../types';
import { useEditorStore } from '../../editor-store';
import { useGameStore } from '../../../store';
import { VoxelWorld } from '@/shared/game/voxel/VoxelWorldDoc';
import { VoxelTransactionBuilder } from '@/shared/game/voxel/VoxelTransaction';
import { VOXEL_MAT_GRASS, packVoxel, VoxelShape, VoxelOrientation, VoxelPhysics, VoxelLogic } from '@/shared/game/voxel/VoxelWord';
import type { VoxelShapeType, VoxelOrientationType } from '@/shared/game/voxel/VoxelWord';

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
    if (!event.voxelTarget || event.voxelTarget.kind === 'none') return;

    const voxelWorld: VoxelWorld = (context.engine as any).voxel.voxelWorld;
    if (!voxelWorld) return;

    const store = useEditorStore.getState();
    const liveMap = useGameStore.getState().activeMapData;
    if (!liveMap) return;

    const radius = store.brushRadius || 2;
    const center = event.voxelTarget.voxelCoord;
    const txBuilder = new VoxelTransactionBuilder('Melt Brush', liveMap.id || '');

    const mutationsToApply: {x:number, y:number, z:number, packed: {low:number, high:number}, current: {low:number, high:number}}[] = [];

    const matId = store.activeVoxelMaterialId || VOXEL_MAT_GRASS;

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dz = -radius; dz <= radius; dz++) {
          const wx = center.wx + dx;
          const wy = center.wy + dy;
          const wz = center.wz + dz;
          
          if (wx < 0 || wx >= voxelWorld.totalWidthBlocks || wz < 0 || wz >= voxelWorld.totalDepthBlocks || wy < 0 || wy >= voxelWorld.totalHeightBlocks) continue;

          // Deterministic sphere check
          if (dx*dx + dy*dy + dz*dz > radius*radius) continue;

          const currentWord = voxelWorld.getVoxel(wx, wy, wz);
          if (currentWord.low === undefined || (currentWord.low === 0 && currentWord.high === 0)) continue;

          const shapeId = (currentWord.low >>> 24) & 0xff;
          if (shapeId !== VoxelShape.FULL_CUBE) continue; // Only smooth full cubes for now

          // Check the 6 adjacent neighbors (N, S, E, W, Up, Down)
          const nN = voxelWorld.getVoxel(wx, wy, wz + 1);
          const nS = voxelWorld.getVoxel(wx, wy, wz - 1);
          const nE = voxelWorld.getVoxel(wx + 1, wy, wz);
          const nW = voxelWorld.getVoxel(wx - 1, wy, wz);
          const nU = voxelWorld.getVoxel(wx, wy + 1, wz);
          const nD = voxelWorld.getVoxel(wx, wy - 1, wz);

          const hasN = nN.low !== undefined && (nN.low !== 0 || nN.high !== 0);
          const hasS = nS.low !== undefined && (nS.low !== 0 || nS.high !== 0);
          const hasE = nE.low !== undefined && (nE.low !== 0 || nE.high !== 0);
          const hasW = nW.low !== undefined && (nW.low !== 0 || nW.high !== 0);
          const hasU = nU.low !== undefined && (nU.low !== 0 || nU.high !== 0);
          const hasD = nD.low !== undefined && (nD.low !== 0 || nD.high !== 0);

          // We only smooth if the block is exposed on top
          if (hasU) continue;

          let newShape: VoxelShapeType = VoxelShape.FULL_CUBE;
          let newOrient: VoxelOrientationType = VoxelOrientation.NORTH;

          // Simple slope conversion logic
          if (hasS && hasE && hasW && !hasN) {
            newShape = VoxelShape.SLOPE_45;
            newOrient = VoxelOrientation.NORTH;
          } else if (hasN && hasE && hasW && !hasS) {
            newShape = VoxelShape.SLOPE_45;
            newOrient = VoxelOrientation.SOUTH;
          } else if (hasN && hasS && hasW && !hasE) {
            newShape = VoxelShape.SLOPE_45;
            newOrient = VoxelOrientation.EAST;
          } else if (hasN && hasS && hasE && !hasW) {
            newShape = VoxelShape.SLOPE_45;
            newOrient = VoxelOrientation.WEST;
          }

          if (newShape !== VoxelShape.FULL_CUBE) {
            const packed = packVoxel(
              currentWord.low & 0xffffff, // keep original material
              newShape,
              newOrient,
              (currentWord.high >>> 4) & 0x0f,
              VoxelPhysics.WALKABLE_SLOPE,
              (currentWord.high >>> 12) & 0x0f
            );
            mutationsToApply.push({
              x: wx, y: wy, z: wz,
              packed,
              current: { low: currentWord.low, high: currentWord.high }
            });
          }
        }
      }
    }

    const socket = useGameStore.getState().socket;
    // Apply the mutations
    for (const mut of mutationsToApply) {
      txBuilder.record(voxelWorld, mut.x, mut.y, mut.z, mut.packed as any);
      voxelWorld.setVoxel(mut.x, mut.y, mut.z, mut.packed.low, mut.packed.high);
      if (socket) {
        socket.emit('voxel_edit', {
          mapId: liveMap.id,
          x: mut.x,
          y: mut.y,
          z: mut.z,
          wordLow: mut.packed.low,
          wordHigh: mut.packed.high,
        });
      }
    }

    const tx = txBuilder.build();
    if (tx && tx.mutations.length > 0) {
      const changedVoxels = tx.mutations.map(mut => ({
        wx: mut.worldX,
        wy: mut.worldY,
        wz: mut.worldZ,
        before: mut.previousVoxel as any,
        after: mut.newVoxel as any,
      }));
      store.pushVoxelOp(changedVoxels);
      store.markMapDirty();
    }
  }
}

