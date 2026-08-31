/**
 * Saints Gaming — Studio Backend Audit & Publish Services (Bible 28 §7)
 * Consolidates server-side mutating actions, transaction recording, and content publishing pipelines.
 */

import { contentCache } from './contentCache';
import { emitContentReload, ContentReloadType } from '../../shared/net/contentReloadBus';
import { createContentRevision, publishRevision, ContentStatus } from '../../shared/game/publishing/revisionStore';
import { createStudioAuditLog, StudioAuditLog } from '../../shared/game/production/localizationAuditEngine';
import { ResourceRef } from '../../shared/game/production/taskEngine';

import { AuditService, AuditRecordParams } from '../audit/AuditService';
export { AuditService, type AuditRecordParams };

export class StudioAuditService {
  /**
   * Records a mutating studio action in memory/logs and invalidates content caches.
   */
  public static async recordMutation(params: AuditRecordParams): Promise<StudioAuditLog> {
    return AuditService.write(params);
  }
}


export interface PublishParams<T = unknown> {
  resourceType: 'map' | 'loot' | 'quest' | 'item' | 'dialogue' | 'creature' | 'ability' | 'class';
  resourceId: string;
  payload: T;
  authorId: string;
  currentLiveVersion?: number;
  message?: string;
  broadcaster?: { emit: (event: string, data: any) => void };
}

export class StudioPublishService {
  /**
   * Handles draft snapshotting, promotion to live version, and real-time broadcast.
   */
  public static async publishContent<T>(params: PublishParams<T>) {
    const draft = createContentRevision({
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      version: (params.currentLiveVersion || 0) + 1,
      payload: params.payload,
      authorId: params.authorId,
      message: params.message || 'Studio content publish',
    });

    const result = publishRevision(draft, params.currentLiveVersion || 0);

    if (result.success && result.publishedRevision) {
      // Record audit entry
      await StudioAuditService.recordMutation({
        userId: params.authorId,
        action: `${params.resourceType}.publish`,
        resource: { type: params.resourceType, id: params.resourceId },
        after: { version: result.publishedRevision.version },
      });

      // Emit content reload if broadcaster is provided
      if (params.broadcaster) {
        emitContentReload(params.broadcaster, {
          type: params.resourceType as ContentReloadType,
          id: params.resourceId,
          version: result.publishedRevision.version,
          authorId: params.authorId,
        });
      }
    }

    return result;
  }
}
