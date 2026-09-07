import type { IToolHandler, ToolExecutionContext } from './IToolHandler';
import type { ToolPointerEvent } from '../types';
import { useEditorStore } from '../../editor-store';
import { useGameStore } from '../../../store';
import {
  packVoxel,
  VoxelShape,
  VoxelOrientation,
  VoxelPhysics,
  VoxelLogic,
  type VoxelLogicType,
  VOXEL_MAT_GRASS,
} from '@/shared/game/voxel/VoxelWord';
import { VOXEL_MATERIAL_CATALOG } from '@/shared/game/voxel/VoxelMaterialDefinition';
import { VoxelWorld } from '@/shared/game/voxel/VoxelWorldDoc';
import { VoxelTransactionBuilder } from '@/shared/game/voxel/VoxelTransaction';

export class ShapeToolHandler implements IToolHandler {
  public readonly id = 'shape' as const;
  
  private anchorVoxel: { x: number, y: number, z: number } | null = null;
  private isDragging = false;

  public onPointerDown(event: ToolPointerEvent, context: ToolExecutionContext): boolean {
    if (event.button !== 0 && event.rawEvent.buttons !== 1) return false;
    
    if (event.voxelTarget) {
      this.isDragging = true;
      const vT = event.voxelTarget;
      this.anchorVoxel = { 
        x: vT.voxelCoord.wx, 
        y: vT.voxelCoord.wy, 
        z: vT.voxelCoord.wz 
      };
      
      if (context.engine.set3DBoxSelectionPreview) {
        context.engine.set3DBoxSelectionPreview(
          this.anchorVoxel.x, this.anchorVoxel.y, this.anchorVoxel.z, 
          this.anchorVoxel.x, this.anchorVoxel.y, this.anchorVoxel.z
        );
      }
      return true;
    }
    return false;
  }

  public onPointerMove(event: ToolPointerEvent, context: ToolExecutionContext): boolean {
    if (!this.isDragging || !this.anchorVoxel) return false;
    
    const vT = event.voxelTarget;
    const wx = vT ? vT.voxelCoord.wx : Math.floor(event.worldPos.x);
    const wy = vT ? vT.voxelCoord.wy : 16;
    const wz = vT ? vT.voxelCoord.wz : Math.floor(event.worldPos.z);
    
    if (context.engine.set3DBoxSelectionPreview) {
      context.engine.set3DBoxSelectionPreview(
        this.anchorVoxel.x, this.anchorVoxel.y, this.anchorVoxel.z, 
        wx, wy, wz
      );
    }
    return true;
  }

  public onPointerUp(event: ToolPointerEvent, context: ToolExecutionContext): boolean {
    if (!this.isDragging || !this.anchorVoxel) {
      this.isDragging = false;
      this.anchorVoxel = null;
      return false;
    }
    this.isDragging = false;
    
    const store = useEditorStore.getState();
    const gameStore = useGameStore.getState();
    const liveMap = gameStore.activeMapData;
    if (!liveMap) return false;

    const vT = event.voxelTarget;
    const wx = vT ? vT.voxelCoord.wx : Math.floor(event.worldPos.x);
    const wy = vT ? vT.voxelCoord.wy : 16;
    const wz = vT ? vT.voxelCoord.wz : Math.floor(event.worldPos.z);
    
    // Build the shape!
    this.executeShapeGeneration(this.anchorVoxel, { x: wx, y: wy, z: wz }, context, liveMap);
    
    if (context.engine.clear3DBoxSelectionPreview) {
      context.engine.clear3DBoxSelectionPreview();
    }
    this.anchorVoxel = null;
    return true;
  }

  private executeShapeGeneration(start: {x:number,y:number,z:number}, end: {x:number,y:number,z:number}, context: ToolExecutionContext, liveMap: any) {
    const store = useEditorStore.getState();
    const voxelWorld: VoxelWorld = (context.engine as any).voxelWorld;
    if (!voxelWorld) return;

    const shapeType = store.brushShape || 'square'; // We use brushShape for 'box', 'sphere', 'cylinder'
    
    const shapeId = (store.activeVoxelShape ?? VoxelShape.FULL_CUBE) as any;
    const orient = (store.activeVoxelOrientation ?? VoxelOrientation.NORTH) as any;
    const matId = store.activeVoxelMaterialId || VOXEL_MAT_GRASS;
    const basePhysics = VOXEL_MATERIAL_CATALOG[matId]?.physics ?? VoxelPhysics.SOLID_OBSTACLE;
    const physics = shapeId === VoxelShape.SLOPE_45 && basePhysics !== VoxelPhysics.SWIMMABLE_FLUID 
      ? VoxelPhysics.WALKABLE_SLOPE 
      : basePhysics;
    const logicId = (store.activeVoxelLogicId || VoxelLogic.NONE) as VoxelLogicType;

    const finalWord = packVoxel(
      matId,
      shapeId,
      orient,
      0,
      physics,
      logicId
    );

    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);
    const minZ = Math.min(start.z, end.z);
    const maxZ = Math.max(start.z, end.z);

    const txBuilder = new VoxelTransactionBuilder('Primitive Generator', liveMap.id || '');
    
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const cz = (minZ + maxZ) / 2;
    const radX = (maxX - minX) / 2;
    const radY = (maxY - minY) / 2;
    const radZ = (maxZ - minZ) / 2;

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          let shouldPlace = false;
          
          if (shapeType === 'square') { // Box
            shouldPlace = true;
          } else if (shapeType === 'circle') { // Sphere / Ellipsoid
            const dx = radX === 0 ? 0 : (x - cx) / radX;
            const dy = radY === 0 ? 0 : (y - cy) / radY;
            const dz = radZ === 0 ? 0 : (z - cz) / radZ;
            if (dx*dx + dy*dy + dz*dz <= 1.0) {
              shouldPlace = true;
            }
          } else if ((shapeType as string) === 'cylinder') { // Cylinder (Y-up)
            const dx = radX === 0 ? 0 : (x - cx) / radX;
            const dz = radZ === 0 ? 0 : (z - cz) / radZ;
            if (dx*dx + dz*dz <= 1.0) {
              shouldPlace = true;
            }
          }

          if (shouldPlace) {
            const currentWord = voxelWorld.getVoxel(x, y, z) || 0;
            if (currentWord !== finalWord) {
              txBuilder.record(voxelWorld, x, y, z, finalWord);
              voxelWorld.setVoxel(x, y, z, finalWord);
            }
          }
        }
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
