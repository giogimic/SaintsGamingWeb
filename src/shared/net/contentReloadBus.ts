/**
 * Saints Gaming — Content Reload Event Bus (Bible 26 §4 & Bible 28)
 * Standardized broadcaster for real-time live content reloads across Socket.io and Go MMO.
 */

import { RealtimeEvents } from './protocol';

export type ContentReloadType =
  | 'map'
  | 'map_entities'
  | 'loot'
  | 'creatures'
  | 'creature'
  | 'items'
  | 'item'
  | 'atlas'
  | 'prefabs'
  | 'prefab'
  | 'quests'
  | 'quest'
  | 'dialogue'
  | 'ability'
  | 'status'
  | 'skill'
  | 'class'
  | 'profession'
  | 'recipe'
  | 'flush_all_caches';

export interface ContentReloadPayload {
  type: ContentReloadType;
  id?: string;
  version?: number;
  authorId?: string;
  timestamp?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Emits a standardized `content_reload` broadcast to all connected game clients and studio viewports.
 * Supersedes the legacy `admin_save_map` event.
 */
export function emitContentReload(
  broadcaster: { emit: (event: string, data: any) => void },
  payload: ContentReloadPayload
): void {
  const envelope: ContentReloadPayload = {
    ...payload,
    timestamp: payload.timestamp || Date.now(),
  };

  // 1. Broadcast modern unified content_reload event
  broadcaster.emit(RealtimeEvents.CONTENT_RELOAD, envelope);

  // 2. Backward compatibility fallback: if this is a map reload, emit legacy admin_save_map
  if (payload.type === 'map') {
    broadcaster.emit('admin_save_map', { mapId: payload.id, timestamp: envelope.timestamp });
  }
}
