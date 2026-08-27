import { describe, expect, it } from 'vitest';
import { GuildTerritoryEngine } from './guildTerritoryEngine';

describe('Guild Clan Citadel & Territory War Engine (Phase 16)', () => {
  it('handles neutral territory capture and disputed stall mechanics', () => {
    const engine = new GuildTerritoryEngine();

    engine.registerNode({
      id: 'node_iron_mine',
      name: 'Iron Forge Outpost',
      description: 'Rich vein granting mining boosts.',
      controllingGuildId: null,
      capturePercent: 0,
      capturingGuildId: null,
      fortificationLevel: 1,
      perks: {
        goldYieldPerHour: 150,
        xpMultiplierBuff: 1.15,
        buffCategory: 'MINING',
      },
    });

    // 1. Guild A occupies neutral node: ticks +25%
    const n1 = engine.tickCapture('node_iron_mine', [{ guildId: 'guild_saints', count: 3 }], 25);
    expect(n1.capturePercent).toBe(25);
    expect(n1.capturingGuildId).toBe('guild_saints');
    expect(n1.controllingGuildId).toBeNull();

    // 2. Disputed tick: both Guild A and Guild B present -> no progress
    const n2 = engine.tickCapture(
      'node_iron_mine',
      [
        { guildId: 'guild_saints', count: 2 },
        { guildId: 'guild_rivals', count: 2 },
      ],
      25
    );
    expect(n2.capturePercent).toBe(25);

    // 3. Guild A finishes capture to 100%
    engine.tickCapture('node_iron_mine', [{ guildId: 'guild_saints', count: 3 }], 75);
    const captured = engine.getNode('node_iron_mine');
    expect(captured?.controllingGuildId).toBe('guild_saints');
    expect(captured?.capturePercent).toBe(100);
  });

  it('handles territory neutralization and hostile takeover', () => {
    const engine = new GuildTerritoryEngine();

    engine.registerNode({
      id: 'node_lumber_mill',
      name: 'Verdant Lumber Mill',
      description: 'Lumber hub.',
      controllingGuildId: 'guild_saints',
      capturePercent: 100,
      capturingGuildId: null,
      fortificationLevel: 1,
      perks: {
        goldYieldPerHour: 100,
        xpMultiplierBuff: 1.1,
        buffCategory: 'WOODCUTTING',
      },
    });

    // Guild Rivals occupies alone -> neutralizes from 100% to 0%
    engine.tickCapture('node_lumber_mill', [{ guildId: 'guild_rivals', count: 4 }], 100);
    const neutralized = engine.getNode('node_lumber_mill');
    expect(neutralized?.controllingGuildId).toBeNull();
    expect(neutralized?.capturePercent).toBe(0);

    // Guild Rivals captures from 0% to 100%
    engine.tickCapture('node_lumber_mill', [{ guildId: 'guild_rivals', count: 4 }], 100);
    const flipped = engine.getNode('node_lumber_mill');
    expect(flipped?.controllingGuildId).toBe('guild_rivals');
    expect(flipped?.capturePercent).toBe(100);
  });

  it('declares clan war and processes victory when target score is reached', () => {
    const engine = new GuildTerritoryEngine();
    const war = engine.declareClanWar('guild_saints', 'guild_rivals', 50000, 50);

    expect(war.status).toBe('ACTIVE');
    expect(war.targetScore).toBe(50);
    expect(war.stakeGold).toBe(50000);

    // Record kills (5 pts each) and node capture (25 pts)
    engine.recordWarKill(war.warId, 'guild_saints', 15);
    engine.recordWarCapture(war.warId, 'guild_saints', 25);
    expect(war.challengerScore).toBe(40);
    expect(war.status).toBe('ACTIVE');

    // Final kill pushes past 50 pts
    const finished = engine.recordWarKill(war.warId, 'guild_saints', 15);
    expect(finished.status).toBe('CONCLUDED');
    expect(finished.winnerGuildId).toBe('guild_saints');
    expect(finished.loserGuildId).toBe('guild_rivals');
  });
});
