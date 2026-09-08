import { VoxelWorld } from './VoxelWorldDoc';
import { VoxelChunk } from './VoxelChunk';

export interface VoxelMutation {
  worldX: number;
  worldY: number;
  worldZ: number;
  previousVoxel: { low: number; high: number; };
  newVoxel: { low: number; high: number; };
}

export interface VoxelTransaction {
  id: string;
  name: string;
  mapId: string;
  mutations: VoxelMutation[];
  affectedChunkKeys: string[];
  timestamp: number;
}

export class VoxelTransactionBuilder {
  private mutations = new Map<string, VoxelMutation>();
  private name: string;
  private mapId: string;

  constructor(name: string = 'Voxel Edit', mapId: string = '') {
    this.name = name;
    this.mapId = mapId;
  }

  public record(world: VoxelWorld, wx: number, wy: number, wz: number, newVoxel: { low: number; high: number; }): void {
    const key = `${wx}_${wy}_${wz}`;
    const previous = world.getVoxel(wx, wy, wz);
    if (previous.low === newVoxel.low && previous.high === newVoxel.high) return;

    const existing = this.mutations.get(key);
    if (existing) {
      existing.newVoxel = newVoxel;
    } else {
      this.mutations.set(key, {
        worldX: wx,
        worldY: wy,
        worldZ: wz,
        previousVoxel: previous ? { low: previous.low, high: previous.high } : { low: 0, high: 0 },
        newVoxel: { low: newVoxel.low, high: newVoxel.high },
      });
    }
  }

  public build(): VoxelTransaction | null {
    if (this.mutations.size === 0) return null;

    const affectedKeys = new Set<string>();
    const mutationList: VoxelMutation[] = [];

    for (const mut of this.mutations.values()) {
      mutationList.push(mut);
      const { cx, cz, cy } = VoxelWorld.worldToChunkCoords(mut.worldX, mut.worldY, mut.worldZ);
      affectedKeys.add(VoxelChunk.getChunkKey(cx, cz, cy));

      // Also mark 1-block neighbors if boundary block edited (for 1-block halo remeshing)
      const lx = ((mut.worldX % 16) + 16) % 16;
      const lz = ((mut.worldZ % 16) + 16) % 16;
      if (lx === 0) affectedKeys.add(VoxelChunk.getChunkKey(cx - 1, cz, cy));
      if (lx === 15) affectedKeys.add(VoxelChunk.getChunkKey(cx + 1, cz, cy));
      if (lz === 0) affectedKeys.add(VoxelChunk.getChunkKey(cx, cz - 1, cy));
      if (lz === 15) affectedKeys.add(VoxelChunk.getChunkKey(cx, cz + 1, cy));
    }

    return {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: this.name,
      mapId: this.mapId,
      mutations: mutationList,
      affectedChunkKeys: Array.from(affectedKeys),
      timestamp: Date.now(),
    };
  }
}

export class VoxelHistoryStack {
  private undoStack: VoxelTransaction[] = [];
  private redoStack: VoxelTransaction[] = [];
  private maxDepth: number;

  constructor(maxDepth = 50) {
    this.maxDepth = maxDepth;
  }

  public push(tx: VoxelTransaction): void {
    this.undoStack.push(tx);
    if (this.undoStack.length > this.maxDepth) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public undo(world: VoxelWorld): VoxelTransaction | null {
    const tx = this.undoStack.pop();
    if (!tx) return null;

    // Apply previous voxel state in reverse order
    for (let i = tx.mutations.length - 1; i >= 0; i--) {
      const mut = tx.mutations[i];
      world.setVoxel(mut.worldX, mut.worldY, mut.worldZ, mut.previousVoxel.low, mut.previousVoxel.high);
    }

    for (const key of tx.affectedChunkKeys) {
      const { cx, cz, cy } = VoxelChunk.parseChunkKey(key);
      const chunk = world.getChunk(cx, cz, cy, false);
      if (chunk) chunk.isDirty = true;
    }

    this.redoStack.push(tx);
    return tx;
  }

  public redo(world: VoxelWorld): VoxelTransaction | null {
    const tx = this.redoStack.pop();
    if (!tx) return null;

    // Apply new voxel state
    for (const mut of tx.mutations) {
      world.setVoxel(mut.worldX, mut.worldY, mut.worldZ, mut.newVoxel.low, mut.newVoxel.high);
    }

    for (const key of tx.affectedChunkKeys) {
      const { cx, cz, cy } = VoxelChunk.parseChunkKey(key);
      const chunk = world.getChunk(cx, cz, cy, false);
      if (chunk) chunk.isDirty = true;
    }

    this.undoStack.push(tx);
    return tx;
  }

  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
