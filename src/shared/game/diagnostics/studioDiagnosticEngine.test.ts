import { describe, expect, it } from 'vitest';
import { StudioDiagnosticEngine } from './studioDiagnosticEngine';

describe('Comprehensive Master Studio Orchestration & Diagnostic Hub Engine (Phase 32)', () => {
  it('evaluates clean baseline system metrics as 100% HEALTHY with zero issues', () => {
    const engine = new StudioDiagnosticEngine();
    const report = engine.runDiagnostics();

    expect(report.overallHealthScore).toBe(100);
    expect(report.status).toBe('HEALTHY');
    expect(report.issues).toHaveLength(0);
    expect(report.subsystems.DEPENDENCY_GRAPH.status).toBe('HEALTHY');
    expect(report.subsystems.WORLD_ATLAS.status).toBe('HEALTHY');
    expect(report.subsystems.ECONOMY_STABILIZER.status).toBe('HEALTHY');
  });

  it('detects unindexed chunks and moderate inflation, flagging DEGRADED warnings and remediation hints', () => {
    const engine = new StudioDiagnosticEngine();
    const report = engine.runDiagnostics({
      unindexedChunksCount: 3,
      inflationRatio: 2.2,
    });

    expect(report.status).toBe('DEGRADED');
    expect(report.overallHealthScore).toBeLessThan(100);
    expect(report.issues.length).toBeGreaterThanOrEqual(2);

    const atlasIssue = report.issues.find((i) => i.subsystem === 'WORLD_ATLAS');
    expect(atlasIssue).toBeDefined();
    expect(atlasIssue?.severity).toBe('WARNING');
    expect(atlasIssue?.remediationHint).toContain('WorldAtlasStreamingEngine');
  });

  it('detects broken dependency refs and elevated latency, flagging CRITICAL errors and remediation guidance', () => {
    const engine = new StudioDiagnosticEngine();
    const report = engine.runDiagnostics({
      missingRefsCount: 2,
      socketShardLatencyMs: 300,
    });

    expect(report.status).toBe('CRITICAL');
    expect(report.subsystems.DEPENDENCY_GRAPH.status).toBe('CRITICAL');
    expect(report.subsystems.MMO_REALTIME.status).toBe('CRITICAL');

    const depIssue = report.issues.find((i) => i.subsystem === 'DEPENDENCY_GRAPH');
    expect(depIssue?.severity).toBe('ERROR');
    expect(depIssue?.remediationHint).toContain('ProjectValidator');
  });
});
