import { describe, expect, it } from 'vitest';
import { validateWorldEntry } from './worldEntryValidation';

describe('validateWorldEntry', () => {
  it('rejects null character payload', () => {
    const result = validateWorldEntry({ character: null });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('No character selected for world entry.');
  });

  it('rejects characters with missing class or invalid name', () => {
    const result = validateWorldEntry({
      character: {
        id: 'char_1',
        name: 'AB',
        classId: null,
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Character name must be at least 3 characters.');
    expect(result.errors).toContain('Character is missing a designated combat class.');
  });

  it('accepts valid character with destination map', () => {
    const result = validateWorldEntry({
      character: {
        id: 'char_valid',
        name: 'SaintVanguard',
        classId: 'WARRIOR',
        currentMap: 'SAINTS_HAVEN',
        x: 10,
        y: 12,
      },
      mapId: 'SAINTS_HAVEN',
      mapData: {
        id: 'SAINTS_HAVEN',
        grid: [[0, 0], [0, 0]],
      },
    });
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });
});
