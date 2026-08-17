/**
 * Saints Gaming — Content Revision & Publishing Snapshot Engine (Bible 26 §4 & §5)
 * Manages immutable revision histories, status lifecycle (draft -> staging -> live), and rollback pointers.
 */

export type ContentStatus = 'draft' | 'review' | 'staging' | 'live' | 'archived';

export interface ContentRevision<T = unknown> {
  id: string;
  resourceType: 'map' | 'loot' | 'quest' | 'item' | 'dialogue' | 'creature' | 'ability' | 'class';
  resourceId: string;
  version: number;
  status: ContentStatus;
  payload: T;
  checksum: string;
  authorId: string;
  message?: string;
  createdAt: string;
  parentVersion?: number;
}

export interface PublishResult<T = unknown> {
  success: boolean;
  publishedRevision?: ContentRevision<T>;
  previousLiveVersion?: number;
  errors: string[];
}

/**
 * Creates an immutable content revision snapshot.
 */
export function createContentRevision<T>(params: {
  resourceType: ContentRevision['resourceType'];
  resourceId: string;
  version: number;
  status?: ContentStatus;
  payload: T;
  authorId: string;
  message?: string;
  parentVersion?: number;
}): ContentRevision<T> {
  // Simple deterministic checksum for validation
  const serialized = JSON.stringify(params.payload);
  let hash = 0;
  for (let i = 0; i < serialized.length; i++) {
    hash = (hash << 5) - hash + serialized.charCodeAt(i);
    hash |= 0;
  }
  const checksum = Math.abs(hash).toString(16);

  return {
    id: `rev_${params.resourceType}_${params.resourceId}_v${params.version}_${Date.now()}`,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    version: params.version,
    status: params.status || 'draft',
    payload: params.payload,
    checksum,
    authorId: params.authorId,
    message: params.message || 'Content update revision',
    createdAt: new Date().toISOString(),
    parentVersion: params.parentVersion,
  };
}

/**
 * Validates and promotes a draft revision to LIVE status.
 */
export function publishRevision<T>(
  draftRevision: ContentRevision<T>,
  currentLiveVersion: number = 0,
  validatorFn?: (payload: T) => { valid: boolean; errors: string[] }
): PublishResult<T> {
  if (validatorFn) {
    const validation = validatorFn(draftRevision.payload);
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors,
      };
    }
  }

  const publishedRevision: ContentRevision<T> = {
    ...draftRevision,
    status: 'live',
    version: currentLiveVersion + 1,
    parentVersion: currentLiveVersion,
    createdAt: new Date().toISOString(),
  };

  return {
    success: true,
    publishedRevision,
    previousLiveVersion: currentLiveVersion,
    errors: [],
  };
}

/**
 * Creates a rollback revision promoting a historical snapshot to a new live increment.
 */
export function createRollbackRevision<T>(
  historicalRevision: ContentRevision<T>,
  currentLiveVersion: number,
  authorId: string
): ContentRevision<T> {
  return {
    ...historicalRevision,
    id: `rev_${historicalRevision.resourceType}_${historicalRevision.resourceId}_v${currentLiveVersion + 1}_rollback_${Date.now()}`,
    version: currentLiveVersion + 1,
    parentVersion: currentLiveVersion,
    status: 'live',
    authorId,
    message: `Rollback to historical version ${historicalRevision.version}`,
    createdAt: new Date().toISOString(),
  };
}
