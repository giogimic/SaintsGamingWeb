import { BaseEntityDefinition } from '../entities/types';

export interface ValidationIssue {
  entityId: string;
  entityName: string;
  missingReferenceId: string;
  referenceType: 'asset' | 'ability' | 'item' | 'other';
  message: string;
}

export class DependencyGraph {
  private entityDependencies = new Map<string, Set<string>>();

  /**
   * Registers a given entity and extracts its asset dependencies.
   */
  public registerEntity(entity: BaseEntityDefinition): void {
    const deps = new Set<string>();
    
    if (entity.assetReferences) {
      entity.assetReferences.forEach(ref => deps.add(ref));
    }

    // You could also walk through the components object to find 
    // nested assetProfileIds or lootTableIds if necessary.

    this.entityDependencies.set(entity.id, deps);
  }

  /**
   * Returns all known dependencies for a given entity ID.
   */
  public getDependencies(entityId: string): string[] {
    const deps = this.entityDependencies.get(entityId);
    return deps ? Array.from(deps) : [];
  }

  /**
   * Clears all registered dependencies.
   */
  public clear(): void {
    this.entityDependencies.clear();
  }
}

export class ProjectValidator {
  private graph: DependencyGraph;
  
  constructor(graph: DependencyGraph) {
    this.graph = graph;
  }

  /**
   * Validates registered entities against a known set of valid asset/reference IDs.
   * Returns a list of validation issues.
   */
  public validate(entities: BaseEntityDefinition[], validAssetIds: Set<string>): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const entity of entities) {
      const dependencies = this.graph.getDependencies(entity.id);
      
      for (const depId of dependencies) {
        if (!validAssetIds.has(depId)) {
          issues.push({
            entityId: entity.id,
            entityName: entity.name,
            missingReferenceId: depId,
            referenceType: 'asset',
            message: `Entity "${entity.name}" references missing asset: ${depId}`
          });
        }
      }
    }

    return issues;
  }
}
