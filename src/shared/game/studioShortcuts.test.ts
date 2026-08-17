import { describe, it, expect } from 'vitest';
import {
  resolveToolModeFromKey,
  isInteractiveInputElement,
  TOOL_SHORTCUT_MAP,
} from './studioShortcuts';

describe('Studio Tool Shortcuts (Phase 5B)', () => {
  it('resolves tool keys correctly', () => {
    expect(resolveToolModeFromKey('b')).toBe('paint');
    expect(resolveToolModeFromKey('B')).toBe('paint');
    expect(resolveToolModeFromKey('e')).toBe('erase');
    expect(resolveToolModeFromKey('E')).toBe('erase');
    expect(resolveToolModeFromKey('i')).toBe('eyedropper');
    expect(resolveToolModeFromKey('I')).toBe('eyedropper');
    expect(resolveToolModeFromKey('m')).toBe('select');
    expect(resolveToolModeFromKey('M')).toBe('select');
    expect(resolveToolModeFromKey('g')).toBe('prefab');
    expect(resolveToolModeFromKey('G')).toBe('prefab');
    expect(resolveToolModeFromKey('q')).toBeNull();
    expect(resolveToolModeFromKey('1')).toBeNull();
  });

  it('detects interactive input elements', () => {
    expect(isInteractiveInputElement({ tagName: 'INPUT' })).toBe(true);
    expect(isInteractiveInputElement({ tagName: 'TEXTAREA' })).toBe(true);
    expect(isInteractiveInputElement({ tagName: 'SELECT' })).toBe(true);
    expect(isInteractiveInputElement({ tagName: 'DIV', isContentEditable: true })).toBe(true);
    expect(isInteractiveInputElement({ tagName: 'DIV', isContentEditable: false })).toBe(false);
    expect(isInteractiveInputElement({ tagName: 'CANVAS' })).toBe(false);
    expect(isInteractiveInputElement(null)).toBe(false);
  });
});
