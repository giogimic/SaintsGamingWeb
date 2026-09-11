import { Worker } from 'worker_threads';
import path from 'path';
import { WorldBakeJob, WorldBakeProgress, RegionCoordinate, RegionArtifact, WorldBakeJobStatus } from '@/shared/game/voxel/WorldBakeContracts';
import { VoxelWorldGenerationConfig } from '@/shared/game/voxel/VoxelWorldGenerator';
import { BakeWorkerTask, BakeWorkerResult } from './bakeWorker';
import { VoxelRegionRepository } from '../../repositories/VoxelRegionRepository';
import { prisma } from '@/web/lib/prisma';

const MAX_WORKERS = 4; // Bounded concurrency

export class WorldBakeService {
  private activeJobs = new Map<string, WorldBakeJob>();
  private progressMap = new Map<string, WorldBakeProgress>();
  private workerPool: Worker[] = [];
  
  // Job queues
  private pendingTasks: BakeWorkerTask[] = [];
  private activeTaskCount = 0;

  constructor() {
    this.initializePool();
  }

  private initializePool() {
    for (let i = 0; i < MAX_WORKERS; i++) {
      this.spawnWorker();
    }
  }

  private spawnWorker() {
    // NOTE: For Next.js development with TS, you often need a wrapper or dynamic import.
    // We'll use a direct path for the prototype and rely on Next/Node to resolve it.
    const workerPath = path.resolve(__dirname, './bakeWorker.ts');
    let worker: Worker;
    if (/\.ts$/.test(workerPath)) {
      worker = new Worker(workerPath, {
        execArgv: ['--import', 'tsx']
      });
    } else {
      worker = new Worker(workerPath);
    }

    worker.on('message', (result: BakeWorkerResult) => this.handleWorkerResult(result));
    worker.on('error', (err) => {
      console.error('[BakeService] Worker Error:', err);
    });
    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`[BakeService] Worker stopped with exit code ${code}`);
      }
      this.workerPool = this.workerPool.filter(w => w !== worker);
      setTimeout(() => this.spawnWorker(), 500); // Wait a bit before respawning to prevent rapid crash loops
    });

    this.workerPool.push(worker);
  }

  private async handleWorkerResult(result: BakeWorkerResult) {
    this.activeTaskCount--;

    // We used `${job.jobId}__${regionX}_${regionZ}` to allow job IDs with underscores
    const taskJobId = result.taskId.split('__')[0];
    const job = this.activeJobs.get(taskJobId);
    
    if (!job) {
      console.warn(`[BakeService] Received result for unknown job ${taskJobId}`);
      this.processNextTask();
      return;
    }
    if (job.status === 'CANCELLED' || job.status === 'PAUSED') {
      this.processNextTask();
      return;
    }

    if (result.status === 'ERROR') {
      console.error(`[BakeService] Job ${taskJobId} failed on region ${result.regionX},${result.regionZ}: ${result.error}`);
      job.status = 'FAILED';
      const prog = this.progressMap.get(taskJobId);
      if (prog) prog.error = result.error;
      this.processNextTask();
      return;
    }

    // 1. Persist the region using bounded memory (it's already compressed)
    const artifact: RegionArtifact = {
      coordinates: {
        mapId: job.manifest.mapId,
        regionX: result.regionX,
        regionZ: result.regionZ,
      },
      generator: job.manifest.generator,
      status: 'COMPLETED',
      voxelData: result.compressedPayload,
      checksum: result.checksum,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      await VoxelRegionRepository.saveRegion(artifact);
      
      // Phase 3: Link to Bootstrap Revision if requested
      if (job.revisionId && artifact.checksum) {
        await prisma.worldBootstrapRevisionRegion.upsert({
          where: {
            revisionId_regionX_regionZ: {
              revisionId: job.revisionId,
              regionX: result.regionX,
              regionZ: result.regionZ,
            }
          },
          create: {
            revisionId: job.revisionId,
            regionX: result.regionX,
            regionZ: result.regionZ,
            artifactChecksum: artifact.checksum,
          },
          update: {
            artifactChecksum: artifact.checksum,
          }
        });
      }
      
      // Update Progress
      const prog = this.progressMap.get(taskJobId);
      if (prog) {
        prog.completedRegions++;
        prog.progressPercent = Math.round((prog.completedRegions / prog.totalRegions) * 100);
        prog.currentRegion = undefined;
        
        if (prog.completedRegions >= prog.totalRegions) {
          job.status = 'COMPLETED';
          if (job.revisionId) {
            await prisma.worldBootstrapRevision.update({
              where: { id: job.revisionId },
              data: { status: 'COMPLETED', completedAt: new Date() }
            });
          }
          console.log(`[BakeService] Job ${taskJobId} COMPLETED!`);
        }
      }
    } catch (e) {
      console.error(`[BakeService] Failed to persist region artifact:`, e);
      job.status = 'FAILED';
      if (job.revisionId) {
        await prisma.worldBootstrapRevision.update({
          where: { id: job.revisionId },
          data: { status: 'FAILED' }
        });
      }
    }

    this.processNextTask();
  }

  private processNextTask() {
    if (this.pendingTasks.length === 0) return;
    if (this.activeTaskCount >= this.workerPool.length) return; // Pool full

    const task = this.pendingTasks.shift();
    if (!task) return;

    const taskJobId = task.taskId.split('__')[0];
    const job = this.activeJobs.get(taskJobId);
    if (job?.status === 'CANCELLED' || job?.status === 'PAUSED') {
      this.processNextTask();
      return;
    }

    // Find available worker (simple round-robin or first available)
    // Since worker 'message' handler frees up capacity, any worker can take it, 
    // but in Node worker threads we must send it to one specific worker.
    // For a robust pool we'd track busy states per worker, 
    // but here we just assign cyclically for bounded concurrency.
    const worker = this.workerPool[this.activeTaskCount % this.workerPool.length];
    if (worker) {
      this.activeTaskCount++;
      worker.postMessage(task);
      
      const prog = this.progressMap.get(taskJobId);
      if (prog) {
        prog.currentRegion = { mapId: job!.manifest.mapId, regionX: task.regionX, regionZ: task.regionZ };
      }
    }
  }

  /**
   * Submits a new World Bake Job.
   */
  public async submitJob(job: WorldBakeJob, config: VoxelWorldGenerationConfig) {
    if (this.activeJobs.has(job.jobId)) {
      throw new Error(`Job ${job.jobId} already exists.`);
    }

    // 1. Setup Job
    job.status = 'RUNNING';
    this.activeJobs.set(job.jobId, job);

    const totalRegions = job.manifest.activeRegions.length;
    this.progressMap.set(job.jobId, {
      jobId: job.jobId,
      totalRegions,
      completedRegions: 0,
      progressPercent: 0,
      activeWorkers: 0,
    });

    // 2. Queue all region tasks
    for (const region of job.manifest.activeRegions) {
      // Checkpoint/Resume: Check if region is already completed
      const existing = await VoxelRegionRepository.getRegion(region);
      if (existing && existing.status === 'COMPLETED' && existing.checksum) {
        // Skip already completed region
        const prog = this.progressMap.get(job.jobId);
        if (prog) {
          prog.completedRegions++;
          prog.progressPercent = Math.round((prog.completedRegions / prog.totalRegions) * 100);
        }
        continue;
      }

      this.pendingTasks.push({
        taskId: `${job.jobId}__${region.regionX}_${region.regionZ}`,
        config,
        regionX: region.regionX,
        regionZ: region.regionZ,
        chunksPerRegion: job.manifest.chunksPerRegion
      });
    }

    // If fully resumed
    const prog = this.progressMap.get(job.jobId);
    if (prog && prog.completedRegions >= prog.totalRegions) {
      job.status = 'COMPLETED';
      return;
    }

    // Kick off pool
    for (let i = 0; i < MAX_WORKERS; i++) {
      this.processNextTask();
    }
  }

  public cancelJob(jobId: string) {
    const job = this.activeJobs.get(jobId);
    if (job) {
      job.status = 'CANCELLED';
      // Filter out pending tasks
      this.pendingTasks = this.pendingTasks.filter(t => !t.taskId.startsWith(jobId));
    }
  }

  public pauseJob(jobId: string) {
    const job = this.activeJobs.get(jobId);
    if (job && job.status === 'RUNNING') {
      job.status = 'PAUSED';
    }
  }

  public getProgress(jobId: string): WorldBakeProgress | null {
    const prog = this.progressMap.get(jobId);
    if (prog) {
      prog.activeWorkers = this.activeTaskCount; // simplified
    }
    return prog || null;
  }
}

// Singleton export
export const worldBakeService = new WorldBakeService();
