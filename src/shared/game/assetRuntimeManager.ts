/**
 * Saints Gaming — Runtime Asset Manager & Lifecycle Layer
 *
 * Provides lifecycle tracking, dependency graph resolution, container bundling,
 * warm/cold caching, and preloading decoupled from the rendering engine.
 */

import { PreloadGroupId, PreloadPriority, PresentationDefinition } from "./canonicalAsset";

export type AssetLifecycleState =
  | "UNREGISTERED"
  | "DISCOVERED"
  | "QUEUED"
  | "LOADING"
  | "READY"
  | "ACTIVE"
  | "CACHED"
  | "RELEASED"
  | "ERROR";

export interface RuntimeAssetRecord {
  id: string;
  name: string;
  type: string;
  sourceUrl: string;
  category?: string | null;
  tags: string[];
  dependencies: string[];
  dependents: string[];
  preloadGroup?: PreloadGroupId | null;
  preloadPriority: PreloadPriority;
  presentation?: PresentationDefinition | null;
  fileSize?: number;
  metadata?: Record<string, any>;
  state: AssetLifecycleState;
  lastStateChange: number;
  loadedPayload?: any;
  error?: string | null;
}

export type AssetContainerType = "character" | "creature" | "environment" | "map" | "custom";

export interface AssetContainer {
  id: string;
  name: string;
  type: AssetContainerType;
  primaryAssetId: string;
  includedAssetIds: string[];
  preloadGroup?: PreloadGroupId | null;
  state: "COLD" | "WARM" | "ACTIVE" | "ERROR";
}

export interface RuntimeAssetDiagnostics {
  totalRegistered: number;
  stateCounts: Record<AssetLifecycleState, number>;
  activeContainers: number;
  missingDependencies: Array<{ assetId: string; missingId: string }>;
  failedLoads: Array<{ assetId: string; error: string }>;
  unusedLoadedAssets: string[];
  estimatedMemoryBytes: number;
}

export type AssetLoaderFn = (asset: RuntimeAssetRecord) => Promise<any>;

export interface RuntimeAssetManagerOptions {
  customLoader?: AssetLoaderFn;
  defaultCacheTtlMs?: number;
}

/**
 * Manages the lifecycle, preloading, and dependency graph of all game assets.
 */
export class RuntimeAssetManager {
  private static instance: RuntimeAssetManager | null = null;

  public static getInstance(options?: RuntimeAssetManagerOptions): RuntimeAssetManager {
    if (!RuntimeAssetManager.instance) {
      RuntimeAssetManager.instance = new RuntimeAssetManager(options);
    }
    return RuntimeAssetManager.instance;
  }

  private assets = new Map<string, RuntimeAssetRecord>();
  private containers = new Map<string, AssetContainer>();
  private preloadGroups = new Map<string, Set<string>>();
  private listeners = new Set<(asset: RuntimeAssetRecord, previousState: AssetLifecycleState) => void>();
  private loader: AssetLoaderFn;
  private cacheTtlMs: number;

  constructor(options?: RuntimeAssetManagerOptions) {
    this.loader = options?.customLoader || this.defaultLoader.bind(this);
    this.cacheTtlMs = options?.defaultCacheTtlMs ?? 5 * 60 * 1000; // 5 minutes default
  }

  private async defaultLoader(asset: RuntimeAssetRecord): Promise<any> {
    // Default simulated / headless loader
    return {
      loadedAt: Date.now(),
      url: asset.sourceUrl,
      type: asset.type,
    };
  }

  /**
   * Register an asset in the registry (DISCOVERED state).
   */
  public registerAsset(asset: {
    id: string;
    name: string;
    type: string;
    sourceUrl: string;
    category?: string | null;
    tags?: string[];
    dependencies?: string[];
    dependents?: string[];
    preloadGroup?: PreloadGroupId | null;
    preloadPriority?: PreloadPriority;
    presentation?: PresentationDefinition | null;
    fileSize?: number;
    metadata?: Record<string, any>;
  }): RuntimeAssetRecord {
    const existing = this.assets.get(asset.id);
    if (existing) {
      existing.name = asset.name;
      existing.sourceUrl = asset.sourceUrl;
      existing.dependencies = asset.dependencies || existing.dependencies;
      existing.preloadGroup = asset.preloadGroup || existing.preloadGroup;
      existing.presentation = asset.presentation || existing.presentation;
      return existing;
    }

    const record: RuntimeAssetRecord = {
      id: asset.id,
      name: asset.name,
      type: asset.type,
      sourceUrl: asset.sourceUrl,
      category: asset.category || null,
      tags: asset.tags || [],
      dependencies: asset.dependencies || [],
      dependents: asset.dependents || [],
      preloadGroup: asset.preloadGroup || null,
      preloadPriority: asset.preloadPriority || "NORMAL",
      presentation: asset.presentation || null,
      fileSize: asset.fileSize || 0,
      metadata: asset.metadata || {},
      state: "DISCOVERED",
      lastStateChange: Date.now(),
      loadedPayload: undefined,
      error: null,
    };

    this.assets.set(record.id, record);

    // Track preload group
    if (record.preloadGroup) {
      if (!this.preloadGroups.has(record.preloadGroup)) {
        this.preloadGroups.set(record.preloadGroup, new Set());
      }
      this.preloadGroups.get(record.preloadGroup)!.add(record.id);
    }

    // Register dependents links
    for (const depId of record.dependencies) {
      const dep = this.assets.get(depId);
      if (dep && !dep.dependents.includes(record.id)) {
        dep.dependents.push(record.id);
      }
    }

    return record;
  }

