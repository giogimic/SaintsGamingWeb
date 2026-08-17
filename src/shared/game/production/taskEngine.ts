/**
 * Saints Gaming — Studio Task Management & Dependency Graph Engine (Bible 27 §3.5 & §3.6)
 * Governs resource references, dependency tracking, and development task pipelines.
 */

export interface ResourceRef {
  type: string;
  id: string;
  projectId?: string;
}

export interface DependencyEdge {
  from: ResourceRef;
  to: ResourceRef;
  field: string;
  strength: 'hard' | 'soft';
}

export type TaskStatus = 'backlog' | 'doing' | 'review' | 'done' | 'blocked';
export type TaskPriority = 'low' | 'med' | 'high';

export interface StudioTask {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  reporterId: string;
  linkedResources: ResourceRef[];
  dueAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DependencyGraph {
  edges: DependencyEdge[];
}

/**
 * Builds a dependency graph and provides lookup helpers.
 */
export class DependencyGraphEngine {
  private edges: DependencyEdge[] = [];

  constructor(initialEdges: DependencyEdge[] = []) {
    this.edges = [...initialEdges];
  }

  addEdge(edge: DependencyEdge): void {
    this.edges.push(edge);
  }

  getDependenciesOf(ref: ResourceRef): ResourceRef[] {
    return this.edges
      .filter((e) => e.from.type === ref.type && e.from.id === ref.id)
      .map((e) => e.to);
  }

  getDependentsOf(ref: ResourceRef): ResourceRef[] {
    return this.edges
      .filter((e) => e.to.type === ref.type && e.to.id === ref.id)
      .map((e) => e.from);
  }

  hasHardDependency(from: ResourceRef, to: ResourceRef): boolean {
    return this.edges.some(
      (e) =>
        e.from.type === from.type &&
        e.from.id === from.id &&
        e.to.type === to.type &&
        e.to.id === to.id &&
        e.strength === 'hard'
    );
  }
}

/**
 * Helper to construct a validated Studio Task.
 */
export function createStudioTask(params: {
  projectId: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  reporterId: string;
  assigneeId?: string;
  linkedResources?: ResourceRef[];
}): StudioTask {
  const now = new Date().toISOString();
  return {
    id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    projectId: params.projectId,
    title: params.title,
    description: params.description,
    status: 'backlog',
    priority: params.priority || 'med',
    reporterId: params.reporterId,
    assigneeId: params.assigneeId,
    linkedResources: params.linkedResources || [],
    createdAt: now,
    updatedAt: now,
  };
}
