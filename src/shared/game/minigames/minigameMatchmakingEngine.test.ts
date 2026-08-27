import { describe, expect, it } from 'vitest';
import { MinigameMatchmakingEngine } from './minigameMatchmakingEngine';

describe('Minigame Matchmaking Lobby & Team Balancing Engine (Phase 20)', () => {
  it('manages queue operations and balances teams symmetrically by combat level', () => {
    const engine = new MinigameMatchmakingEngine();

    const p1 = { playerId: 'p1', name: 'Knight Alpha', combatLevel: 120, queuedAt: Date.now() };
    const p2 = { playerId: 'p2', name: 'Knight Beta', combatLevel: 110, queuedAt: Date.now() };
    const p3 = { playerId: 'p3', name: 'Ranger Gamma', combatLevel: 80, queuedAt: Date.now() };
    const p4 = { playerId: 'p4', name: 'Mage Delta', combatLevel: 70, queuedAt: Date.now() };

    engine.joinQueue('CASTLE_WARS', p1);
    engine.joinQueue('CASTLE_WARS', p2);
    engine.joinQueue('CASTLE_WARS', p3);
    const count = engine.joinQueue('CASTLE_WARS', p4);
    expect(count).toBe(4);

    const { teamA, teamB } = engine.balanceTeams([p1, p2, p3, p4]);
    expect(teamA).toHaveLength(2);
    expect(teamB).toHaveLength(2);

    const sumA = teamA.reduce((acc, p) => acc + p.combatLevel, 0);
    const sumB = teamB.reduce((acc, p) => acc + p.combatLevel, 0);
    // 120 + 70 = 190, 110 + 80 = 190 (Perfect balance!)
    expect(sumA).toBe(190);
    expect(sumB).toBe(190);
  });

  it('tracks Castle Wars flag captures and settles match zeal rewards', () => {
    const engine = new MinigameMatchmakingEngine();
    const players = [
      { playerId: 'p1', name: 'Player 1', combatLevel: 90, queuedAt: Date.now() },
      { playerId: 'p2', name: 'Player 2', combatLevel: 90, queuedAt: Date.now() },
    ];

    const match = engine.createMatch('CASTLE_WARS', players, 1200);
    expect(match.status).toBe('IN_PROGRESS');
    expect(match.castleWars?.teamAScore).toBe(0);

    // Team A captures 2 flags, Team B captures 1
    engine.scoreCastleWarsFlag(match.matchId, 'TEAM_A');
    engine.scoreCastleWarsFlag(match.matchId, 'TEAM_A');
    engine.scoreCastleWarsFlag(match.matchId, 'TEAM_B');

    expect(match.castleWars?.teamAScore).toBe(2);
    expect(match.castleWars?.teamBScore).toBe(1);

    // Conclude Match
    const result = engine.concludeMatch(match.matchId);
    expect(result.match.status).toBe('COMPLETED');
    expect(result.match.winner).toBe('TEAM_A');
    expect(result.zealReward).toBe(3);
  });

  it('handles Pest Control portal destruction victory and Void Knight defeat', () => {
    const engine = new MinigameMatchmakingEngine();
    const players = [
      { playerId: 'p1', name: 'Defender', combatLevel: 100, queuedAt: Date.now() },
    ];

    // 1. Victory scenario: Destroy all 4 portals
    const match1 = engine.createMatch('PEST_CONTROL', players, 600);
    expect(match1.pestControl?.activePortals).toHaveLength(4);

    engine.destroyPestControlPortal(match1.matchId, 'BLUE');
    engine.destroyPestControlPortal(match1.matchId, 'PURPLE');
    engine.destroyPestControlPortal(match1.matchId, 'YELLOW');
    const vic = engine.destroyPestControlPortal(match1.matchId, 'RED');

    expect(vic.status).toBe('COMPLETED');
    expect(vic.winner).toBe('VICTORY');

    // 2. Defeat scenario: Void Knight killed
    const match2 = engine.createMatch('PEST_CONTROL', players, 600);
    const def = engine.damageVoidKnight(match2.matchId, 200);
    expect(def.status).toBe('COMPLETED');
    expect(def.winner).toBe('DEFEAT');
  });
});
