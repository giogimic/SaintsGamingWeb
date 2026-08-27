import { describe, expect, it } from 'vitest';
import { AccessibilityEngine } from './accessibilityEngine';

describe('Master Accessibility, Adaptive Keybinding Matrix & ARIA Engine (Phase 40)', () => {
  it('manages default keybindings and remapping with conflict auto-swapping', () => {
    const engine = new AccessibilityEngine();

    // 1. Verify defaults
    const moveUp = engine.getBinding('MOVE_UP');
    expect(moveUp?.primaryKey).toBe('KeyW');
    expect(moveUp?.secondaryKey).toBe('ArrowUp');

    // 2. Rebind INTERACT (KeyE) to KeyW -> Conflict with MOVE_UP -> Auto-swaps
    const rebind = engine.rebindKey('INTERACT', 'KeyW', false, true);
    expect(rebind.success).toBe(true);
    expect(rebind.conflictAction).toBe('MOVE_UP');

    expect(engine.getBinding('INTERACT')?.primaryKey).toBe('KeyW');
    expect(engine.getBinding('MOVE_UP')?.primaryKey).toBe('KeyE');
  });

  it('generates accurate colorblind visual transformation matrices', () => {
    const engine = new AccessibilityEngine();

    const protanopia = engine.getColorMatrix('PROTANOPIA');
    expect(protanopia).toContain('0.567');

    const deuteranopia = engine.getColorMatrix('DEUTERANOPIA');
    expect(deuteranopia).toContain('0.625');

    const achromatopsia = engine.getColorMatrix('ACHROMATOPSIA');
    expect(achromatopsia).toContain('0.299');
  });

  it('clamps UI font scale within safe bounds and queues screen reader announcements', () => {
    const engine = new AccessibilityEngine();

    // 1. UI scale clamping (1.0x to 2.0x)
    expect(engine.setUiScale(0.5)).toBe(1.0);
    expect(engine.setUiScale(1.5)).toBe(1.5);
    expect(engine.setUiScale(3.5)).toBe(2.0);

    // 2. ARIA Live announcements queue
    const ann1 = engine.queueAriaAnnouncement('Dragon slain!', 'ASSERTIVE');
    const ann2 = engine.queueAriaAnnouncement('Quest updated.', 'POLITE');

    expect(ann1.priority).toBe('ASSERTIVE');
    expect(ann2.priority).toBe('POLITE');

    const flushed = engine.flushAriaAnnouncements();
    expect(flushed).toHaveLength(2);
    expect(engine.flushAriaAnnouncements()).toHaveLength(0);
  });
});
