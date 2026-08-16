import { describe, it, expect } from 'vitest';
import {
  createPlayerTitleState,
  equipTitle,
  unequipTitle,
  formatPlayerDisplayName,
} from './titleDispatcher';

describe('Player Title & Badge Equip Dispatcher (Bible 26)', () => {
  it('creates starter title state with novice unlocked', () => {
    const state = createPlayerTitleState();

    expect(state.unlockedTitleIds).toContain('title_novice');
    expect(state.equippedTitleId).toBeUndefined();

    const formatted = formatPlayerDisplayName('GioGimic', state);
    expect(formatted.formattedName).toBe('GioGimic');
  });

  it('equips prefix title and formats display name correctly', () => {
    const state = createPlayerTitleState();
    const equip = equipTitle(state, 'title_novice');

    expect(equip.success).toBe(true);
    expect(state.equippedTitleId).toBe('title_novice');

    const formatted = formatPlayerDisplayName('GioGimic', state);
    expect(formatted.formattedName).toBe('Novice GioGimic');
    expect(formatted.position).toBe('PREFIX');
  });

  it('equips suffix title and prevents equipping locked titles', () => {
    const state = createPlayerTitleState();

    // Attempt to equip locked Grandmaster title (blocked)
    const equipLocked = equipTitle(state, 'title_grandmaster');
    expect(equipLocked.success).toBe(false);
    expect(equipLocked.reason).toContain('Title is not unlocked');

    // Unlock and equip Grandmaster title
    state.unlockedTitleIds.push('title_grandmaster');
    const equipSuccess = equipTitle(state, 'title_grandmaster');
    expect(equipSuccess.success).toBe(true);

    const formatted = formatPlayerDisplayName('GioGimic', state);
    expect(formatted.formattedName).toBe('GioGimic the Grandmaster');
    expect(formatted.position).toBe('SUFFIX');
    expect(formatted.colorHex).toBe('#eab308');

    // Unequip title
    unequipTitle(state);
    expect(state.equippedTitleId).toBeUndefined();
    expect(formatPlayerDisplayName('GioGimic', state).formattedName).toBe('GioGimic');
  });
});
