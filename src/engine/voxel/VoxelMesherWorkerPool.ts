/**
 * Saints Gaming — Voxel Mesher Worker Pool
 *
 * Coordinates a pool of dedicated Web Workers for off-thread greedy meshing,
 * falling back seamlessly to synchronous execution when workers are unavailable.
 */

import {
  meshChunkWithHalo34,
  HaloMeshInput,
  TransferableVoxelMeshResult,
} from './VoxelMesherCore';

interface QueuedTask {
  input: HaloMeshInput;
  resolve: (result: TransferableVoxelMeshResult) => void;
  reject: (err: any) => void;
}

export class VoxelMesherWorkerPool {
  private workers: Worker[] = [];
  private idleWorkerIds: number[] = [];
  private taskQueue: QueuedTask[] = [];
  private workerCount: number;
  private isAvailable = false;

  constructor(poolSize?: number) {
    if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
      const concurrency = typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 4) : 4;
      this.workerCount = poolSize ?? Math.max(2, Math.min(4, concurrency - 1));
      this.initWorkers();
    } else {
      this.workerCount = 0;
      this.isAvailable = false;
    }
  }

  private initWorkers(): void {
    try {
      for (let i = 0; i < this.workerCount; i++) {
        const worker = new Worker(new URL('./voxelMesher.worker.ts', import.meta.url), {
          type: 'module',
        });
        const workerId = i;

        worker.onmessage = (e: MessageEvent) => {
          this.idleWorkerIds.push(workerId);
          this.pumpQueue();
        };

        worker.onerror = (err) => {
          console.warn(`[VoxelMesherWorkerPool] Worker ${workerId} error:`, err);
          this.idleWorkerIds.push(workerId);
          this.pumpQueue();
        };

        this.workers.push(worker);
        this.idleWorkerIds.push(workerId);
      }
      this.isAvailable = true;
    } catch (e) {
      console.warn('[VoxelMesherWorkerPool] Failed to spawn Web Workers, falling back to sync meshing:', e);
      this.isAvailable = false;
    }
  }

  private pumpQueue(): void {
    if (this.taskQueue.length === 0 || this.idleWorkerIds.length === 0) return;

    const workerId = this.idleWorkerIds.pop()!;
    const task = this.taskQueue.shift()!;
    const worker = this.workers[workerId];

    const onMessage = (e: MessageEvent) => {
      worker.removeEventListener('message', onMessage);
      if (e.data?.success) {
        task.resolve(e.data.result);
      } else {
        task.reject(new Error(e.data?.error || 'Worker meshing failed'));
      }
    };

    worker.addEventListener('message', onMessage);

    // Post with zero-copy transfer of halo buffer
    try {
      worker.postMessage(task.input, [task.input.halo.buffer]);
    } catch {
      // If transfer fails (e.g. detached buffer), post without transfer list
      worker.postMessage(task.input);
    }
  }

  /**
   * Dispatches a 34³ halo meshing task to the worker pool (or runs synchronously as fallback).
   */
  public async meshChunk(input: HaloMeshInput): Promise<TransferableVoxelMeshResult> {
    if (!this.isAvailable || this.workers.length === 0) {
      // Synchronous fallback
      return meshChunkWithHalo34(input);
    }

    return new Promise((resolve, reject) => {
      this.taskQueue.push({ input, resolve, reject });
      this.pumpQueue();
    });
  }

  public terminate(): void {
    for (const w of this.workers) {
      w.terminate();
    }
    this.workers = [];
    this.idleWorkerIds = [];
    this.taskQueue = [];
    this.isAvailable = false;
  }
}
