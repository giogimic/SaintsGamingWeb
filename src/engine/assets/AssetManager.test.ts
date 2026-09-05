import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssetManager } from './AssetManager';

describe('AssetManager', () => {
  beforeEach(() => {
    // Reset singleton between tests by clearing instance internally or simply clearing cache
    const manager = AssetManager.getInstance();
    manager.clearCache();
    vi.restoreAllMocks();
  });

  it('maintains a singleton instance', () => {
    const instance1 = AssetManager.getInstance();
    const instance2 = AssetManager.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('clears cache successfully', () => {
    const manager = AssetManager.getInstance();
    // Use internal property manipulation just for testing the map if needed, 
    // or test behavior. We will mock searchAssets to simulate fetching.
    (manager as any).cache.set('test-id', { id: 'test-id' });
    expect((manager as any).cache.has('test-id')).toBe(true);

    manager.clearCache();
    expect((manager as any).cache.has('test-id')).toBe(false);
  });

  it('hydrates raw asset data correctly', () => {
    const manager = AssetManager.getInstance();
    
    const rawAsset = {
      id: 'asset-1',
      metadata: { cat: 'hair', z: 10 },
      tags: ['modular'],
      categories: ['character']
    };

    const hydrated = (manager as any).hydrate(rawAsset);

    expect(hydrated.id).toBe('asset-1');
    expect(hydrated.isModularComponent).toBe(true);
    expect(hydrated.componentCategory).toBe('hair');
    expect(hydrated.zOrderHint).toBe(10);
    expect(hydrated.categories).toContain('character');
    expect(hydrated.createdAt).toBeInstanceOf(Date);
  });

  it('broadcasts refresh event to window', () => {
    const manager = AssetManager.getInstance();
    
    // Mock window dispatchEvent
    let dispatchedEvent: any = null;
    vi.stubGlobal('window', {
      dispatchEvent: vi.fn((e) => {
        dispatchedEvent = e;
      })
    });

    manager.broadcastRefresh();

    expect(window.dispatchEvent).toHaveBeenCalled();
    expect(dispatchedEvent.type).toBe('assets:refreshed');
    
    vi.unstubAllGlobals();
  });
});
