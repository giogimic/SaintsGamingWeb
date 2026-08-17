import { describe, it, expect, vi } from 'vitest';
import { StudioAuditService, StudioPublishService } from './studioServices';
import { contentCache } from './contentCache';

describe('Studio Backend Services (Bible 28 §7)', () => {
  it('records mutations and invalidates matching content cache', async () => {
    contentCache.set('quest', 'quest_intro', { title: 'Old Title' });
    expect(contentCache.get('quest', 'quest_intro')).toBeDefined();

    const log = await StudioAuditService.recordMutation({
      userId: 'admin_user',
      action: 'quest.update',
      resource: { type: 'quest', id: 'quest_intro' },
      after: { title: 'New Title' },
    });

    expect(log.id).toBeDefined();
    expect(log.action).toBe('quest.update');
    expect(contentCache.get('quest', 'quest_intro')).toBeNull();
  });

  it('publishes content revisions and broadcasts content_reload event', async () => {
    const broadcaster = {
      emit: vi.fn(),
    };

    const result = await StudioPublishService.publishContent({
      resourceType: 'map',
      resourceId: 'saints_citadel',
      payload: { name: 'Citadel Map', width: 40, height: 40 },
      authorId: 'admin_1',
      currentLiveVersion: 3,
      broadcaster,
    });

    expect(result.success).toBe(true);
    expect(result.publishedRevision?.version).toBe(4);
    expect(broadcaster.emit).toHaveBeenCalledWith(
      'content_reload',
      expect.objectContaining({
        type: 'map',
        id: 'saints_citadel',
        version: 4,
      })
    );
  });
});
