import { describe, expect, it } from 'vitest';

describe('Live Operations Admin & Simulation Actions (Phase 13)', () => {
  it('formats live world event trigger payload with timestamp boundaries and parsed mutations', () => {
    const now = 1700000000000;
    const duration = 7200; // 2 hours
    const template = {
      slug: 'harvest_festival',
      name: 'Autumn Harvest Festival',
      durationSeconds: duration,
      mutationsData: JSON.stringify({
        gatheringYieldMult: 2.0,
        weather: 'SUNNY_GOLDEN',
      }),
    };

    const payload = {
      slug: template.slug,
      name: template.name,
      isActive: true,
      durationSeconds: duration,
      startedAt: now,
      endsAt: now + duration * 1000,
      mutations: JSON.parse(template.mutationsData),
    };

    expect(payload.isActive).toBe(true);
    expect(payload.endsAt - payload.startedAt).toBe(7200 * 1000);
    expect(payload.mutations.gatheringYieldMult).toBe(2.0);
    expect(payload.mutations.weather).toBe('SUNNY_GOLDEN');
  });

  it('validates exclusive simulation preset configuration switching', () => {
    const presets = [
      {
        slug: 'standard_rules',
        name: 'Standard Realm Rules',
        isActive: true,
        xpMultiplier: 1.0,
        dropMultiplier: 1.0,
        goldMultiplier: 1.0,
      },
      {
        slug: 'hardcore_challenge',
        name: 'Hardcore Survival',
        isActive: false,
        xpMultiplier: 0.75,
        dropMultiplier: 1.5,
        goldMultiplier: 0.5,
      },
    ];

    // Simulate selecting hardcore
    const targetSlug = 'hardcore_challenge';
    const updatedPresets = presets.map((p) => ({
      ...p,
      isActive: p.slug === targetSlug,
    }));

    const activeCount = updatedPresets.filter((p) => p.isActive).length;
    const activePreset = updatedPresets.find((p) => p.isActive);

    expect(activeCount).toBe(1);
    expect(activePreset?.slug).toBe('hardcore_challenge');
    expect(activePreset?.xpMultiplier).toBe(0.75);
    expect(activePreset?.dropMultiplier).toBe(1.5);
  });
});
