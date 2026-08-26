/**
 * Saints Gaming — Global Relationship & Dependency Graph (Bible 16 / Studio Master Plan Phase 1C)
 *
 * Provides a project-wide directed dependency graph capable of answering:
 * - What does this entity reference?
 * - What other entities reference this? (Impact Analysis)
 * - What assets/definitions are unused?
 * - What references are broken/dangling?
 */

export type GraphEntityType =
  | 'ITEM'
  | 'ABILITY'
  | 'CREATURE'
  | 'MONSTER'
  | 'NPC'
  | 'QUEST'
  | 'RECIPE'
  | 'PROFESSION'
  | 'MAP'
  | 'DUNGEON'
  | 'ASSET'
  | 'FACTION'
  | 'LOOT_TABLE'
  | 'WORLD_EVENT';

export interface EntityNode {
  id: string;
  type: GraphEntityType;
  name: string;
  metadata?: Record<string, any>;
}

export interface DependencyEdge {
  fromId: string;
  fromType: GraphEntityType;
  toId: string;
  toType: GraphEntityType;
  relation: string; // e.g. 'requires_item', 'drops_loot', 'casts_ability', 'references_asset'
  isOptional?: boolean;
}

export interface BrokenReference {
  sourceId: string;
  sourceType: GraphEntityType;
  targetId: string;
  targetType: GraphEntityType;
  relation: string;
}

export interface DeletionImpactReport {
  canSafelyDelete: boolean;
  totalDirectDependents: number;
  directDependents: DependencyEdge[];
  cascadeAffectedIds: string[];
  warnings: string[];
}

export class ProjectDependencyGraph {
  private nodes: Map<string, EntityNode> = new Map();
  // fromId -> array of outgoing edges
  private outgoing: Map<string, DependencyEdge[]> = new Map();
  // toId -> array of incoming edges
  private incoming: Map<string, DependencyEdge[]> = new Map();

  public addNode(node: EntityNode): void {
    this.nodes.set(node.id, node);
    if (!this.outgoing.has(node.id)) this.outgoing.set(node.id, []);
    if (!this.incoming.has(node.id)) this.incoming.set(node.id, []);
  }

  public removeNode(id: string): void {
    this.nodes.delete(id);
    // Remove outgoing edges
    const outEdges = this.outgoing.get(id) || [];
    for (const edge of outEdges) {
      const inc = this.incoming.get(edge.toId);
      if (inc) {
        this.incoming.set(
          edge.toId,
          inc.filter((e) => e.fromId !== id)
        );
      }
    }
    this.outgoing.delete(id);

    // Remove incoming edges
    const inEdges = this.incoming.get(id) || [];
    for (const edge of inEdges) {
      const out = this.outgoing.get(edge.fromId);
      if (out) {
        this.outgoing.set(
          edge.fromId,
          out.filter((e) => e.toId !== id)
        );
      }
    }
    this.incoming.delete(id);
  }

  public addEdge(edge: DependencyEdge): void {
    // Add to outgoing
    const out = this.outgoing.get(edge.fromId) || [];
    out.push(edge);
    this.outgoing.set(edge.fromId, out);

    // Add to incoming
    const inc = this.incoming.get(edge.toId) || [];
    inc.push(edge);
    this.incoming.set(edge.toId, inc);
  }

  public getNode(id: string): EntityNode | undefined {
    return this.nodes.get(id);
  }

  public getAllNodes(): EntityNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Outgoing references: What does entity A depend on?
   */
  public getDependencies(id: string): DependencyEdge[] {
    return this.outgoing.get(id) || [];
  }

  /**
   * Incoming references: What other entities reference entity A?
   */
  public getDependents(id: string): DependencyEdge[] {
    return this.incoming.get(id) || [];
  }

  /**
   * Scans all edges to find references to target nodes that do not exist in the graph.
   */
  public detectBrokenReferences(): BrokenReference[] {
    const broken: BrokenReference[] = [];

    for (const [fromId, edges] of this.outgoing.entries()) {
      for (const edge of edges) {
        if (!this.nodes.has(edge.toId)) {
          broken.push({
            sourceId: fromId,
            sourceType: edge.fromType,
            targetId: edge.toId,
            targetType: edge.toType,
            relation: edge.relation,
          });
        }
      }
    }

    return broken;
  }

  /**
   * Finds assets that have no incoming references from any entity or map.
   */
  public findUnusedAssets(): EntityNode[] {
    const unused: EntityNode[] = [];
    for (const [id, node] of this.nodes.entries()) {
      if (node.type === 'ASSET') {
        const dependents = this.getDependents(id);
        if (dependents.length === 0) {
          unused.push(node);
        }
      }
    }
    return unused;
  }

  /**
   * Analyzes what will break if a given entity definition is deleted.
   */
  public analyzeDeletionImpact(id: string): DeletionImpactReport {
    const target = this.nodes.get(id);
    const directDependents = this.getDependents(id);

    if (directDependents.length === 0) {
      return {
        canSafelyDelete: true,
        totalDirectDependents: 0,
        directDependents: [],
        cascadeAffectedIds: [],
        warnings: [],
      };
    }

    const warnings: string[] = [];
    const cascadeSet = new Set<string>();

    // Traverse upwards to collect all affected descendants/dependents
    const queue = [...directDependents.map((e) => e.fromId)];
    while (queue.length > 0) {
      const currId = queue.shift()!;
      if (!cascadeSet.has(currId)) {
        cascadeSet.add(currId);
        const parentEdges = this.getDependents(currId);
        for (const p of parentEdges) {
          queue.push(p.fromId);
        }
      }
    }

    for (const dep of directDependents) {
      const depNode = this.nodes.get(dep.fromId);
      const name = depNode ? `"${depNode.name}" (${depNode.type})` : `Entity ${dep.fromId}`;
      warnings.push(`Referenced by ${name} via relation '${dep.relation}'`);
    }

    return {
      canSafelyDelete: false,
      totalDirectDependents: directDependents.length,
      directDependents,
      cascadeAffectedIds: Array.from(cascadeSet),
      warnings,
    };
  }
}
