import { describe, it, expect } from 'vitest';
import {
  startBarrowsRun,
  searchSarcophagus,
  defeatBrother,
  lootBarrowsChest,
} from './barrowsEngine';

describe('Barrows Crypts & Ghost Brother Matrix Engine (Bible 27)', () => {
  it('initializes a Barrows run with a designated hidden tunnel brother', () => {
    const session = startBarrowsRun('player_barrows_1', 'VERAC');
    expect(session.hiddenTunnelBrother).toBe('VERAC');
    expect(session.defeatedBrothers.length).toBe(0);
    expect(session.chestOpened).toBe(false);
  });

  it('spawns a brother on regular sarcophagus search and discovers hidden tunnels on target', () => {
    const session = startBarrowsRun('player_barrows_1', 'VERAC');

    // Searching Dharok's tomb -> Spawns Dharok
    const searchDharok = searchSarcophagus(session, 'DHAROK');
    expect(searchDharok.leadsToTunnel).toBe(false);
    expect(searchDharok.spawnedBrother?.id).toBe('DHAROK');
    expect(searchDharok.message).toContain('Dharok the Wretched');

    // Searching Verac's tomb -> Discovers tunnel
    const searchVerac = searchSarcophagus(session, 'VERAC');
    expect(searchVerac.leadsToTunnel).toBe(true);
    expect(searchVerac.message).toContain('hidden tunnel');
  });

  it('tracks brother defeats and rolls barrows chest rewards with scaled runes and armor', () => {
    const session = startBarrowsRun('player_barrows_1', 'VERAC');

    defeatBrother(session, 'DHAROK');
    defeatBrother(session, 'AHRIM');
    expect(session.defeatedBrothers.length).toBe(2);

    // Loot chest with deterministic float
    const chestResult = lootBarrowsChest(session, () => 0.0);
    expect(chestResult.success).toBe(true);
    expect(session.chestOpened).toBe(true);

    const runeItems = chestResult.loot.map((i) => i.itemId);
    expect(runeItems).toContain('coins');
    expect(runeItems).toContain('rune_death');
    expect(runeItems).toContain('rune_blood');

    // Re-opening chest fails
    const reopen = lootBarrowsChest(session);
    expect(reopen.success).toBe(false);
    expect(reopen.reason).toContain('already empty');
  });
});
