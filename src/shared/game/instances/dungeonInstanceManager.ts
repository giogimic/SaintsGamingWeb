/**
 * Saints Gaming — Dungeon Instance Manager (Studio Master Plan Phase 4)
 * Authoritative lifecycle & state management for party-instanced dungeons.
 */

export interface DungeonObjectiveState {
  key: string;
  label: string;
  current: number;
  required: number;
  isCompleted: boolean;
}

export interface DungeonInstance {
  instanceId: string;
  dungeonSlug: string;
  baseMapId: string;
  partyId: string;
  leaderId: string;
  partyMembers: string[];
  createdAt: number;
  expiresAt: number;
  isCompleted: boolean;
  clearedAt?: number;
  objectives: Record<string, DungeonObjectiveState>;
}

export interface CreateDungeonInstanceOptions {
  dungeonSlug: string;
  baseMapId: string;
  partyId: string;
  leaderId: string;
  partyMembers: string[];
  durationMinutes?: number;
  objectives?: Array<{ key: string; label?: string; required: number }>;
}

export class DungeonInstanceManager {
  private instances = new Map<string, DungeonInstance>();

  /**
   * Generates a unique instance room identifier.
   */
  public generateInstanceId(dungeonSlug: string, partyId: string): string {
    const timestamp = Date.now();
    return `dungeon_${dungeonSlug}_${partyId}_${timestamp}`;
  }

  /**
   * Allocates a new isolated dungeon instance.
   */
  public createInstance(options: CreateDungeonInstanceOptions): DungeonInstance {
    const instanceId = this.generateInstanceId(options.dungeonSlug, options.partyId);
    const now = Date.now();
    const durationMs = (options.durationMinutes || 60) * 60 * 1000;

    const objectivesRecord: Record<string, DungeonObjectiveState> = {};
    if (options.objectives) {
      for (const obj of options.objectives) {
        objectivesRecord[obj.key] = {
          key: obj.key,
          label: obj.label || obj.key,
          current: 0,
          required: obj.required,
          isCompleted: obj.required <= 0,
        };
      }
    }

    const instance: DungeonInstance = {
      instanceId,
      dungeonSlug: options.dungeonSlug,
      baseMapId: options.baseMapId,
      partyId: options.partyId,
      leaderId: options.leaderId,
      partyMembers: [...options.partyMembers],
      createdAt: now,
      expiresAt: now + durationMs,
      isCompleted: false,
      objectives: objectivesRecord,
    };

    this.instances.set(instanceId, instance);
    return instance;
  }

  /**
   * Retrieves an active dungeon instance by ID.
   */
  public getInstance(instanceId: string): DungeonInstance | null {
    const inst = this.instances.get(instanceId);
    if (!inst) return null;
    if (Date.now() > inst.expiresAt) {
      this.instances.delete(instanceId);
      return null;
    }
    return inst;
  }

  /**
   * Checks if an instance ID matches the dungeon instance format.
   */
  public isDungeonInstance(instanceId: string | null | undefined): boolean {
    if (!instanceId) return false;
    return instanceId.startsWith('dungeon_');
  }

  /**
   * Checks whether a given user is allowed into the dungeon instance.
   */
  public isPartyMember(instanceId: string, userId: string): boolean {
    const inst = this.getInstance(instanceId);
    if (!inst) return false;
    return inst.partyMembers.includes(userId) || inst.leaderId === userId;
  }

  /**
   * Updates progress for a specific dungeon objective.
   */
  public updateObjective(instanceId: string, objectiveKey: string, delta: number): boolean {
    const inst = this.getInstance(instanceId);
    if (!inst || inst.isCompleted) return false;

    const obj = inst.objectives[objectiveKey];
    if (!obj) return false;

    obj.current = Math.min(obj.required, Math.max(0, obj.current + delta));
    obj.isCompleted = obj.current >= obj.required;

    // Check if all objectives are completed
    this.checkCompletion(instanceId);
    return true;
  }

  /**
   * Evaluates if all objectives in the dungeon instance are completed.
   */
  public checkCompletion(instanceId: string): boolean {
    const inst = this.getInstance(instanceId);
    if (!inst) return false;

    const allObjectives = Object.values(inst.objectives);
    if (allObjectives.length === 0) return false;

    const allDone = allObjectives.every((o) => o.isCompleted);
    if (allDone && !inst.isCompleted) {
      inst.isCompleted = true;
      inst.clearedAt = Date.now();
    }
    return inst.isCompleted;
  }

  /**
   * Manually marks an instance as complete.
   */
  public completeInstance(instanceId: string): boolean {
    const inst = this.getInstance(instanceId);
    if (!inst) return false;
    inst.isCompleted = true;
    inst.clearedAt = Date.now();
    return true;
  }

  /**
   * Prunes all expired dungeon instances from memory.
   */
  public pruneExpired(nowMs: number = Date.now()): number {
    let prunedCount = 0;
    for (const [id, inst] of this.instances.entries()) {
      if (nowMs > inst.expiresAt) {
        this.instances.delete(id);
        prunedCount++;
      }
    }
    return prunedCount;
  }

  /**
   * Clears all instances (e.g. on server reset or test teardown).
   */
  public clearAll(): void {
    this.instances.clear();
  }
}

export const globalDungeonInstanceManager = new DungeonInstanceManager();
