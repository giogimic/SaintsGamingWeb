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
  private sourceWord: { low: number; high: number; } = { low: 0, high: 0 };
  private isDragging = false;
  private startPoint: { x: number, y: number, z: number } | null = null;
  private surfaceVoxels: { x: number, y: number, z: number }[] = [];

  public onPointerDown(event: ToolPointerEvent, context: ToolExecutionContext): boolean {
    if (event.button !== 0 && event.rawEvent.buttons !== 1) return false;
    
    if (event.voxelTarget && event.voxelTarget.kind === 'voxel-hit') {
      const voxelWorld: VoxelWorld = (context.engine as any).voxel.voxelWorld;
      if (!voxelWorld) return false;

      const vT = event.voxelTarget;
      this.anchorVoxel = { 
        x: vT.voxelCoord.wx, 
        y: vT.voxelCoord.wy, 
        z: vT.voxelCoord.wz 
      };

      const word = voxelWorld.getVoxel(this.anchorVoxel.x, this.anchorVoxel.y, this.anchorVoxel.z);
      if (word.low === undefined || (word.low === 0 && word.high === 0)) return false;
      this.sourceWord = { low: word.low, high: word.high };

      this.extrudeNormal = {
        x: Math.round(vT.hitNormal.x),
        y: Math.round(vT.hitNormal.y),
        z: Math.round(vT.hitNormal.z),
      };

      this.startPoint = { x: event.worldPos.x, y: event.worldPos.y, z: event.worldPos.z };
      this.isDragging = true;
      
      // Perform flood fill to find contiguous coplanar faces
      this.surfaceVoxels = this.floodFillSurface(voxelWorld, this.anchorVoxel, this.extrudeNormal, this.sourceWord);

      this.updatePreview(0, context);
      return true;
    }
    return false;
  }

  private floodFillSurface(
    world: VoxelWorld,
    start: { x: number, y: number, z: number },
    normal: { x: number, y: number, z: number },
    matchWord: { low: number, high: number }
  ): { x: number, y: number, z: number }[] {
    const surface: { x: number, y: number, z: number }[] = [];
    const visited = new Set<string>();
    const queue = [start];
    
    // Orthogonal directions to search (perpendicular to normal)
    const dirs: {dx: number, dy: number, dz: number}[] = [];
    if (normal.x !== 0) dirs.push({dx:0, dy:1, dz:0}, {dx:0, dy:-1, dz:0}, {dx:0, dy:0, dz:1}, {dx:0, dy:0, dz:-1});
    if (normal.y !== 0) dirs.push({dx:1, dy:0, dz:0}, {dx:-1, dy:0, dz:0}, {dx:0, dy:0, dz:1}, {dx:0, dy:0, dz:-1});
    if (normal.z !== 0) dirs.push({dx:1, dy:0, dz:0}, {dx:-1, dy:0, dz:0}, {dx:0, dy:1, dz:0}, {dx:0, dy:-1, dz:0});

    while (queue.length > 0) {
      const cur = queue.shift()!;
      const key = `${cur.x},${cur.y},${cur.z}`;
      if (visited.has(key)) continue;
      visited.add(key);

      surface.push(cur);

      for (const dir of dirs) {
        const nx = cur.x + dir.dx;
        const ny = cur.y + dir.dy;
        const nz = cur.z + dir.dz;
        
        if (nx < 0 || nx >= world.totalWidthBlocks || nz < 0 || nz >= world.totalDepthBlocks || ny < 0 || ny >= world.totalHeightBlocks) continue;
        
        const nKey = `${nx},${ny},${nz}`;
        if (visited.has(nKey)) continue;

        const w = world.getVoxel(nx, ny, nz);
        if (w.low === matchWord.low && w.high === matchWord.high) {
          // Check if it's exposed on the normal side
          const frontW = world.getVoxel(nx + normal.x, ny + normal.y, nz + normal.z);
          if (frontW.low === undefined || (frontW.low === 0 && frontW.high === 0)) {
            queue.push({x: nx, y: ny, z: nz});
          }
        }
      }
    }
    return surface;
  }

  public onPointerMove(event: ToolPointerEvent, context: ToolExecutionContext): boolean {
    if (!this.isDragging || !this.anchorVoxel || !this.extrudeNormal || !this.startPoint) return false;
    
    const vT = event.voxelTarget;
    if (vT && vT.kind !== 'none') {
      let delta = 0;
      const targetCoord = vT.voxelCoord;
      if (this.extrudeNormal.x !== 0) delta = (targetCoord.wx - this.anchorVoxel.x) * this.extrudeNormal.x;
      if (this.extrudeNormal.y !== 0) delta = (targetCoord.wy - this.anchorVoxel.y) * this.extrudeNormal.y;
      if (this.extrudeNormal.z !== 0) delta = (targetCoord.wz - this.anchorVoxel.z) * this.extrudeNormal.z;
      
      this.updatePreview(delta, context);
    }
    return true;
  }

  private updatePreview(delta: number, context: ToolExecutionContext) {
    if (this.surfaceVoxels.length === 0 || !this.extrudeNormal) return;
    if (context.engine.set3DBoxSelectionPreview) {
      // Find bounds of surface
      let minX = this.surfaceVoxels[0].x;
      let maxX = this.surfaceVoxels[0].x;
      let minY = this.surfaceVoxels[0].y;
      let maxY = this.surfaceVoxels[0].y;
      let minZ = this.surfaceVoxels[0].z;
      let maxZ = this.surfaceVoxels[0].z;

      for (const v of this.surfaceVoxels) {
        if (v.x < minX) minX = v.x;
        if (v.x > maxX) maxX = v.x;
        if (v.y < minY) minY = v.y;
        if (v.y > maxY) maxY = v.y;
        if (v.z < minZ) minZ = v.z;
        if (v.z > maxZ) maxZ = v.z;
      }

      if (delta > 0) {
        if (this.extrudeNormal.x > 0) { minX += 1; maxX += delta; }
        else if (this.extrudeNormal.x < 0) { maxX -= 1; minX -= delta; }
        
        if (this.extrudeNormal.y > 0) { minY += 1; maxY += delta; }
        else if (this.extrudeNormal.y < 0) { maxY -= 1; minY -= delta; }

        if (this.extrudeNormal.z > 0) { minZ += 1; maxZ += delta; }
        else if (this.extrudeNormal.z < 0) { maxZ -= 1; minZ -= delta; }
      } else if (delta < 0) {
        if (this.extrudeNormal.x > 0) { minX += delta + 1; }
        else if (this.extrudeNormal.x < 0) { maxX -= delta + 1; }
        
        if (this.extrudeNormal.y > 0) { minY += delta + 1; }
        else if (this.extrudeNormal.y < 0) { maxY -= delta + 1; }

        if (this.extrudeNormal.z > 0) { minZ += delta + 1; }
        else if (this.extrudeNormal.z < 0) { maxZ -= delta + 1; }
      }

      context.engine.set3DBoxSelectionPreview(minX, minY, minZ, maxX, maxY, maxZ);
    }
  }

  public onPointerUp(event: ToolPointerEvent, context: ToolExecutionContext): boolean {
    if (!this.isDragging || !this.anchorVoxel || !this.extrudeNormal) {
      this.isDragging = false;
      this.anchorVoxel = null;
      this.surfaceVoxels = [];
      return false;
    }
    
    const vT = event.voxelTarget;
    if (vT && vT.kind !== 'none') {
      let delta = 0;
      const targetCoord = vT.voxelCoord;
      if (this.extrudeNormal.x !== 0) delta = (targetCoord.wx - this.anchorVoxel.x) * this.extrudeNormal.x;
      if (this.extrudeNormal.y !== 0) delta = (targetCoord.wy - this.anchorVoxel.y) * this.extrudeNormal.y;
      if (this.extrudeNormal.z !== 0) delta = (targetCoord.wz - this.anchorVoxel.z) * this.extrudeNormal.z;
      
      this.executeExtrusion(delta, context);
    }

    if (context.engine.clear3DBoxSelectionPreview) {
      context.engine.clear3DBoxSelectionPreview();
    }

    this.isDragging = false;
    this.anchorVoxel = null;
    this.surfaceVoxels = [];
    return true;
  }

  private executeExtrusion(delta: number, context: ToolExecutionContext) {
    if (delta === 0 || this.surfaceVoxels.length === 0 || !this.extrudeNormal) return;

    const store = useEditorStore.getState();
    const gameStore = useGameStore.getState();
    const liveMap = gameStore.activeMapData;
    if (!liveMap) return;

    const voxelWorld: VoxelWorld = (context.engine as any).voxel.voxelWorld;
    if (!voxelWorld) return;

    const txBuilder = new VoxelTransactionBuilder('Face Extrusion', liveMap.id || '');

    const isPull = delta > 0; // True = Create, False = Erase
    const absDelta = Math.abs(delta);
    
    const startOffset = isPull ? 1 : 0; 

    for (let i = startOffset; i <= absDelta; i++) {
      const sign = isPull ? 1 : -1;

      for (const v of this.surfaceVoxels) {
        const x = v.x + this.extrudeNormal.x * i * sign;
        const y = v.y + this.extrudeNormal.y * i * sign;
        const z = v.z + this.extrudeNormal.z * i * sign;

        const currentWord = voxelWorld.getVoxel(x, y, z);
        const finalWord = isPull ? this.sourceWord : { low: 0, high: 0 };

        if (currentWord.low !== finalWord.low || currentWord.high !== finalWord.high) {
          txBuilder.record(voxelWorld, x, y, z, finalWord as any);
          voxelWorld.setVoxel(x, y, z, finalWord.low, finalWord.high);
          const socket = gameStore.socket;
          if (socket) {
            socket.emit('voxel_edit', {
              mapId: liveMap.id,
              x,
              y,
              z,
              wordLow: finalWord.low,
              wordHigh: finalWord.high,
            });
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
        before: mut.previousVoxel as any,
        after: mut.newVoxel as any,
      }));
      store.pushVoxelOp(changedVoxels);
      store.markMapDirty();
    }
  }
}

