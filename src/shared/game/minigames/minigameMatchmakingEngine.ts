/**
 * Saints Gaming — Minigame Matchmaking Lobby, Team Balancing & Objective Engine (Bible 24 & 25)
 * Manages multiplayer minigame queues, automatic team balancing, lobby countdowns, and objective state tracking.
 */

export type MinigameType =
  | 'CASTLE_WARS'
  | 'PEST_CONTROL'
  | 'SOUL_WARS'
  | 'BARBARIAN_ASSAULT';

export interface QueuedPlayer {
  playerId: string;
  name: string;
  combatLevel: number;
  partyId?: string;
  queuedAt: number;
}

export type MatchStatus =
  | 'WAITING_LOBBY'
  | 'STARTING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface CastleWarsObjectives {
  teamAScore: number; // Saradomin
  teamBScore: number; // Zamorak
  teamABarricades: number;
  teamBBarricades: number;
}

export interface PestControlObjectives {
  voidKnightHp: number;
  maxVoidKnightHp: number;
  activePortals: string[]; // ['BLUE', 'PURPLE', 'YELLOW', 'RED']
}

export interface MatchSession {
  matchId: string;
  type: MinigameType;
  status: MatchStatus;
  teamA: QueuedPlayer[];
  teamB: QueuedPlayer[];
  lobbyCountdown: number;
  remainingSeconds: number;
  castleWars?: CastleWarsObjectives;
  pestControl?: PestControlObjectives;
  winner?: 'TEAM_A' | 'TEAM_B' | 'DRAW' | 'VICTORY' | 'DEFEAT';
  createdAt: number;
  updatedAt: number;
}

export class MinigameMatchmakingEngine {
  private queues = new Map<MinigameType, QueuedPlayer[]>();
  private activeMatches = new Map<string, MatchSession>();

  constructor() {
    this.queues.set('CASTLE_WARS', []);
    this.queues.set('PEST_CONTROL', []);
    this.queues.set('SOUL_WARS', []);
    this.queues.set('BARBARIAN_ASSAULT', []);
  }

  /**
   * Adds a player to a minigame matchmaking queue.
   */
  public joinQueue(type: MinigameType, player: QueuedPlayer): number {
    const queue = this.queues.get(type) || [];
    if (!queue.some((p) => p.playerId === player.playerId)) {
      queue.push(player);
      this.queues.set(type, queue);
    }
    return queue.length;
  }

  /**
   * Removes a player from a queue.
   */
  public leaveQueue(type: MinigameType, playerId: string): boolean {
    const queue = this.queues.get(type) || [];
    const filtered = queue.filter((p) => p.playerId !== playerId);
    this.queues.set(type, filtered);
    return filtered.length !== queue.length;
  }

  /**
   * Balances players into two equal teams based on combat levels and party cohesion.
   */
  public balanceTeams(players: QueuedPlayer[]): { teamA: QueuedPlayer[]; teamB: QueuedPlayer[] } {
    // Sort descending by combat level
    const sorted = [...players].sort((a, b) => b.combatLevel - a.combatLevel);
    const teamA: QueuedPlayer[] = [];
    const teamB: QueuedPlayer[] = [];

    let sumA = 0;
    let sumB = 0;

    for (const player of sorted) {
      if (teamA.length <= teamB.length && sumA <= sumB) {
        teamA.push(player);
        sumA += player.combatLevel;
      } else {
        teamB.push(player);
        sumB += player.combatLevel;
      }
    }

    return { teamA, teamB };
  }

  /**
   * Creates an active minigame match session.
   */
  public createMatch(
    type: MinigameType,
    players: QueuedPlayer[],
    durationSeconds: number = 1200
  ): MatchSession {
    const matchId = `match_${type.toLowerCase()}_${Date.now()}`;
    const { teamA, teamB } = this.balanceTeams(players);

    const session: MatchSession = {
      matchId,
      type,
      status: 'IN_PROGRESS',
      teamA,
      teamB,
      lobbyCountdown: 0,
      remainingSeconds: durationSeconds,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (type === 'CASTLE_WARS') {
      session.castleWars = {
        teamAScore: 0,
        teamBScore: 0,
        teamABarricades: 0,
        teamBBarricades: 0,
      };
    } else if (type === 'PEST_CONTROL') {
      session.pestControl = {
        voidKnightHp: 200,
        maxVoidKnightHp: 200,
        activePortals: ['BLUE', 'PURPLE', 'YELLOW', 'RED'],
      };
    }

    this.activeMatches.set(matchId, session);
    return session;
  }

  /**
   * Scores a flag capture in Castle Wars.
   */
  public scoreCastleWarsFlag(matchId: string, scoringTeam: 'TEAM_A' | 'TEAM_B'): MatchSession {
    const match = this.activeMatches.get(matchId);
    if (!match || !match.castleWars || match.status !== 'IN_PROGRESS') {
      throw new Error('Valid Castle Wars match not found');
    }

    if (scoringTeam === 'TEAM_A') {
      match.castleWars.teamAScore++;
    } else {
      match.castleWars.teamBScore++;
    }

    match.updatedAt = Date.now();
    return match;
  }

  /**
   * Destroys a portal in Pest Control.
   */
  public destroyPestControlPortal(matchId: string, portalKey: string): MatchSession {
    const match = this.activeMatches.get(matchId);
    if (!match || !match.pestControl || match.status !== 'IN_PROGRESS') {
      throw new Error('Valid Pest Control match not found');
    }

    match.pestControl.activePortals = match.pestControl.activePortals.filter(
      (p) => p !== portalKey
    );

    // If all 4 portals destroyed -> Victory!
    if (match.pestControl.activePortals.length === 0) {
      match.status = 'COMPLETED';
      match.winner = 'VICTORY';
    }

    match.updatedAt = Date.now();
    return match;
  }

  /**
   * Applies damage to the Void Knight in Pest Control.
   */
  public damageVoidKnight(matchId: string, damage: number): MatchSession {
    const match = this.activeMatches.get(matchId);
    if (!match || !match.pestControl || match.status !== 'IN_PROGRESS') {
      throw new Error('Valid Pest Control match not found');
    }

    match.pestControl.voidKnightHp = Math.max(0, match.pestControl.voidKnightHp - damage);

    if (match.pestControl.voidKnightHp === 0) {
      match.status = 'COMPLETED';
      match.winner = 'DEFEAT';
    }

    match.updatedAt = Date.now();
    return match;
  }

  /**
   * Concludes the match and settles zeal point / token awards.
   */
  public concludeMatch(matchId: string): { match: MatchSession; zealReward: number } {
    const match = this.activeMatches.get(matchId);
    if (!match) throw new Error('Match not found');

    if (match.type === 'CASTLE_WARS' && match.castleWars) {
      match.status = 'COMPLETED';
      if (match.castleWars.teamAScore > match.castleWars.teamBScore) {
        match.winner = 'TEAM_A';
      } else if (match.castleWars.teamBScore > match.castleWars.teamAScore) {
        match.winner = 'TEAM_B';
      } else {
        match.winner = 'DRAW';
      }
    }

    let zeal = 0;
    if (match.winner === 'VICTORY' || match.winner === 'TEAM_A' || match.winner === 'TEAM_B') {
      zeal = 3; // Win
    } else if (match.winner === 'DRAW') {
      zeal = 1; // Draw
    } else {
      zeal = 0; // Loss
    }

    match.updatedAt = Date.now();
    return { match, zealReward: zeal };
  }
}
