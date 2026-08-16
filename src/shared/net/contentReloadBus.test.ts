import { describe, it, expect, vi } from 'vitest';
import { emitContentReload, ContentReloadPayload } from './contentReloadBus';
import { RealtimeEvents } from './protocol';

describe('Content Reload Event Bus (Bible 26/28 BE1/LO1)', () => {
  it('emits content_reload with correct structure for map updates', () => {
    const mockBroadcaster = {
      emit: vi.fn(),
    };

    const payload: ContentReloadPayload = {
      type: 'map',
      id: 'DEMO_SANDBOX',
      version: 42,
    };

    emitContentReload(mockBroadcaster, payload);

    expect(mockBroadcaster.emit).toHaveBeenCalledWith(
      RealtimeEvents.CONTENT_RELOAD,
      expect.objectContaining({
        type: 'map',
        id: 'DEMO_SANDBOX',
        version: 42,
      })
    );

    // Verify backward compatibility emission
    expect(mockBroadcaster.emit).toHaveBeenCalledWith('admin_save_map', {
      mapId: 'DEMO_SANDBOX',
      timestamp: expect.any(Number),
    });
  });

  it('emits content_reload for non-map assets without emitting admin_save_map', () => {
    const mockBroadcaster = {
      emit: vi.fn(),
    };

    const payload: ContentReloadPayload = {
      type: 'creatures',
      id: 'rockitten',
      version: 3,
    };

    emitContentReload(mockBroadcaster, payload);

    expect(mockBroadcaster.emit).toHaveBeenCalledTimes(1);
    expect(mockBroadcaster.emit).toHaveBeenCalledWith(
      RealtimeEvents.CONTENT_RELOAD,
      expect.objectContaining({
        type: 'creatures',
        id: 'rockitten',
      })
    );
  });
});