  public getAsset(id: string): RuntimeAssetRecord | undefined {
    return this.assets.get(id);
  }

  public getAllAssets(): RuntimeAssetRecord[] {
    return Array.from(this.assets.values());
  }

  public onStateChange(callback: (asset: RuntimeAssetRecord, previousState: AssetLifecycleState) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private setState(asset: RuntimeAssetRecord, newState: AssetLifecycleState, error?: string | null) {
    const prevState = asset.state;
    if (prevState === newState && error === asset.error) return;

    asset.state = newState;
    asset.lastStateChange = Date.now();
    if (error !== undefined) {
      asset.error = error;
    }

    this.listeners.forEach((listener) => {
      try {
        listener(asset, prevState);
      } catch (err) {
        console.error(`[RuntimeAssetManager] Error in state listener for ${asset.id}:`, err);
      }
    });
  }

  /**
   * Recursively resolves and loads an asset and all its dependencies.
   */
  public async loadAsset(id: string): Promise<RuntimeAssetRecord> {
    const asset = this.assets.get(id);
    if (!asset) {
      throw new Error(`[RuntimeAssetManager] Asset ${id} is not registered.`);
    }

    if (asset.state === "READY" || asset.state === "ACTIVE" || asset.state === "CACHED") {
      return asset;
    }

    this.setState(asset, "QUEUED");

    // 1. Resolve and recursively load dependencies first
    const missingDeps: string[] = [];
    for (const depId of asset.dependencies) {
      if (!this.assets.has(depId)) {
        missingDeps.push(depId);
      }
    }

    if (missingDeps.length > 0) {
      const errMsg = `Missing dependencies: ${missingDeps.join(", ")}`;
      this.setState(asset, "ERROR", errMsg);
      throw new Error(`[RuntimeAssetManager] Cannot load asset ${id}: ${errMsg}`);
    }

    try {
      await Promise.all(asset.dependencies.map((depId) => this.loadAsset(depId)));

      this.setState(asset, "LOADING");
      const payload = await this.loader(asset);
      asset.loadedPayload = payload;
      this.setState(asset, "READY", null);
      return asset;
    } catch (err: any) {
      this.setState(asset, "ERROR", err?.message || "Failed to load asset");
      throw err;
    }
  }

  /**
   * Marks an asset as ACTIVE (in use by the scene/gameplay).
   */
  public activateAsset(id: string): void {
    const asset = this.assets.get(id);
    if (!asset) return;

    if (asset.state === "READY" || asset.state === "CACHED") {
      this.setState(asset, "ACTIVE");
      for (const depId of asset.dependencies) {
        this.activateAsset(depId);
      }
    }
  }

  /**
   * Demotes an active asset to CACHED / Warm state.
   */
  public deactivateAsset(id: string): void {
    const asset = this.assets.get(id);
    if (!asset) return;

    if (asset.state === "ACTIVE") {
      this.setState(asset, "CACHED");
      for (const depId of asset.dependencies) {
        this.deactivateAsset(depId);
      }
    }
  }

  /**
   * Releases an asset from runtime memory if it's no longer ACTIVE.
   */
  public releaseAsset(id: string, force = false): boolean {
    const asset = this.assets.get(id);
    if (!asset) return false;

    if (asset.state === "ACTIVE" && !force) {
      return false; // Cannot release active asset without force
    }

    asset.loadedPayload = undefined;
    this.setState(asset, "RELEASED", null);
    return true;
  }

  /**
   * Create an AssetContainer representing grouped dependencies (Character, Creature, Environment, Map).
   */
  public createContainer(container: {
    id: string;
    name: string;
    type: AssetContainerType;
    primaryAssetId: string;
    extraAssetIds?: string[];
    preloadGroup?: PreloadGroupId | null;
  }): AssetContainer {
    const primary = this.assets.get(container.primaryAssetId);
    const included = new Set<string>();

    if (primary) {
      included.add(primary.id);
      primary.dependencies.forEach((d) => included.add(d));
    }

    if (container.extraAssetIds) {
      container.extraAssetIds.forEach((id) => included.add(id));
    }

    const c: AssetContainer = {
      id: container.id,
      name: container.name,
      type: container.type,
      primaryAssetId: container.primaryAssetId,
      includedAssetIds: Array.from(included),
      preloadGroup: container.preloadGroup || null,
      state: "COLD",
    };

    this.containers.set(c.id, c);
    return c;
  }

  public getContainer(id: string): AssetContainer | undefined {
    return this.containers.get(id);
  }

  /**
   * Warms (preloads) all assets in a container.
   */
  public async warmContainer(containerId: string): Promise<AssetContainer> {
    const container = this.containers.get(containerId);
    if (!container) {
      throw new Error(`[RuntimeAssetManager] Container ${containerId} not found.`);
    }

    try {
      await Promise.all(container.includedAssetIds.map((id) => this.loadAsset(id)));
      container.state = "WARM";
      return container;
    } catch (err) {
      container.state = "ERROR";
      throw err;
    }
  }

  /**
   * Activates a container and marks its assets as ACTIVE.
   */
  public async activateContainer(containerId: string): Promise<AssetContainer> {
    const container = await this.warmContainer(containerId);
    container.includedAssetIds.forEach((id) => this.activateAsset(id));
    container.state = "ACTIVE";
    return container;
  }

  /**
   * Preload an entire PreloadGroup (e.g. Core, Town_A, Combat_Common).
   */
  public async preloadGroup(groupId: PreloadGroupId): Promise<RuntimeAssetRecord[]> {
    const assetIds = this.preloadGroups.get(groupId);
    if (!assetIds || assetIds.size === 0) {
      return [];
    }

    return Promise.all(Array.from(assetIds).map((id) => this.loadAsset(id)));
  }

  /**
   * Contextual Transition Handler:
   * 1. Inspects destination requirements.
   * 2. Preloads critical dependencies.
   * 3. Confirms readiness.
   * 4. Deactivates and optionally releases unused cold assets.
   */
  public async handleMapTransition(options: {
    destinationMapContainerId: string;
    keepResidentContainerIds?: string[];
    releaseColdAssets?: boolean;
  }): Promise<{ ready: boolean; activeContainer: AssetContainer }> {
    const dest = await this.activateContainer(options.destinationMapContainerId);

    const keepIds = new Set(options.keepResidentContainerIds || []);
    keepIds.add(options.destinationMapContainerId);

    // Deactivate containers no longer active
    for (const [cId, container] of this.containers.entries()) {
      if (!keepIds.has(cId) && container.state === "ACTIVE") {
        container.state = "WARM";
        container.includedAssetIds.forEach((id) => this.deactivateAsset(id));

        if (options.releaseColdAssets) {
          container.includedAssetIds.forEach((id) => {
            const asset = this.assets.get(id);
            if (asset && asset.state === "CACHED" && asset.dependents.every((dep) => !keepIds.has(dep))) {
              this.releaseAsset(id);
            }
          });
          container.state = "COLD";
        }
      }
    }

    return {
      ready: true,
      activeContainer: dest,
    };
  }

  /**
   * Diagnostics & Health analysis
   */
  public getDiagnostics(): RuntimeAssetDiagnostics {
    const stateCounts: Record<AssetLifecycleState, number> = {
      UNREGISTERED: 0,
      DISCOVERED: 0,
      QUEUED: 0,
      LOADING: 0,
      READY: 0,
      ACTIVE: 0,
      CACHED: 0,
      RELEASED: 0,
      ERROR: 0,
    };

    const missingDependencies: Array<{ assetId: string; missingId: string }> = [];
    const failedLoads: Array<{ assetId: string; error: string }> = [];
    const unusedLoadedAssets: string[] = [];
    let estimatedMemoryBytes = 0;

    for (const asset of this.assets.values()) {
      stateCounts[asset.state] = (stateCounts[asset.state] || 0) + 1;

      if (asset.state === "READY" || asset.state === "ACTIVE" || asset.state === "CACHED") {
        estimatedMemoryBytes += asset.fileSize || 1024 * 10; // Fallback 10KB
      }

      if (asset.state === "READY" && asset.dependents.length === 0) {
        unusedLoadedAssets.push(asset.id);
      }

      if (asset.state === "ERROR" && asset.error) {
        failedLoads.push({ assetId: asset.id, error: asset.error });
      }

      for (const depId of asset.dependencies) {
        if (!this.assets.has(depId)) {
          missingDependencies.push({ assetId: asset.id, missingId: depId });
        }
      }
    }

    let activeContainers = 0;
    for (const container of this.containers.values()) {
      if (container.state === "ACTIVE") {
        activeContainers++;
      }
    }

    return {
      totalRegistered: this.assets.size,
      stateCounts,
      activeContainers,
      missingDependencies,
      failedLoads,
      unusedLoadedAssets,
      estimatedMemoryBytes,
    };
  }
}
