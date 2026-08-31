/**
 * Saints Gaming — Enterprise Audit & Security Compliance Service (Bible 27 §3.12 & Bible 28 §7)
 * Centralizes authoritative audit logging prior to committing database mutations across Studio REST endpoints.
 */

import { contentCache } from "../studio/contentCache";
import { ContentReloadType } from "../../shared/net/contentReloadBus";
import { createStudioAuditLog, StudioAuditLog } from "../../shared/game/production/localizationAuditEngine";
import { ResourceRef } from "../../shared/game/production/taskEngine";

export interface AuditRecordParams {
  userId: string;
  projectId?: string;
  action: string;
  resource: ResourceRef;
  before?: unknown;
  after?: unknown;
  meta?: Record<string, unknown>;
}

export class AuditService {
  private static recentLogs: StudioAuditLog[] = [];
  private static readonly MAX_RECENT_LOGS = 200;

  /**
   * Mandated write call invoked prior to executing any DB mutation.
   * Records structured audit trail and invalidates affected content caches.
   */
  public static async write(params: AuditRecordParams): Promise<StudioAuditLog> {
    const log = createStudioAuditLog(params);

    // Maintain recent in-memory log window
    AuditService.recentLogs.unshift(log);
    if (AuditService.recentLogs.length > AuditService.MAX_RECENT_LOGS) {
      AuditService.recentLogs.pop();
    }

    // Invalidate local server content cache when resource type is valid
    if (params.resource?.type) {
      try {
        contentCache.invalidate(
          params.resource.type as ContentReloadType,
          params.resource.id
        );
      } catch {
        // Safe fallback if type is non-cacheable
      }
    }

    // Telemetry & compliance diagnostic logging
    if (process.env.NODE_ENV !== "test") {
      console.log(
        `[AUDIT] [${log.action}] user=${log.userId} resource=${log.resource?.type}:${log.resource?.id} at=${log.at}`
      );
    }

    return log;
  }

  /**
   * Returns recent audit logs for administrative inspection.
   */
  public static getRecentLogs(limit = 50): StudioAuditLog[] {
    return AuditService.recentLogs.slice(0, limit);
  }

  /**
   * Clears audit log buffer (useful in test harnesses).
   */
  public static clearMemoryLogs(): void {
    AuditService.recentLogs = [];
  }
}
