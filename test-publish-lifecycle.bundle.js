"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/server/services/bake/WorldBakeService.ts
var import_worker_threads = require("worker_threads");
var import_path = __toESM(require("path"));

// src/server/repositories/VoxelRegionRepository.ts
var import_client = require("@prisma/client");
var prisma = new import_client.PrismaClient();
function mapToArtifact(record) {
  return {
    coordinates: {
      mapId: record.mapId,
      regionX: record.regionX,
      regionZ: record.regionZ
    },
    generator: {
      generatorId: "saints-core",
      // Default until metadata table expansion
      version: record.version,
      configHash: ""
    },
    status: record.status,
    voxelData: record.artifact?.voxelData ? new Uint8Array(record.artifact.voxelData) : null,
    checksum: record.artifactChecksum || void 0,
    createdAt: record.createdAt.getTime(),
    updatedAt: record.updatedAt.getTime()
  };
}
var VoxelRegionRepository = class {
  /**
   * Upserts a WorldRegion payload.
   */
  static async saveRegion(artifact) {
    const { mapId, regionX, regionZ } = artifact.coordinates;
    if (artifact.voxelData && artifact.checksum) {
      await prisma.worldRegionArtifact.upsert({
        where: { checksum: artifact.checksum },
        create: {
          checksum: artifact.checksum,
          voxelData: Buffer.from(artifact.voxelData)
        },
        update: {
          // Immutable, so we don't update voxelData if it already exists
        }
      });
    }
    await prisma.worldRegion.upsert({
      where: {
        mapId_regionX_regionZ: {
          mapId,
          regionX,
          regionZ
        }
      },
      create: {
        mapId,
        regionX,
        regionZ,
        version: artifact.generator.version,
        status: artifact.status,
        artifactChecksum: artifact.checksum
      },
      update: {
        version: artifact.generator.version,
        status: artifact.status,
        artifactChecksum: artifact.checksum
      }
    });
  }
  /**
   * Fetches a specific WorldRegion.
   */
  static async getRegion(coords) {
    const record = await prisma.worldRegion.findUnique({
      where: {
        mapId_regionX_regionZ: {
          mapId: coords.mapId,
          regionX: coords.regionX,
          regionZ: coords.regionZ
        }
      },
      include: {
        artifact: true
      }
    });
    if (!record) return null;
    return mapToArtifact(record);
  }
  /**
   * Fetches all WorldRegions for a given map.
   */
  static async getRegionsForMap(mapId) {
    const records = await prisma.worldRegion.findMany({
      where: { mapId },
      include: {
        artifact: true
      },
      orderBy: [
        { regionZ: "asc" },
        { regionX: "asc" }
      ]
    });
    return records.map(mapToArtifact);
  }
  /**
   * Deletes a specific WorldRegion.
   */
  static async deleteRegion(coords) {
    await prisma.worldRegion.delete({
      where: {
        mapId_regionX_regionZ: {
          mapId: coords.mapId,
          regionX: coords.regionX,
          regionZ: coords.regionZ
        }
      }
    });
  }
  /**
   * Deletes all WorldRegions for a given map.
   */
  static async deleteAllRegionsForMap(mapId) {
    await prisma.worldRegion.deleteMany({
      where: { mapId }
    });
  }
  /**
   * Fetches the raw artifact data for a list of checksums.
   * Useful when loading published worlds purely from content-hashes.
   */
  static async getRegionArtifactsByChecksums(checksums) {
    const artifacts = await prisma.worldRegionArtifact.findMany({
      where: {
        checksum: { in: checksums }
      }
    });
    const result = {};
    for (const artifact of artifacts) {
      result[artifact.checksum] = new Uint8Array(artifact.voxelData);
    }
    return result;
  }
};

