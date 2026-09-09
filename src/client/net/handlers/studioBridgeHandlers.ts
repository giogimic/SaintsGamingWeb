/**
 * Studio Bridge Handlers — studio_lock, studio_unlock, rule_trace.
 *
 * These handlers only fire when the client is connected in Studio mode.
 * They bridge Studio collaboration events to the appropriate stores
 * without coupling the game client to the editor internals.
 */
import type {
  StudioLockPayload,
  StudioUnlockPayload,
  RuleTracePayload,
} from '../protocol.d';

/**
 * Studio soft lock acquired by another collaborator.
 * Forwarded to the editor store (if mounted) via a global event.
 */
export function onStudioLock(data: StudioLockPayload): void {
  // Emit a synthetic event that the Studio editor-store can listen for.
  // This avoids a direct import dependency on the editor store.
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('saints:studio:lock', { detail: data }),
    );
  }
}

/**
 * Studio soft lock released.
 */
export function onStudioUnlock(data: StudioUnlockPayload): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('saints:studio:unlock', { detail: data }),
    );
  }
}

/**
 * Rule trace result from the server (Studio debugging).
 */
export function onRuleTrace(data: RuleTracePayload): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('saints:studio:rule_trace', { detail: data }),
    );
  }
}
