import { Worker } from 'worker_threads';
import path from 'path';
import fs from 'fs';
import { WorldBakeJob, WorldBakeProgress, RegionCoordinate, RegionArtifact, WorldBakeJobStatus } from '@/shared/game/voxel/WorldBakeContracts';
import { VoxelWorldGenerationConfig } from '@/shared/game/voxel/VoxelWorldGenerator';
import { BakeWorkerTask, BakeWorkerResult } from './bakeWorker';
import { VoxelRegionRepository } from '../../repositories/VoxelRegionRepository';
import { prisma } from '@/web/lib/prisma';

const MAX_WORKERS = 1; // Bounded concurrency (temporarily reduced for 502 diagnosis)

export class WorldBakeService {
  private activeJobs = new Map<string, WorldBakeJob>();
  private progressMap = new Map<string, WorldBakeProgress>();
  private workerPool: Worker[] = [];
  
  // Job queues
  private pendingTasks: BakeWorkerTask[] = [];
  private activeTaskCount = 0;

  // Worker tracking
  private activeTaskByWorker = new Map<Worker, BakeWorkerTask>();
  private circuitBreakerTripped = false;
  private consecutiveWorkerFailures = 0;

  constructor() {
    this.initializePool();
  }

  private initializePool() {
    for (let i = 0; i < MAX_WORKERS; i++) {
      this.spawnWorker();
    }
  }

  private spawnWorker() {
    if (this.circuitBreakerTripped) return;

    const isProd = process.env.NODE_ENV === 'production';
    let workerPath: string;
    let execArgv: string[] | undefined = undefined;

    if (isProd) {
      workerPath = path.join(process.cwd(), '.next', 'server', 'bakeWorker.bundle.js');
      if (!fs.existsSync(workerPath)) {
        console.error(`[BakeService] CRITICAL: Production worker bundle not found at ${workerPath}`);
        // Fallback for development servers that didn't run the bundle step
        if (fs.existsSync(path.join(process.cwd(), 'src', 'server', 'services', 'bake', 'bakeWorker.bundle.js'))) {
           workerPath = path.join(process.cwd(), 'src', 'server', 'services', 'bake', 'bakeWorker.bundle.js');
        }
      }
    } else {
      workerPath = path.join(process.cwd(), 'src', 'server', 'services', 'bake', 'bakeWorker.ts');
      execArgv = ['--import', 'tsx'];
    }

    let worker: Worker;
    try {
      worker = new Worker(workerPath, { execArgv });
    } catch (e: any) {
      console.error(`[BakeService] Failed to instantiate Worker:`, e);
      this.handleFatalWorkerError(`Worker instantiation failed: ${e.message}. workerPath=${workerPath}`);
      return;
    }

    let workerIsBooted = false;
    worker.once('online', () => {
       workerIsBooted = true;
       this.consecutiveWorkerFailures = 0; // Reset circuit breaker
    });

    worker.on('message', (result: BakeWorkerResult) => {
       this.activeTaskByWorker.delete(worker);
       this.handleWorkerResult(result);
    });

    worker.on('error', (err) => {
      console.error('[BakeService] Worker Error:', err);
    });

    worker.on('exit', (code) => {
      this.workerPool = this.workerPool.filter(w => w !== worker);
      
      if (!workerIsBooted) {
        console.error(`[BakeService] Worker initialization failed with exit code ${code}. Path: ${workerPath}`);
        this.consecutiveWorkerFailures++;
        if (this.consecutiveWorkerFailures >= MAX_WORKERS) {
           this.handleFatalWorkerError(`Circuit breaker tripped: Workers failing to initialize (code ${code}). Path=${workerPath}`);
           return;
        }
      } else if (code !== 0) {
        console.error(`[BakeService] Worker crashed during execution (exit code ${code})`);
        
        // Find if it was processing a task and fail it specifically
        const activeTask = this.activeTaskByWorker.get(worker);
        this.activeTaskByWorker.delete(worker);
        if (activeTask) {
           this.handleWorkerResult({
              taskId: activeTask.taskId,
              regionX: activeTask.regionX,
              regionZ: activeTask.regionZ,
              status: 'ERROR',
              error: `Worker crashed unexpectedly (code ${code})`,
              chunksGenerated: 0
           });
        }
      }
      
      if (!this.circuitBreakerTripped) {
         setTimeout(() => this.spawnWorker(), 500);
      }
    });

    this.workerPool.push(worker);
  }

  private handleFatalWorkerError(reason: string) {
    if (this.circuitBreakerTripped) return;
    this.circuitBreakerTripped = true;
    console.error(`[BakeService] FATAL ERROR: ${reason}`);

    // Fail all active jobs
    for (const [jobId, job] of this.activeJobs.entries()) {
       if (job.status === 'RUNNING' || job.status === 'QUEUED') {
          job.status = 'FAILED';
          const prog = this.progressMap.get(jobId);
          if (prog) prog.error = reason;

          if (job.revisionId) {
             prisma.worldBootstrapRevision.update({
                where: { id: job.revisionId },
                data: { status: 'FAILED' }
             }).catch(e => console.error(`Failed to persist fatal job error:`, e));
          }
       }
    }
    
    // Clear pending queue so we don't process anything
    this.pendingTasks = [];
    this.activeJobs.clear();
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
      this.activeTaskByWorker.set(worker, task);
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
