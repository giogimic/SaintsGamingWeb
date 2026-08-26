/**
 * Saints Gaming — Global Project Validation Registry (Studio Master Plan Phase 1D)
 *
 * Extensible validation system that aggregates domain validators across:
 * - Assets (missing files, incompatible profiles)
 * - Quests (missing objectives, broken rewards)
 * - Gameplay/Abilities (missing status effects, illegal configurations)
 * - Graph (dangling references, orphaned definitions)
 * - Maps (broken warps, logic errors)
 */

import { ProjectDependencyGraph } from '../graph/dependencyGraph';
import { validateGameplayIntegrity } from './gameplayValidator';
import { lintWorldAtlasConnectivity, MapDataSummary } from '../atlas/atlasLinter';
import { AtlasGridData } from '../atlas/spatialAtlas';

export type ValidationSeverity = 'ERROR' | 'WARNING' | 'INFO';

export interface ValidationIssue {
  code: string;
  category: 'ASSET' | 'QUEST' | 'GAMEPLAY' | 'MAP' | 'GRAPH' | 'ECONOMY' | 'GENERAL';
  severity: ValidationSeverity;
  message: string;
  entityId?: string;
  entityType?: string;
  suggestedAction?: string;
}

export interface ProjectHealthReport {
  isValid: boolean;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  issues: ValidationIssue[];
  timestamp: Date;
}

export type DomainValidatorFn = (
  graph?: ProjectDependencyGraph,
  context?: { maps?: MapDataSummary[]; atlas?: AtlasGridData }
) => Promise<ValidationIssue[]> | ValidationIssue[];

export class ProjectValidationRegistry {
  private static instance: ProjectValidationRegistry;
  private validators: Map<string, { category: ValidationIssue['category']; fn: DomainValidatorFn }> = new Map();

  constructor() {
    this.registerBuiltinValidators();
  }

  public static getInstance(): ProjectValidationRegistry {
    if (!ProjectValidationRegistry.instance) {
      ProjectValidationRegistry.instance = new ProjectValidationRegistry();
    }
    return ProjectValidationRegistry.instance;
  }

  public registerValidator(
    id: string,
    category: ValidationIssue['category'],
    fn: DomainValidatorFn
  ): void {
    this.validators.set(id, { category, fn });
  }

  public removeValidator(id: string): void {
    this.validators.delete(id);
  }

  private registerBuiltinValidators(): void {
    // 1. Gameplay integrity validator
    this.registerValidator('gameplay_integrity', 'GAMEPLAY', () => {
      const res = validateGameplayIntegrity();
      const issues: ValidationIssue[] = [];

      for (const err of res.errors) {
        issues.push({
          code: err.code,
          category: 'GAMEPLAY',
          severity: 'ERROR',
          message: err.message,
          entityId: err.entityId,
          suggestedAction: 'Check ability or status definitions in combat registry.',
        });
      }

      for (const warn of res.warnings) {
        issues.push({
          code: warn.code,
          category: 'GAMEPLAY',
          severity: 'WARNING',
          message: warn.message,
          suggestedAction: 'Review skill guide count.',
        });
      }

      return issues;
    });

    // 2. Dependency graph broken references validator
    this.registerValidator('graph_broken_references', 'GRAPH', (graph) => {
      if (!graph) return [];
      const broken = graph.detectBrokenReferences();
      return broken.map((b) => ({
        code: 'ERR_BROKEN_DEPENDENCY',
        category: 'GRAPH',
        severity: 'ERROR',
        message: `${b.sourceType} "${b.sourceId}" references missing ${b.targetType} "${b.targetId}" via '${b.relation}'.`,
        entityId: b.sourceId,
        entityType: b.sourceType,
        suggestedAction: `Restore missing entity "${b.targetId}" or update reference.`,
      }));
    });

    // 3. Atlas connectivity & Gate integrity validator
    this.registerValidator('atlas_connectivity', 'MAP', (_graph, context) => {
      if (!context?.maps || context.maps.length === 0) return [];
      const lintRes = lintWorldAtlasConnectivity(context.maps, context.atlas);
      const issues: ValidationIssue[] = [];

      for (const err of lintRes.errors) {
        issues.push({
          code: err.code,
          category: 'MAP',
          severity: 'ERROR',
          message: err.message,
          entityId: err.sourceMapId,
          suggestedAction: 'Inspect map gate coordinates and destination map IDs in Atlas Studio.',
        });
      }

      for (const warn of lintRes.warnings) {
        issues.push({
          code: warn.code,
          category: 'MAP',
          severity: 'WARNING',
          message: warn.message,
          entityId: warn.sourceMapId,
          suggestedAction: 'Consider adding a return gate or verifying intended one-way traversal.',
        });
      }

      return issues;
    });
  }

  /**
   * Runs all registered validators and compiles an actionable ProjectHealthReport.
   */
  public async validateProject(
    graph?: ProjectDependencyGraph,
    context?: { maps?: MapDataSummary[]; atlas?: AtlasGridData }
  ): Promise<ProjectHealthReport> {
    const allIssues: ValidationIssue[] = [];

    for (const [, { fn }] of this.validators.entries()) {
      try {
        const issues = await fn(graph, context);
        allIssues.push(...issues);
      } catch (err: any) {
        allIssues.push({
          code: 'ERR_VALIDATOR_EXCEPTION',
          category: 'GENERAL',
          severity: 'ERROR',
          message: `Validator threw error: ${err.message || String(err)}`,
        });
      }
    }

    const errorCount = allIssues.filter((i) => i.severity === 'ERROR').length;
    const warningCount = allIssues.filter((i) => i.severity === 'WARNING').length;
    const infoCount = allIssues.filter((i) => i.severity === 'INFO').length;

    return {
      isValid: errorCount === 0,
      errorCount,
      warningCount,
      infoCount,
      issues: allIssues,
      timestamp: new Date(),
    };
  }
}
