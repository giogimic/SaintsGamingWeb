import { describe, it, expect, vi } from 'vitest';
import { dispatchOmnisearchResult, DispatchContext } from './omnisearchDispatcher';
import { OmnisearchEntry } from './studioOmnisearchEngine';

describe('Omnisearch Fast Jump & Dock Dispatcher (Bible 19 & Bible 29)', () => {
  it('dispatches Map entries by loading the map and opening World Builder dock', () => {
    const mockContext: DispatchContext = {
      currentMapId: 'DEMO_SANDBOX',
      openDock: vi.fn(),
      loadMap: vi.fn(),
      showToast: vi.fn(),
    };

    const mapEntry: OmnisearchEntry = {
      id: 'map_whispering_forest',
      domain: 'map',
      title: 'Whispering Forest',
      payload: { mapId: 'WHISPERING_FOREST' },
    };

    const plan = dispatchOmnisearchResult(mapEntry, mockContext);

    expect(plan.actionTaken).toBe('LOAD_MAP');
    expect(mockContext.loadMap).toHaveBeenCalledWith('WHISPERING_FOREST');
    expect(mockContext.openDock).toHaveBeenCalledWith('build');
  });

  it('dispatches NPC entries by focusing camera on coordinates and opening NPC dock', () => {
    const mockContext: DispatchContext = {
      currentMapId: 'SAINTS_VILLAGE',
      openDock: vi.fn(),
      loadMap: vi.fn(),
      setCameraFocus: vi.fn(),
    };

    const npcEntry: OmnisearchEntry = {
      id: 'npc_luna',
      domain: 'npc',
      title: 'Guide Luna',
      payload: { x: 12, y: 15, mapId: 'SAINTS_VILLAGE' },
    };

    const plan = dispatchOmnisearchResult(npcEntry, mockContext);

    expect(plan.actionTaken).toBe('FOCUS_COORDS');
    expect(mockContext.openDock).toHaveBeenCalledWith('npc');
    expect(mockContext.setCameraFocus).toHaveBeenCalledWith({ x: 12, y: 15 });
  });

  it('dispatches Creature entries to the creature catalog dock', () => {
    const mockContext: DispatchContext = {
      currentMapId: 'DEMO_SANDBOX',
      openDock: vi.fn(),
      loadMap: vi.fn(),
    };

    const creatureEntry: OmnisearchEntry = {
      id: 'creature_rockitten',
      domain: 'creature',
      title: 'Rockitten',
    };

    const plan = dispatchOmnisearchResult(creatureEntry, mockContext);

    expect(plan.actionTaken).toBe('OPEN_DOCK');
    expect(mockContext.openDock).toHaveBeenCalledWith('creature');
  });
});
