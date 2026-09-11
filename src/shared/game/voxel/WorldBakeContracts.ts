/**
 * Data contracts for Large-Scale World Generation Architecture
 */

export interface RegionCoordinate {
  mapId: string;
  regionX: number;
  regionZ: number;
}

export interface GeneratorVersion {
  generatorId: string; // e.g. "saints-core"
  version: number;     // e.g. 1
  configHash: string;  // hash of procedural configuration
}

export type RegionStatus = 'PENDING' | 'GENERATING' | 'COMPLETED' | 'ERROR';

export interface RegionArtifact {
  coordinates: RegionCoordinate;
  generator: GeneratorVersion;
  status: RegionStatus;
  voxelData?: Uint8Array | null; // Raw/Compressed binary blob of the 64 chunks (8x8)
  checksum?: string;
  createdAt: number;
  updatedAt: number;
}

export interface WorldManifest {
  mapId: string;
  name: string;
  version: number;
  generator: GeneratorVersion;
  dimensions: {
    widthChunks: number;
    depthChunks: number;
    heightChunks: number;
  };
  chunkSize: { x: number; y: number; z: number };
  chunksPerRegion: number; // e.g. 8 (meaning 8x8 = 64)
  activeRegions: RegionCoordinate[];
  metadata: Record<string, any>;
}

export type WorldBakeJobStatus = 'QUEUED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface WorldBakeJob {
  jobId: string;
  revisionId?: string; // Links this job to a WorldBootstrapRevision
  manifest: WorldManifest;
  status: WorldBakeJobStatus;
  priority: number;
  startedAt: number;
  updatedAt: number;
}

export interface WorldBakeProgress {
  jobId: string;
  totalRegions: number;
  completedRegions: number;
  currentRegion?: RegionCoordinate;
  progressPercent: number;
  activeWorkers: number;
  error?: string;
}
