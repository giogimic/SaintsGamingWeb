import { describe, expect, it } from 'vitest';
import { LocalizationRegistryEngine } from './localizationRegistryEngine';

describe('Comprehensive Multi-Language Localization, Dynamic Translation Keys & Fallback Engine (Phase 36)', () => {
  it('translates keys with dynamic variable interpolation and default fallback', () => {
    const engine = new LocalizationRegistryEngine();

    // Register EN_US reference strings
    engine.registerLocaleDictionary('EN_US', {
      'ui.welcome': 'Welcome, {{name}} to Saints Gaming!',
      'quest.reward': 'You earned {{amount}} Gold and {{xp}} XP!',
      'menu.quit': 'Quit Game',
    });

    // Register ES_ES partial translations
    engine.registerLocaleDictionary('ES_ES', {
      'ui.welcome': '¡Bienvenido, {{name}} a Saints Gaming!',
    });

    // 1. Direct ES_ES translation with interpolation
    const esWelcome = engine.t('ui.welcome', { name: 'Saint Arthur' }, 'ES_ES');
    expect(esWelcome).toBe('¡Bienvenido, Saint Arthur a Saints Gaming!');

    // 2. Fallback to EN_US for missing Spanish key
    const esQuest = engine.t('quest.reward', { amount: 500, xp: 1200 }, 'ES_ES');
    expect(esQuest).toBe('You earned 500 Gold and 1200 XP!');

    // 3. Fallback to raw key if missing in all dictionaries
    const rawKey = engine.t('unknown.key.test', {}, 'ES_ES');
    expect(rawKey).toBe('unknown.key.test');
  });

  it('handles pluralization rules accurately', () => {
    const engine = new LocalizationRegistryEngine();

    engine.registerLocaleDictionary('EN_US', {
      'items.slain.zero': 'No creatures slain.',
      'items.slain.one': '1 creature slain.',
      'items.slain.other': '{{count}} creatures slain.',
    });

    const opt = {
      zero: 'items.slain.zero',
      one: 'items.slain.one',
      other: 'items.slain.other',
    };

    expect(engine.pluralize(0, opt, {}, 'EN_US')).toBe('No creatures slain.');
    expect(engine.pluralize(1, opt, {}, 'EN_US')).toBe('1 creature slain.');
    expect(engine.pluralize(5, opt, {}, 'EN_US')).toBe('5 creatures slain.');
  });

  it('audits localization coverage percentage and flags missing keys', () => {
    const engine = new LocalizationRegistryEngine();

    engine.registerLocaleDictionary('EN_US', {
      'ui.play': 'Play',
      'ui.settings': 'Settings',
      'ui.exit': 'Exit',
      'ui.credits': 'Credits',
    });

    engine.registerLocaleDictionary('FR_FR', {
      'ui.play': 'Jouer',
      'ui.settings': 'Paramètres',
    });

    const audit = engine.auditCoverage('FR_FR');
    expect(audit.totalKeys).toBe(4);
    expect(audit.translatedKeys).toBe(2);
    expect(audit.coveragePercent).toBe(50);
    expect(audit.missingKeys).toEqual(['ui.exit', 'ui.credits']);
  });
});
