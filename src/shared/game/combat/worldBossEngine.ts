/**
 * Saints Gaming — World Boss Dynamic Scaling, Enrage Timers & Shared Loot Ledger Engine (Bible 14 & Rule 8)
 * Manages dynamically scaled Hero Battles, multi-phase mechanics, enrage timers, and contribution-weighted loot.
 */

export type BossPhase =
  | 'PHASE_1_CLEAVE'
  | 'PHASE_2_ADDS'
  | 'PHASE_3_CATACLYSM'
  | 'DEFEATED';

export interface EnrageStatus {
  isSoftEnraged: boolean; // Triggered at <= 50% HP
  isHardEnraged: boolean; // Triggered when duration >= hardEnrageLimitSeconds
}

export interface BossParticipantContribution {
  playerId: string;
  playerName: string;
  damageDealt: number;
  healingDone: number;
  damageAbsorbed: number;
  totalScore: number;
}

export interface WorldBossSession {
  bossId: string;
  bossName: string;
  baseMaxHp: number;
  hpPerParticipant: number;
  currentHp: number;
  maxHp: number;
  phase: BossPhase;
  enrage: EnrageStatus;
  startTime: number;
  hardEnrageLimitSeconds: number;
  participants: Map<string, BossParticipantContribution>;
}

export type LootRollTier =
  | 'MVP_UNIQUE'
  | 'HIGH_CONTRIBUTION'
  | 'STANDARD_LOOT'
  | 'PARTICIPATION_ONLY';

export interface ParticipantLootResult {
  playerId: string;
  playerName: string;
  totalScore: number;
  contributionPercent: number;
  tier: LootRollTier;
}

export class WorldBossEngine {
  /**
   * Initializes a world boss session with dynamic scaling parameters.
   */
  public createBossSession(
    bossId: string,
    bossName: string,
    baseMaxHp: number = 10000,
    hpPerParticipant: number = 2500,
    hardEnrageLimitSeconds: number = 600
  ): WorldBossSession {
    return {
      bossId,
      bossName,
      baseMaxHp,
      hpPerParticipant,
      currentHp: baseMaxHp,
      maxHp: baseMaxHp,
      phase: 'PHASE_1_CLEAVE',
      enrage: {
        isSoftEnraged: false,
        isHardEnraged: false,
      },
      startTime: Date.now(),
      hardEnrageLimitSeconds,
      participants: new Map<string, BossParticipantContribution>(),
    };
  }

  /**
   * Registers a player into the boss arena and dynamically scales boss health.
   */
  public registerParticipant(
    session: WorldBossSession,
    playerId: string,
    playerName: string
  ): WorldBossSession {
    if (!session.participants.has(playerId)) {
      session.participants.set(playerId, {
        playerId,
        playerName,
        damageDealt: 0,
        healingDone: 0,
        damageAbsorbed: 0,
        totalScore: 0,
      });

      // Scale Max HP with participants beyond the 1st
      const count = session.participants.size;
      const prevMax = session.maxHp;
      session.maxHp = session.baseMaxHp + Math.max(0, count - 1) * session.hpPerParticipant;
      const hpGain = session.maxHp - prevMax;
      session.currentHp += hpGain;
    }

    return session;
  }

  /**
   * Records combat contribution (damage, healing, damage absorbed) for a player.
   */
  public recordContribution(
    session: WorldBossSession,
    playerId: string,
    damage: number = 0,
    healing: number = 0,
    absorbed: number = 0
  ): WorldBossSession {
    let p = session.participants.get(playerId);
    if (!p) {
      this.registerParticipant(session, playerId, `Player_${playerId}`);
      p = session.participants.get(playerId)!;
    }

    p.damageDealt += Math.max(0, damage);
    p.healingDone += Math.max(0, healing);
    p.damageAbsorbed += Math.max(0, absorbed);

    // Contribution Score: 1x Damage + 1.25x Healing + 0.5x Absorbed
    p.totalScore = p.damageDealt + Math.round(p.healingDone * 1.25) + Math.round(p.damageAbsorbed * 0.5);

    // Apply damage to boss HP
    session.currentHp = Math.max(0, session.currentHp - damage);

    return session;
  }

  /**
   * Evaluates boss tick state: phase shifts, enrage triggers, and defeat.
   */
  public tickBossState(
    session: WorldBossSession,
    now: number = Date.now()
  ): { phaseChanged: boolean; newPhase: BossPhase; isHardEnraged: boolean; isDefeated: boolean } {
    const prevPhase = session.phase;
    const hpRatio = session.maxHp > 0 ? session.currentHp / session.maxHp : 0;
    const elapsedSeconds = (now - session.startTime) / 1000;

    // 1. Defeat check
    if (session.currentHp <= 0) {
      session.phase = 'DEFEATED';
      return {
        phaseChanged: prevPhase !== 'DEFEATED',
        newPhase: 'DEFEATED',
        isHardEnraged: session.enrage.isHardEnraged,
        isDefeated: true,
      };
    }

    // 2. Enrage check
    if (hpRatio <= 0.5) {
      session.enrage.isSoftEnraged = true;
    }
    if (elapsedSeconds >= session.hardEnrageLimitSeconds) {
      session.enrage.isHardEnraged = true;
    }

    // 3. Phase Shifts: Phase 1 (>66% HP) -> Phase 2 (33%–66% HP) -> Phase 3 (<33% HP)
    if (hpRatio <= 0.33) {
      session.phase = 'PHASE_3_CATACLYSM';
    } else if (hpRatio <= 0.66) {
      session.phase = 'PHASE_2_ADDS';
    } else {
      session.phase = 'PHASE_1_CLEAVE';
    }

    return {
      phaseChanged: prevPhase !== session.phase,
      newPhase: session.phase,
      isHardEnraged: session.enrage.isHardEnraged,
      isDefeated: false,
    };
  }

  /**
   * Calculates shared loot distribution ledger based on total relative contribution scores.
   */
  public calculateLootLedger(session: WorldBossSession): ParticipantLootResult[] {
    const list = Array.from(session.participants.values());
    const totalScorePool = list.reduce((sum, p) => sum + p.totalScore, 0);

    if (totalScorePool === 0) {
      return list.map((p) => ({
        playerId: p.playerId,
        playerName: p.playerName,
        totalScore: 0,
        contributionPercent: 0,
        tier: 'PARTICIPATION_ONLY',
      }));
    }

    // Sort descending by score
    list.sort((a, b) => b.totalScore - a.totalScore);

    return list.map((p, index) => {
      const contributionPercent = Number(((p.totalScore / totalScorePool) * 100).toFixed(1));

      let tier: LootRollTier = 'PARTICIPATION_ONLY';
      if (index === 0 && contributionPercent >= 15) {
        tier = 'MVP_UNIQUE';
      } else if (contributionPercent >= 10) {
        tier = 'HIGH_CONTRIBUTION';
      } else if (contributionPercent >= 2) {
        tier = 'STANDARD_LOOT';
      }

      return {
        playerId: p.playerId,
        playerName: p.playerName,
        totalScore: p.totalScore,
        contributionPercent,
        tier,
      };
    });
  }
}
