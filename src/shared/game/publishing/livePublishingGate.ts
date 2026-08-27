/**
 * Saints Gaming — Live Publishing Gate Engine (Studio Master Plan Phase 8)
 * Authoritative release gate validating graph consistency before deploying definitions to live game servers.
 */

import { BaseEntityDefinition } from '../entities/types';
import { computeContentHash } from '../collaboration/optimisticLockEngine';

export interface PublishValidationIssue {
  code: string;
  message: string;
  entityId?: string;
  isBlocking: boolean;
}

export interface PublishManifest {
  manifestId: string;
  targetId: string;
  targetType: string;
  versionHash: string;
  publishedBy: string;
  publishedAt: string;
  dependencyCount: number;
}

export interface PublishGateResult {
  eligible: boolean;
  issues: PublishValidationIssue[];
  manifest?: PublishManifest;
}

/**
 * Evaluates whether an entity or map meets all publishing criteria.
 */
export function validateForPublishing(
  target: BaseEntityDefinition,
  allEntities: BaseEntityDefinition[],
  knownValidAssetIds: Set<string>,
  userId: string = 'system'
): PublishGateResult {
  const issues: PublishValidationIssue[] = [];

  // Rule 1: Identification
  if (!target.id || target.id.trim() === '') {
    issues.push({
      code: 'MISSING_ID',
      message: 'Entity must possess a valid, non-empty identifier.',
      isBlocking: true,
    });
  }

  if (!target.name || target.name.trim() === '') {
    issues.push({
      code: 'MISSING_NAME',
      message: 'Entity must have a human-readable display name.',
      isBlocking: true,
    });
  }

  // Rule 2: Asset and reference resolution
  if (target.assetReferences) {
    for (const refId of target.assetReferences) {
      const isEntity = allEntities.some((e) => e.id === refId);
      const isAsset = knownValidAssetIds.has(refId);

      if (!isEntity && !isAsset) {
        issues.push({
          code: 'UNRESOLVED_REFERENCE',
          message: `Referenced dependency "${refId}" could not be found in active entity or asset catalogs.`,
          entityId: refId,
          isBlocking: true,
        });
      }
    }
  }

  // Rule 3: Component integrity
  if (target.type === 'monster' && target.components) {
    if (typeof (target.components as any).hp === 'number' && (target.components as any).hp <= 0) {
      issues.push({
        code: 'INVALID_STATS',
        message: 'Monster health must be greater than zero.',
        isBlocking: true,
      });
    }
  }

  const isEligible = issues.every((i) => !i.isBlocking);

  let manifest: PublishManifest | undefined;
  if (isEligible) {
    manifest = {
      manifestId: `pub_${target.id}_${Date.now()}`,
      targetId: target.id,
      targetType: target.type,
      versionHash: computeContentHash(target),
      publishedBy: userId,
      publishedAt: new Date().toISOString(),
      dependencyCount: target.assetReferences ? target.assetReferences.length : 0,
    };
  }

  return {
    eligible: isEligible,
    issues,
    manifest,
  };
}
