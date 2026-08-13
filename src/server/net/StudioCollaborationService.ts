/**
 * Saints Gaming — Authoritative Studio Collaboration Service
 *
 * Handles live multi-user map authoring, revision incrementing,
 * soft resource locks with TTL expiration, and canonical tile change broadcasts.
 */

import type { StudioSoftLock, StudioTileChangeOp, TileChangedBroadcast } from "../../shared/net/protocol";

export class StudioCollaborationService {
  /** Map of resourceKey -> StudioSoftLock */
  private locks = new Map<string, StudioSoftLock>();
  /** Map of mapId -> current authoritative revision */
  private mapRevisions = new Map<string, number>();

  public acquireLock(lock: StudioSoftLock): { success: boolean; activeLock: StudioSoftLock } {
    const existing = this.locks.get(lock.resource);
    const now = new Date().toISOString();

    // Check if an existing unexpired lock is held by someone else
    if (existing && existing.userId !== lock.userId && existing.expiresAt > now) {
      return { success: false, activeLock: existing };
    }

    // Default TTL: 60 seconds from now
    const expiresAt = lock.expiresAt || new Date(Date.now() + 60000).toISOString();
    const updatedLock: StudioSoftLock = {
      ...lock,
      at: lock.at || now,
      expiresAt,
    };

    this.locks.set(lock.resource, updatedLock);
    return { success: true, activeLock: updatedLock };
  }

  public releaseLock(resource: string, userId: string): boolean {
    const existing = this.locks.get(resource);
    if (!existing) return true;
    // Only the lock owner (or if expired) can release it
    if (existing.userId === userId || existing.expiresAt <= new Date().toISOString()) {
      this.locks.delete(resource);
      return true;
    }
    return false;
  }

  public cleanExpiredLocks(): string[] {
    const now = new Date().toISOString();
    const expired: string[] = [];
    for (const [res, lock] of this.locks.entries()) {
      if (lock.expiresAt < now) {
        this.locks.delete(res);
        expired.push(res);
      }
    }
    return expired;
  }

  public getAllLocks(): Record<string, StudioSoftLock> {
    const now = new Date().toISOString();
    const active: Record<string, StudioSoftLock> = {};
    for (const [res, lock] of this.locks.entries()) {
      if (lock.expiresAt >= now) {
        active[res] = lock;
      }
    }
    return active;
  }

  public applyTileChanges(
    mapId: string,
    ops: StudioTileChangeOp[],
    authorId: string,
    authorName: string
  ): TileChangedBroadcast {
    const currentRev = this.mapRevisions.get(mapId) || 1;
    const nextRev = currentRev + 1;
    this.mapRevisions.set(mapId, nextRev);

    return {
      mapId,
      revision: nextRev,
      ops,
      authorId,
      authorName,
      timestamp: Date.now(),
    };
  }

  public getRevision(mapId: string): number {
    return this.mapRevisions.get(mapId) || 1;
  }
}
