import { describe, it, expect } from 'vitest';
import {
  StudioLocalizationEngine,
  createStudioAuditLog,
} from './localizationAuditEngine';
import { ResourceRef } from './taskEngine';

describe('Studio Localization & Audit Logging Engine (Bible 27 §3.11 & §3.12)', () => {
  it('translates strings with fallback to default locale', () => {
    const l10n = new StudioLocalizationEngine('en');
    l10n.setTranslation('en', 'quest.goblin.title', 'Goblin Invasion');
    l10n.setTranslation('es', 'quest.goblin.title', 'Invasión de Duendes');

    expect(l10n.translate('quest.goblin.title', 'es')).toBe('Invasión de Duendes');
    expect(l10n.translate('quest.goblin.title', 'fr')).toBe('Goblin Invasion');
    expect(l10n.translate('unknown.key', 'es', 'Default Text')).toBe('Default Text');
  });

  it('creates structured audit log records for mutations', () => {
    const mapRef: ResourceRef = { type: 'map', id: 'saints_citadel' };
    const log = createStudioAuditLog({
      userId: 'admin_123',
      projectId: 'main_world',
      action: 'map.publish',
      resource: mapRef,
      before: { version: 1 },
      after: { version: 2 },
    });

    expect(log.id).toBeDefined();
    expect(log.action).toBe('map.publish');
    expect(log.userId).toBe('admin_123');
    expect(log.resource.id).toBe('saints_citadel');
  });
});