// src/server/services/bake/WorldBakeService.ts
var MAX_WORKERS = 4;
var WorldBakeService = class {
  constructor() {
    this.activeJobs = /* @__PURE__ */ new Map();
    this.progressMap = /* @__PURE__ */ new Map();
    this.workerPool = [];
    // Job queues
    this.pendingTasks = [];
    this.activeTaskCount = 0;
    this.initializePool();
  }
  initializePool() {
    for (let i = 0; i < MAX_WORKERS; i++) {
      this.spawnWorker();
    }
  }
  spawnWorker() {
    const workerPath = import_path.default.resolve(__dirname, "./bakeWorker.ts");
    let worker;
    if (/\.ts$/.test(workerPath)) {
      worker = new import_worker_threads.Worker(workerPath, {
        execArgv: ["--import", "tsx"]
      });
    } else {
      worker = new import_worker_threads.Worker(workerPath);
    }
    worker.on("message", (result) => this.handleWorkerResult(result));
    worker.on("error", (err) => {
      console.error("[BakeService] Worker Error:", err);
    });
    worker.on("exit", (code) => {
      if (code !== 0) {
        console.error(`[BakeService] Worker stopped with exit code ${code}`);
      }
      this.workerPool = this.workerPool.filter((w) => w !== worker);
      setTimeout(() => this.spawnWorker(), 500);
    });
    this.workerPool.push(worker);
  }
  async handleWorkerResult(result) {
    this.activeTaskCount--;
    const taskJobId = result.taskId.split("__")[0];
    const job = this.activeJobs.get(taskJobId);
    if (!job) {
      console.warn(`[BakeService] Received result for unknown job ${taskJobId}`);
      this.processNextTask();
      return;
    }
    if (job.status === "CANCELLED" || job.status === "PAUSED") {
      this.processNextTask();
      return;
    }
    if (result.status === "ERROR") {
      console.error(`[BakeService] Job ${taskJobId} failed on region ${result.regionX},${result.regionZ}: ${result.error}`);
      job.status = "FAILED";
      const prog = this.progressMap.get(taskJobId);
      if (prog) prog.error = result.error;
      this.processNextTask();
      return;
    }
    const artifact = {
      coordinates: {
        mapId: job.manifest.mapId,
        regionX: result.regionX,
        regionZ: result.regionZ
      },
      generator: job.manifest.generator,
      status: "COMPLETED",
      voxelData: result.compressedPayload,
      checksum: result.checksum,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    try {
      await VoxelRegionRepository.saveRegion(artifact);
      const prog = this.progressMap.get(taskJobId);
      if (prog) {
        prog.completedRegions++;
        prog.progressPercent = Math.round(prog.completedRegions / prog.totalRegions * 100);
        prog.currentRegion = void 0;
        if (prog.completedRegions >= prog.totalRegions) {
          job.status = "COMPLETED";
          console.log(`[BakeService] Job ${taskJobId} COMPLETED!`);
        }
      }
    } catch (e) {
      console.error(`[BakeService] Failed to persist region artifact:`, e);
      job.status = "FAILED";
    }
    this.processNextTask();
  }
  processNextTask() {
    if (this.pendingTasks.length === 0) return;
    if (this.activeTaskCount >= this.workerPool.length) return;
    const task = this.pendingTasks.shift();
    if (!task) return;
    const taskJobId = task.taskId.split("__")[0];
    const job = this.activeJobs.get(taskJobId);
    if (job?.status === "CANCELLED" || job?.status === "PAUSED") {
      this.processNextTask();
      return;
    }
    const worker = this.workerPool[this.activeTaskCount % this.workerPool.length];
    if (worker) {
      this.activeTaskCount++;
      worker.postMessage(task);
      const prog = this.progressMap.get(taskJobId);
      if (prog) {
        prog.currentRegion = { mapId: job.manifest.mapId, regionX: task.regionX, regionZ: task.regionZ };
      }
    }
  }
  /**
   * Submits a new World Bake Job.
   */
  async submitJob(job, config) {
    if (this.activeJobs.has(job.jobId)) {
      throw new Error(`Job ${job.jobId} already exists.`);
    }
    job.status = "RUNNING";
    this.activeJobs.set(job.jobId, job);
    const totalRegions = job.manifest.activeRegions.length;
    this.progressMap.set(job.jobId, {
      jobId: job.jobId,
      totalRegions,
      completedRegions: 0,
      progressPercent: 0,
      activeWorkers: 0
    });
    for (const region of job.manifest.activeRegions) {
      const existing = await VoxelRegionRepository.getRegion(region);
      if (existing && existing.status === "COMPLETED" && existing.checksum) {
        const prog2 = this.progressMap.get(job.jobId);
        if (prog2) {
          prog2.completedRegions++;
          prog2.progressPercent = Math.round(prog2.completedRegions / prog2.totalRegions * 100);
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
    const prog = this.progressMap.get(job.jobId);
    if (prog && prog.completedRegions >= prog.totalRegions) {
      job.status = "COMPLETED";
      return;
    }
    for (let i = 0; i < MAX_WORKERS; i++) {
      this.processNextTask();
    }
  }
  cancelJob(jobId) {
    const job = this.activeJobs.get(jobId);
    if (job) {
      job.status = "CANCELLED";
      this.pendingTasks = this.pendingTasks.filter((t) => !t.taskId.startsWith(jobId));
    }
  }
  pauseJob(jobId) {
    const job = this.activeJobs.get(jobId);
    if (job && job.status === "RUNNING") {
      job.status = "PAUSED";
    }
  }
  getProgress(jobId) {
    const prog = this.progressMap.get(jobId);
    if (prog) {
      prog.activeWorkers = this.activeTaskCount;
    }
    return prog || null;
  }
};
var worldBakeService = new WorldBakeService();

// src/server/services/VoxelStorageService.ts
var import_client2 = require("@prisma/client");
var import_zlib = __toESM(require("zlib"));
var prisma2 = new import_client2.PrismaClient();
var CHUNKS_PER_REGION = 8;
var VoxelStorageService = class {
  /**
   * Fetches the world document, preferring the new WorldRegion artifacts.
   * If regions don't exist, falls back to the legacy `WorldMap.voxelData` column.
   */
  static async getVoxelDoc(mapId) {
    const map = await prisma2.worldMap.findUnique({
      where: { id: mapId },
      select: {
        id: true,
        name: true,
        gameId: true,
        voxelData: true,
        publishedVersion: true
      }
    });
    if (!map) return null;
    const regions = await VoxelRegionRepository.getRegionsForMap(mapId);
    if (regions.length > 0) {
      return this.assembleDocFromRegions(map, regions);
    }
    if (map.voxelData && map.voxelData !== "{}" && map.voxelData !== "[]") {
      try {
        const doc = JSON.parse(map.voxelData);
        return doc;
      } catch (e) {
        console.error(`[VoxelStorageService] Failed to parse legacy voxelData for map ${mapId}`, e);
        return null;
      }
    }
    return null;
  }
  /**
   * Fetches the world document exclusively from a set of explicit WorldRegionArtifact checksums.
   * This is used by the runtime when loading a Published version, completely bypassing Draft region pointers.
   */
  static async getVoxelDocFromArtifacts(mapId, checksums) {
    const map = await prisma2.worldMap.findUnique({
      where: { id: mapId },
      select: { id: true, name: true, gameId: true }
    });
    if (!map) return null;
    const artifacts = await VoxelRegionRepository.getRegionArtifactsByChecksums(checksums);
    const regions = Object.values(artifacts).map((voxelData) => ({
      coordinates: { mapId, regionX: 0, regionZ: 0 },
      // not strictly needed by assemble
      generator: { generatorId: "", version: 1, configHash: "" },
      status: "COMPLETED",
      voxelData,
      createdAt: 0,
      updatedAt: 0
    }));
    if (regions.length > 0) {
      return this.assembleDocFromRegions(map, regions);
    }
    return null;
  }
  /**
   * Saves a full VoxelWorldDocV3, writing to both legacy (temporarily) 
   * and the new WorldRegion format based on chunks.
   */
  static async saveVoxelDoc(doc) {
    await prisma2.worldMap.update({
      where: { id: doc.id },
      data: {
        voxelData: JSON.stringify(doc)
      }
    });
    await this.splitAndSaveRegions(doc);
  }
  /**
   * Internal Helper: Assembles a legacy VoxelWorldDocV3 from RegionArtifacts.
   */
  static assembleDocFromRegions(map, regions) {
    const chunks = {};
    for (const region of regions) {
      if (!region.voxelData) continue;
      try {
        const decompressed = import_zlib.default.inflateSync(Buffer.from(region.voxelData));
        const payload = JSON.parse(decompressed.toString("utf-8"));
        if (payload.chunks) {
          Object.assign(chunks, payload.chunks);
        }
      } catch (err) {
        console.error(`[VoxelStorageService] Failed to inflate region artifact ${region.coordinates.regionX},${region.coordinates.regionZ}`, err);
      }
    }
    return {
      formatVersion: 3,
      id: map.id,
      name: map.name,
      gameId: map.gameId || "saints",
      version: 1,
      blockSizePx: 64,
      dimensions: { widthChunks: 2, depthChunks: 2, heightChunks: 1 },
      palette: [],
      // Needs to be loaded from manifest eventually
      chunks,
      publishedVersion: map.publishedVersion
    };
  }
  /**
   * Internal Helper: Splits a VoxelWorldDocV3 into RegionArtifacts and persists them.
   */
  static async splitAndSaveRegions(doc) {
    const regionPayloads = /* @__PURE__ */ new Map();
    for (const [chunkKey, data] of Object.entries(doc.chunks)) {
      const [cxStr, czStr, cyStr] = chunkKey.split("_");
      const cx = parseInt(cxStr, 10);
      const cz = parseInt(czStr, 10);
      const rx = Math.floor(cx / CHUNKS_PER_REGION);
      const rz = Math.floor(cz / CHUNKS_PER_REGION);
      const rKey = `${rx}_${rz}`;
      if (!regionPayloads.has(rKey)) {
        regionPayloads.set(rKey, { chunks: {} });
      }
      regionPayloads.get(rKey).chunks[chunkKey] = data;
    }
    const promises = Array.from(regionPayloads.entries()).map(([rKey, payload]) => {
      const [rxStr, rzStr] = rKey.split("_");
      const artifact = {
        coordinates: {
          mapId: doc.id,
          regionX: parseInt(rxStr, 10),
          regionZ: parseInt(rzStr, 10)
        },
        generator: {
          generatorId: "legacy-bridge",
          version: 1,
          configHash: "legacy"
        },
        status: "COMPLETED",
        // Compress region chunk arrays using zlib deflate
        voxelData: new Uint8Array(import_zlib.default.deflateSync(Buffer.from(JSON.stringify(payload), "utf-8"))),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      return VoxelRegionRepository.saveRegion(artifact);
    });
    await Promise.all(promises);
  }
};

// src/web/lib/prisma.ts
var import_client3 = require("@prisma/client");
var globalForPrisma = globalThis;
function createPrismaClient() {
  const logOptions = process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"];
  return new import_client3.PrismaClient({ log: logOptions });
}
var prisma3 = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma3;

// test-publish-lifecycle.ts
var import_crypto = __toESM(require("crypto"));
async function waitForJob(jobId) {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      const currentJob = worldBakeService.activeJobs.get(jobId);
      if (currentJob && currentJob.status === "COMPLETED") {
        clearInterval(interval);
        resolve();
      }
    }, 250);
  });
}
async function runBake(sizeStr, chunksDimension, mapId, seed, baseMaterial) {
  const CHUNKS_PER_REGION2 = 8;
  const regionsDim = chunksDimension / CHUNKS_PER_REGION2;
  const activeRegions = [];
  for (let rz = 0; rz < regionsDim; rz++) {
    for (let rx = 0; rx < regionsDim; rx++) {
      activeRegions.push({ mapId, regionX: rx, regionZ: rz });
    }
  }
  const manifest = {
    mapId,
    name: `${sizeStr} Publish Test Map`,
    version: 1,
    generator: { generatorId: "test-gen", version: 1, configHash: "test" },
    dimensions: { widthChunks: chunksDimension, depthChunks: chunksDimension, heightChunks: 1 },
    chunkSize: { x: 32, y: 32, z: 32 },
    chunksPerRegion: CHUNKS_PER_REGION2,
    activeRegions,
    metadata: {}
  };
  const jobId = `publish_bake_${sizeStr}_${Date.now()}`;
  const job = {
    jobId,
    manifest,
    status: "QUEUED",
    priority: 1,
    startedAt: Date.now(),
    updatedAt: Date.now()
  };
  const config = {
    id: mapId,
    name: mapId,
    widthChunks: chunksDimension,
    depthChunks: chunksDimension,
    blockSizePx: 64,
    mode: "procedural",
    seed,
    baseMaterial
    // this will actually change the fallback voxels
  };
  await worldBakeService.submitJob(job, config);
  await waitForJob(jobId);
}
async function publishVersion(mapId, version) {
  const regions = await VoxelRegionRepository.getRegionsForMap(mapId);
  for (const r of regions) {
    if (r.status !== "COMPLETED") throw new Error(`Region ${r.coordinates.regionX},${r.coordinates.regionZ} not completed`);
    if (!r.checksum) throw new Error(`Region missing checksum`);
    if (!r.voxelData) throw new Error(`Region artifact missing for ${r.checksum}`);
  }
  const regionMetadata = regions.map((r) => ({
    coordinates: r.coordinates,
    generator: r.generator,
    status: r.status,
    checksum: r.checksum
  }));
  const snapshotPayload = {
    id: mapId,
    name: `Test Map v${version}`,
    version: 1,
    publishedVersion: version,
    regions: regionMetadata
  };
  await prisma3.worldMapVersion.upsert({
    where: { mapId_version: { mapId, version } },
    create: { mapId, version, name: snapshotPayload.name, data: JSON.stringify(snapshotPayload) },
    update: { data: JSON.stringify(snapshotPayload) }
  });
  return regionMetadata;
}
async function testPublishLifecycle() {
  console.log(`
========================================`);
  console.log(`[TEST] Phase 2B Immutable Publish Lifecycle`);
  console.log(`========================================`);
  const mapId = `publish-test-map-${Date.now()}`;
  await prisma3.worldMap.create({
    data: { id: mapId, name: "Publish Test Map", version: 3, gatesData: "{}", tileLayersData: "{}", npcsData: "{}" }
  });
  console.log(`
[STEP A] Baking 4x4 with Seed A (100)`);
  await runBake("4x4", 4, mapId, 100, 2);
  console.log(`[STEP B] Publishing Version 1`);
  const v1Metadata = await publishVersion(mapId, 1);
  console.log(`  -> Version 1 published with ${v1Metadata.length} regions.`);
  const v1Checksums = v1Metadata.map((r) => r.checksum);
  console.log(`  -> V1 Checksums:`, v1Checksums);
  console.log(`
[STEP D] Baking 4x4 with Seed B (200)`);
  await prisma3.worldRegion.updateMany({ where: { mapId }, data: { status: "PENDING" } });
  await runBake("4x4", 4, mapId, 200, 5);
  console.log(`[STEP E] Publishing Version 2`);
  const v2Metadata = await publishVersion(mapId, 2);
  const v2Checksums = v2Metadata.map((r) => r.checksum);
  console.log(`  -> V2 Checksums:`, v2Checksums);
  console.log(`
[STEP F] Loading Version 1 artifacts via content hash...`);
  const v1Doc = await VoxelStorageService.getVoxelDocFromArtifacts(mapId, v1Checksums);
  if (!v1Doc || Object.keys(v1Doc.chunks || {}).length === 0) {
    throw new Error("V1 Doc failed to load");
  }
  const v1ChunksHash = import_crypto.default.createHash("sha256").update(JSON.stringify(v1Doc.chunks)).digest("hex");
  console.log(`  -> V1 Chunks Hash: ${v1ChunksHash}`);
  console.log(`[STEP G] Loading Version 2 artifacts via content hash...`);
  const v2Doc = await VoxelStorageService.getVoxelDocFromArtifacts(mapId, v2Checksums);
  if (!v2Doc || Object.keys(v2Doc.chunks || {}).length === 0) {
    throw new Error("V2 Doc failed to load");
  }
  const v2ChunksHash = import_crypto.default.createHash("sha256").update(JSON.stringify(v2Doc.chunks)).digest("hex");
  console.log(`  -> V2 Chunks Hash: ${v2ChunksHash}`);
  if (v1ChunksHash === v2ChunksHash) {
    throw new Error("FATAL: V1 and V2 loaded the same chunks! Immutability broken!");
  }
  console.log(`[SUCCESS] Draft modification did not affect Published V1!`);
  console.log(`
[VERIFY] Testing Content Hash Reuse`);
  console.log(`  -> Baking Seed B (200) again with same baseMaterial...`);
  await prisma3.worldRegion.updateMany({ where: { mapId }, data: { status: "PENDING" } });
  await runBake("4x4", 4, mapId, 200, 5);
  const v3Metadata = await publishVersion(mapId, 3);
  const v3Checksums = v3Metadata.map((r) => r.checksum);
  let allReused = true;
  for (let i = 0; i < v2Checksums.length; i++) {
    if (v2Checksums[i] !== v3Checksums[i]) allReused = false;
  }
  if (!allReused) {
    throw new Error("FATAL: Exact same bake produced different checksums. Content reuse failed!");
  }
  console.log(`[SUCCESS] Content-addressed reuse verified! Checksums match exactly.`);
  console.log(`
[LARGE BAKE] Testing 32x32 Publish / Reload`);
  const largeMapId = `large-test-map-${Date.now()}`;
  await prisma3.worldMap.create({
    data: { id: largeMapId, name: "32x32 Test Map", version: 3, gatesData: "{}", tileLayersData: "{}", npcsData: "{}" }
  });
  const largeStart = Date.now();
  await runBake("32x32", 32, largeMapId, 999);
  console.log(`  -> Bake completed in ${Date.now() - largeStart}ms`);
  const largeMetadata = await publishVersion(largeMapId, 1);
  if (largeMetadata.length !== 16) {
    throw new Error(`Expected 16 regions for 32x32, got ${largeMetadata.length}`);
  }
  console.log(`  -> Published 32x32 Version 1 with ${largeMetadata.length} regions.`);
  const largeDoc = await VoxelStorageService.getVoxelDocFromArtifacts(largeMapId, largeMetadata.map((r) => r.checksum));
  const loadedChunks = Object.keys(largeDoc?.chunks || {}).length;
  if (loadedChunks !== 1024) {
    throw new Error(`Expected 1024 chunks in 32x32 doc, got ${loadedChunks}`);
  }
  console.log(`[SUCCESS] 32x32 Reload verified! Loaded all ${loadedChunks} chunks perfectly.`);
  console.log(`
========================================`);
  console.log(`[TEST PASSED] Phase 2B Immutable Pipeline Verified!`);
  console.log(`========================================
`);
  process.exit(0);
}
testPublishLifecycle().catch((e) => {
  console.error(e);
  process.exit(1);
});
