/**
 * Saints Gaming — Cross-System Dependency Impact Analysis Engine (Studio Master Plan Phase 8)
 * Evaluates the blast radius of entity/asset deletions across maps, quests, loot tables, and NPCs.
 */

import { BaseEntityDefinition } from '../entities/types';

export interface DependentReference {
  dependentId: string;
  dependentName: string;
  dependentType: string;
  isPublished: boolean;
  severity: 'BLOCKING' | 'WARNING';
  reason: string;
}

export interface ImpactAnalysisResult {
  targetEntityId: string;
  canDeleteSafely: boolean;
  totalDependents: number;
  blockingCount: number;
  warningCount: number;
  dependents: DependentReference[];
}

/**
 * Analyzes the downstream impact of deleting an entity or asset.
 */
export function analyzeDeletionImpact(
  targetEntityId: string,
  entities: BaseEntityDefinition[],
  maps?: Array<{ id: string; name: string; isPublished?: boolean; spawns?: Array<{ entityId?: string; npcId?: string }> }>
): ImpactAnalysisResult {
  const dependents: DependentReference[] = [];

  // Check entity-to-entity dependencies
  for (const entity of entities) {
    if (entity.id === targetEntityId) continue;

    let isDependent = false;
    let reason = '';

    // Check assetReferences
    if (entity.assetReferences && entity.assetReferences.includes(targetEntityId)) {
      isDependent = true;
      reason = `Direct asset reference from ${entity.type} "${entity.name}"`;
    }

    // Check components
    if (!isDependent && entity.components) {
      const compStr = JSON.stringify(entity.components);
      if (compStr.includes(`"${targetEntityId}"`)) {
        isDependent = true;
        reason = `Referenced within component data of ${entity.type} "${entity.name}"`;
      }
    }

    if (isDependent) {
      const isPublished = Boolean(entity.isPublished);
      dependents.push({
        dependentId: entity.id,
        dependentName: entity.name,
        dependentType: entity.type,
        isPublished,
        severity: isPublished ? 'BLOCKING' : 'WARNING',
        reason,
      });
    }
  }

  // Check map spawns and placements
  if (maps) {
    for (const map of maps) {
      if (map.spawns) {
        const hasSpawn = map.spawns.some(
          (s) => s.entityId === targetEntityId || s.npcId === targetEntityId
        );
        if (hasSpawn) {
          const isPublished = Boolean(map.isPublished);
          dependents.push({
            dependentId: map.id,
            dependentName: map.name,
            dependentType: 'map_spawn',
            isPublished,
            severity: isPublished ? 'BLOCKING' : 'WARNING',
            reason: `Spawn point on map "${map.name}"`,
          });
        }
      }
    }
  }

  const blockingCount = dependents.filter((d) => d.severity === 'BLOCKING').length;
  const warningCount = dependents.filter((d) => d.severity === 'WARNING').length;

  return {
    targetEntityId,
    canDeleteSafely: blockingCount === 0,
    totalDependents: dependents.length,
    blockingCount,
    warningCount,
    dependents,
  };
}
