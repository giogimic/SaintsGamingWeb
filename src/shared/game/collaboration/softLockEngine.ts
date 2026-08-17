/**
 * Saints Gaming — Studio SoftLock & Collaborative Presence Engine (Bible 32 §1)
 * Coordinates author locks on game resources, heartbeat expiries, and team presence.
 */

import { CanonicalResourceRef } from '../studioGlossary';

export interface SoftLock {
  resource: CanonicalResourceRef;
  userId: string;
  displayName: string;
  at: string;
  expiresAt: string;
}

export interface StudioPresenceMember {
  userId: string;
  displayName: string;
  gameId: string;
  activeDockId?: string;
  lastHeartbeat: string;
}

export class SoftLockManager {
  private locks: Map<string, SoftLock> = new Map();
  private presence: Map<string, StudioPresenceMember> = new Map();
  private lockTtlMs: number = 90000; // 90 second default expiry (Bible 32 §1.1)

  private getLockKey(res: CanonicalResourceRef): string {
    return `${res.type}:${res.id.toLowerCase()}`;
  }

  acquireLock(res: CanonicalResourceRef, userId: string, displayName: string): { success: boolean; currentLock?: SoftLock } {
    const key = this.getLockKey(res);
    const existing = this.locks.get(key);
    const now = Date.now();

    if (existing && new Date(existing.expiresAt).getTime() > now) {
      if (existing.userId === userId) {
        // Refresh lock
        existing.expiresAt = new Date(now + this.lockTtlMs).toISOString();
        return { success: true, currentLock: existing };
      }
      return { success: false, currentLock: existing };
    }

    const newLock: SoftLock = {
      resource: res,
      userId,
      displayName,
      at: new Date(now).toISOString(),
      expiresAt: new Date(now + this.lockTtlMs).toISOString(),
    };

    this.locks.set(key, newLock);
    return { success: true, currentLock: newLock };
  }

  releaseLock(res: CanonicalResourceRef, userId: string): boolean {
    const key = this.getLockKey(res);
    const existing = this.locks.get(key);
    if (!existing) return false;

    if (existing.userId === userId) {
      this.locks.delete(key);
      return true;
    }
    return false;
  }

  forceTakeover(res: CanonicalResourceRef, userId: string, displayName: string): SoftLock {
    const key = this.getLockKey(res);
    const now = Date.now();
    const newLock: SoftLock = {
      resource: res,
      userId,
      displayName,
      at: new Date(now).toISOString(),
      expiresAt: new Date(now + this.lockTtlMs).toISOString(),
    };
    this.locks.set(key, newLock);
    return newLock;
  }

  getLock(res: CanonicalResourceRef): SoftLock | null {
    const key = this.getLockKey(res);
    const existing = this.locks.get(key);
    if (!existing) return null;

    if (new Date(existing.expiresAt).getTime() <= Date.now()) {
      this.locks.delete(key);
      return null;
    }
    return existing;
  }

  updatePresence(member: StudioPresenceMember): void {
    this.presence.set(member.userId, {
      ...member,
      lastHeartbeat: new Date().toISOString(),
    });
  }

  getProjectPresence(gameId: string): StudioPresenceMember[] {
    const now = Date.now();
    const active: StudioPresenceMember[] = [];

    for (const [_, member] of this.presence.entries()) {
      if (member.gameId === gameId && now - new Date(member.lastHeartbeat).getTime() < 120000) {
        active.push(member);
      }
    }
    return active;
  }
}

export const softLockManager = new SoftLockManager();
