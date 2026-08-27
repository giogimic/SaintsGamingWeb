/**
 * Saints Gaming — Optimistic Concurrency Control & 3-Way Merge Engine (Studio Master Plan Phase 5)
 * Protects against destructive last-write-wins collisions across collaborative multi-author editing sessions.
 */

export interface VersionedDocument<T = Record<string, any>> {
  id: string;
  data: T;
  versionHash: string;
  revisionNumber: number;
  lastModifiedBy: string;
  updatedAt: string;
}

export interface ConflictPayload<T = Record<string, any>> {
  documentId: string;
  baseHash: string;
  remoteHash: string;
  remoteDocument: VersionedDocument<T>;
  localData: T;
}

export type MergeStrategy = 'take_local' | 'take_remote' | 'smart_merge';

/**
 * Deterministically normalizes and stringifies an object by sorting its keys.
 */
export function canonicalStringify(obj: unknown): string {
  if (obj === null || obj === undefined) return String(obj);
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalStringify).join(',') + ']';
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = keys.map(
    (k) => JSON.stringify(k) + ':' + canonicalStringify((obj as Record<string, unknown>)[k])
  );
  return '{' + pairs.join(',') + '}';
}

/**
 * Computes a fast, deterministic hex hash for any JSON-serializable payload.
 */
export function computeContentHash(data: unknown): string {
  const str = canonicalStringify(data);
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Wraps raw data in a versioned document envelope.
 */
export function createVersionedDocument<T = Record<string, any>>(
  id: string,
  data: T,
  userId: string = 'system'
): VersionedDocument<T> {
  return {
    id,
    data,
    versionHash: computeContentHash(data),
    revisionNumber: 1,
    lastModifiedBy: userId,
    updatedAt: new Date().toISOString(),
  };
}

export type CommitValidationResult<T> =
  | { ok: true }
  | { ok: false; conflict: ConflictPayload<T> };

/**
 * Validates an incoming commit against the remote authoritative state.
 */
export function validateCommit<T = Record<string, any>>(
  current: VersionedDocument<T>,
  incomingBaseHash: string,
  incomingData: T
): CommitValidationResult<T> {
  if (current.versionHash === incomingBaseHash) {
    return { ok: true };
  }
  return {
    ok: false,
    conflict: {
      documentId: current.id,
      baseHash: incomingBaseHash,
      remoteHash: current.versionHash,
      remoteDocument: current,
      localData: incomingData,
    },
  };
}

/**
 * Commits updated data into the versioned document, bumping the revision.
 */
export function applyCommit<T = Record<string, any>>(
  current: VersionedDocument<T>,
  newData: T,
  userId: string
): VersionedDocument<T> {
  return {
    id: current.id,
    data: newData,
    versionHash: computeContentHash(newData),
    revisionNumber: current.revisionNumber + 1,
    lastModifiedBy: userId,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Resolves a 3-way merge conflict between Base, Local, and Remote states.
 */
export function resolveMergeConflict<T extends Record<string, any>>(
  base: T,
  local: T,
  remote: T,
  strategy: MergeStrategy = 'smart_merge'
): T {
  if (strategy === 'take_local') {
    return JSON.parse(JSON.stringify(local));
  }
  if (strategy === 'take_remote') {
    return JSON.parse(JSON.stringify(remote));
  }

  // Smart 3-way object merge
  const merged: Record<string, any> = { ...base };
  const allKeys = new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)]);

  for (const key of allKeys) {
    const baseVal = base[key];
    const localVal = local[key];
    const remoteVal = remote[key];

    const localChanged = canonicalStringify(localVal) !== canonicalStringify(baseVal);
    const remoteChanged = canonicalStringify(remoteVal) !== canonicalStringify(baseVal);

    if (localChanged && !remoteChanged) {
      // Local changed only -> apply local
      merged[key] = localVal;
    } else if (remoteChanged && !localChanged) {
      // Remote changed only -> apply remote
      merged[key] = remoteVal;
    } else if (localChanged && remoteChanged) {
      // Both changed: if equal, take either; if unequal, local wins with conflict preference
      merged[key] = localVal;
    } else {
      // Unchanged
      merged[key] = baseVal;
    }
  }

  return merged as T;
}
