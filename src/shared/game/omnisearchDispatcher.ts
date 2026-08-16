/**
 * Saints Gaming — Omnisearch Fast Jump & Dock Dispatcher (Bible 19 & Bible 29)
 * Resolves target viewport focusing and dock activations when selecting search results.
 */

import { OmnisearchEntry } from './studioOmnisearchEngine';
import { StudioDockId } from './studioModes';

export interface DispatchContext {
  currentMapId: string;
  openDock: (dockId: StudioDockId) => void;
  loadMap: (mapId: string) => void;
  setCameraFocus?: (pos: { x: number; y: number }) => void;
  showToast?: (message: string) => void;
}

export interface DispatchPlan {
  actionTaken: 'LOAD_MAP' | 'OPEN_DOCK' | 'FOCUS_COORDS' | 'EXECUTE_ACTION' | 'NOOP';
  targetDock?: StudioDockId;
  targetMapId?: string;
  focusCoordinates?: { x: number; y: number };
  message?: string;
}

/**
 * Resolves and executes the appropriate Studio action for an Omnisearch entry.
 */
export function dispatchOmnisearchResult(
  entry: OmnisearchEntry,
  context: DispatchContext
): DispatchPlan {
  switch (entry.domain) {
    case 'map': {
      const mapId = (entry.payload?.mapId as string) || entry.id.replace(/^map_/, '');
      context.loadMap(mapId);
      context.openDock('build');
      context.showToast?.(`Loaded map: ${entry.title}`);
      return {
        actionTaken: 'LOAD_MAP',
        targetMapId: mapId,
        targetDock: 'build',
        message: `Loaded map '${mapId}'`,
      };
    }

    case 'npc': {
      context.openDock('npc');
      const x = entry.payload?.x as number | undefined;
      const y = entry.payload?.y as number | undefined;
      const mapId = entry.payload?.mapId as string | undefined;

      if (mapId && mapId !== context.currentMapId) {
        context.loadMap(mapId);
      }

      if (typeof x === 'number' && typeof y === 'number' && context.setCameraFocus) {
        context.setCameraFocus({ x, y });
        return {
          actionTaken: 'FOCUS_COORDS',
          targetDock: 'npc',
          focusCoordinates: { x, y },
          message: `Focused NPC '${entry.title}' at (${x}, ${y})`,
        };
      }

      return {
        actionTaken: 'OPEN_DOCK',
        targetDock: 'npc',
        message: `Opened NPC Inspector for '${entry.title}'`,
      };
    }

    case 'creature': {
      context.openDock('creature');
      context.showToast?.(`Opened Creature Catalog for ${entry.title}`);
      return {
        actionTaken: 'OPEN_DOCK',
        targetDock: 'creature',
      };
    }

    case 'item': {
      context.openDock('items');
      return {
        actionTaken: 'OPEN_DOCK',
        targetDock: 'items',
      };
    }

    case 'loot': {
      context.openDock('loot');
      return {
        actionTaken: 'OPEN_DOCK',
        targetDock: 'loot',
      };
    }

    case 'quest': {
      context.openDock('quest');
      return {
        actionTaken: 'OPEN_DOCK',
        targetDock: 'quest',
      };
    }

    case 'dock': {
      const dockId = (entry.payload?.dockId as StudioDockId) || (entry.id.replace(/^dock:/, '') as StudioDockId);
      context.openDock(dockId);
      return {
        actionTaken: 'OPEN_DOCK',
        targetDock: dockId,
      };
    }

    case 'asset': {
      context.openDock('assets');
      return {
        actionTaken: 'OPEN_DOCK',
        targetDock: 'assets',
      };
    }

    case 'action':
    default:
      return {
        actionTaken: 'EXECUTE_ACTION',
        message: `Triggered action '${entry.title}'`,
      };
  }
}
