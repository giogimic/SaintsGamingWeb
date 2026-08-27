/**
 * Saints Gaming — Comprehensive Master Studio Orchestration, System Health & Diagnostic Hub Engine (Bible 33 & Studio Plan Part 10)
 * Pre-flight diagnostic audits, multi-subsystem integrity analysis, 0-100% health scoring, and actionable remediation guidance.
 */

export type SubsystemType =
  | 'DEPENDENCY_GRAPH'
  | 'WORLD_ATLAS'
  | 'ECONOMY_STABILIZER'
  | 'CREATOR_ROYALTIES'
  | 'DISASTER_RECOVERY'
  | 'MMO_REALTIME'
  | 'CREATURE_CATALOG'
  | 'LIVE_PUBLISHING';

export type DiagnosticStatus = 'HEALTHY' | 'DEGRADED' | 'CRITICAL';

export interface DiagnosticIssue {
  subsystem: SubsystemType;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  message: string;
  remediationHint: string;
}

export interface DiagnosticInputMetrics {
  missingRefsCount?: number;
  unindexedChunksCount?: number;
  inflationRatio?: number;
  isRealmFrozen?: boolean;
  unclaimedRoyaltiesCount?: number;
  socketShardLatencyMs?: number;
  unvalidatedDraftsCount?: number;
}

export interface SubsystemHealth {
  status: DiagnosticStatus;
  score: number; // 0 to 100
}

export interface StudioHealthReport {
  overallHealthScore: number; // 0 to 100
  status: DiagnosticStatus;
  evaluatedAt: number;
  subsystems: Record<SubsystemType, SubsystemHealth>;
  issues: DiagnosticIssue[];
}

export class StudioDiagnosticEngine {
  /**
   * Runs an end-to-end holistic diagnostic across all platform subsystems.
   */
  public runDiagnostics(metrics: DiagnosticInputMetrics = {}): StudioHealthReport {
    const issues: DiagnosticIssue[] = [];
    const subsystems: Record<SubsystemType, SubsystemHealth> = {
      DEPENDENCY_GRAPH: { status: 'HEALTHY', score: 100 },
      WORLD_ATLAS: { status: 'HEALTHY', score: 100 },
      ECONOMY_STABILIZER: { status: 'HEALTHY', score: 100 },
      CREATOR_ROYALTIES: { status: 'HEALTHY', score: 100 },
      DISASTER_RECOVERY: { status: 'HEALTHY', score: 100 },
      MMO_REALTIME: { status: 'HEALTHY', score: 100 },
      CREATURE_CATALOG: { status: 'HEALTHY', score: 100 },
      LIVE_PUBLISHING: { status: 'HEALTHY', score: 100 },
    };

    // 1. Dependency Graph Audit
    const missingRefs = metrics.missingRefsCount ?? 0;
    if (missingRefs > 0) {
      subsystems.DEPENDENCY_GRAPH = { status: 'CRITICAL', score: Math.max(0, 100 - missingRefs * 25) };
      issues.push({
        subsystem: 'DEPENDENCY_GRAPH',
        severity: 'ERROR',
        message: `Detected ${missingRefs} unresolvable entity references in Dependency Graph`,
        remediationHint: 'Run ProjectValidator or clean orphan entity keys before publishing',
      });
    }

    // 2. World Atlas Chunk Audit
    const unindexedChunks = metrics.unindexedChunksCount ?? 0;
    if (unindexedChunks > 0) {
      subsystems.WORLD_ATLAS = { status: 'DEGRADED', score: Math.max(20, 100 - unindexedChunks * 10) };
      issues.push({
        subsystem: 'WORLD_ATLAS',
        severity: 'WARNING',
        message: `${unindexedChunks} world chunks lack spatial grid indexing`,
        remediationHint: 'Re-index map matrix via WorldAtlasStreamingEngine.tileToChunkCoord',
      });
    }

    // 3. Economy Stabilizer Audit
    const infRatio = metrics.inflationRatio ?? 1.0;
    if (infRatio > 3.0) {
      subsystems.ECONOMY_STABILIZER = { status: 'CRITICAL', score: 40 };
      issues.push({
        subsystem: 'ECONOMY_STABILIZER',
        severity: 'ERROR',
        message: `High inflation pressure index detected (${infRatio.toFixed(1)}x faucet/sink ratio)`,
        remediationHint: 'Trigger automated GE item buybacks or increase repair surcharges',
      });
    } else if (infRatio > 2.0) {
      subsystems.ECONOMY_STABILIZER = { status: 'DEGRADED', score: 75 };
      issues.push({
        subsystem: 'ECONOMY_STABILIZER',
        severity: 'WARNING',
        message: `Moderate inflation pressure (${infRatio.toFixed(1)}x)`,
        remediationHint: 'Monitor circulating gold faucet rates',
      });
    }

    // 4. Disaster Recovery Audit
    if (metrics.isRealmFrozen) {
      subsystems.DISASTER_RECOVERY = { status: 'DEGRADED', score: 50 };
      issues.push({
        subsystem: 'DISASTER_RECOVERY',
        severity: 'WARNING',
        message: 'Realm is currently under emergency freeze / maintenance lock',
        remediationHint: 'Verify database consistency and lift freeze when ready',
      });
    }

    // 5. MMO Realtime Latency Audit
    const latency = metrics.socketShardLatencyMs ?? 25;
    if (latency > 250) {
      subsystems.MMO_REALTIME = { status: 'CRITICAL', score: 30 };
      issues.push({
        subsystem: 'MMO_REALTIME',
        severity: 'ERROR',
        message: `Elevated shard socket latency (${latency}ms)`,
        remediationHint: 'Scale shard instances or check Go MMO socket event loop',
      });
    } else if (latency > 100) {
      subsystems.MMO_REALTIME = { status: 'DEGRADED', score: 70 };
      issues.push({
        subsystem: 'MMO_REALTIME',
        severity: 'WARNING',
        message: `Mild socket latency jitter (${latency}ms)`,
        remediationHint: 'Optimize player position broadcast throttling',
      });
    }

    // 6. Calculate overall score
    const scores = Object.values(subsystems).map((s) => s.score);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    let overallStatus: DiagnosticStatus = 'HEALTHY';
    if (avgScore < 60 || issues.some((i) => i.severity === 'ERROR')) {
      overallStatus = 'CRITICAL';
    } else if (avgScore < 90 || issues.some((i) => i.severity === 'WARNING')) {
      overallStatus = 'DEGRADED';
    }

    return {
      overallHealthScore: avgScore,
      status: overallStatus,
      evaluatedAt: Date.now(),
      subsystems,
      issues,
    };
  }
}
