/**
 * Saints Gaming — Master Raid Mechanics, Mythic Encounter Phases & Dynamic Wipe Recovery Engine (Bible 11, 15, 23, 30)
 * Manages multi-phase raid boss state machines, threat aggro calculation with role multipliers, and full encounter wipe reset orchestration.
 */

export type RaidRole = 'TANK' | 'DPS' | 'HEALER';

export type BossPhaseType =
  | 'PHASE_1_GROUND'
  | 'PHASE_2_AIRBORNE_ADDS'
  | 'PHASE_3_ENRAGED_CORE'
  | 'ENRAGED_BERSERK';

export interface BossPhaseDef {
  phase: BossPhaseType;
  healthThresholdPct: number; // e.g. 100, 75, 50, 25
  description: string;
}

export interface RaidBossDefinition {
  bossId: string;
  name: string;
  maxHealth: number;
  enrageDurationMs: number;
  phases: BossPhaseDef[];
}

export interface RaidParticipant {
  playerId: string;
  role: RaidRole;
  isRanged: boolean;
  isAlive: boolean;
  threat: number;
}

export interface RaidEncounterState {
  encounterId: string;
  boss: RaidBossDefinition;
  currentHealth: number;
  currentPhase: BossPhaseType;
  startTime: number;
  isArenaLocked: boolean;
  isEnraged: boolean;
  isDefeated: boolean;
  isWiped: boolean;
  targetPlayerId?: string;
  participants: Map<string, RaidParticipant>;
}

export class RaidEncounterEngine {
  /**
   * Initializes a new raid encounter instance.
   */
  public createEncounter(
    encounterId: string,
    boss: RaidBossDefinition,
    participants: Array<{ playerId: string; role: RaidRole; isRanged?: boolean }>,
    nowMs: number = Date.now()
  ): RaidEncounterState {
    const partMap = new Map<string, RaidParticipant>();
    for (const p of participants) {
      partMap.set(p.playerId, {
        playerId: p.playerId,
        role: p.role,
        isRanged: !!p.isRanged,
        isAlive: true,
        threat: 0,
      });
    }

    // Default to first phase
    const initialPhase = boss.phases[0]?.phase || 'PHASE_1_GROUND';

    return {
      encounterId,
      boss: { ...boss },
      currentHealth: boss.maxHealth,
      currentPhase: initialPhase,
      startTime: nowMs,
      isArenaLocked: true,
      isEnraged: false,
      isDefeated: false,
      isWiped: false,
      participants: partMap,
    };
  }

  /**
   * Evaluates combat action (Damage or Healing), calculates threat with role multipliers, checks phase shifts and aggro target.
   */
  public recordCombatAction(
    encounter: RaidEncounterState,
    playerId: string,
    amount: number,
    actionType: 'DAMAGE' | 'HEALING',
    nowMs: number = Date.now()
  ): {
    damageApplied: number;
    phaseShifted?: BossPhaseType;
    aggroTargetSwitched?: string;
    isEnraged?: boolean;
    isDefeated?: boolean;
  } {
    if (encounter.isDefeated || encounter.isWiped) {
      return { damageApplied: 0 };
    }

    const participant = encounter.participants.get(playerId);
    if (!participant || !participant.isAlive) {
      return { damageApplied: 0 };
    }

    // Check enrage timer
    if (!encounter.isEnraged && nowMs - encounter.startTime >= encounter.boss.enrageDurationMs) {
      encounter.isEnraged = true;
      encounter.currentPhase = 'ENRAGED_BERSERK';
    }

    // Threat calculation with role multipliers
    let threatMultiplier = 1.0;
    if (actionType === 'DAMAGE') {
      if (participant.role === 'TANK') threatMultiplier = 4.0;
      else if (participant.role === 'DPS') threatMultiplier = 1.0;
      else if (participant.role === 'HEALER') threatMultiplier = 0.5;
    } else {
      // Healing generates 0.5x threat across all roles
      threatMultiplier = 0.5;
    }

    participant.threat += Math.round(amount * threatMultiplier);

    // Apply boss damage
    let damageApplied = 0;
    if (actionType === 'DAMAGE') {
      damageApplied = amount;
      encounter.currentHealth = Math.max(0, encounter.currentHealth - amount);

      if (encounter.currentHealth === 0) {
        encounter.isDefeated = true;
        encounter.isArenaLocked = false;
        return { damageApplied, isDefeated: true };
      }
    }

    // Check phase transition
    let phaseShifted: BossPhaseType | undefined;
    if (!encounter.isEnraged) {
      const healthPct = (encounter.currentHealth / encounter.boss.maxHealth) * 100;
      for (let i = encounter.boss.phases.length - 1; i >= 0; i--) {
        const ph = encounter.boss.phases[i];
        if (healthPct <= ph.healthThresholdPct) {
          if (encounter.currentPhase !== ph.phase) {
            encounter.currentPhase = ph.phase;
            phaseShifted = ph.phase;
          }
          break;
        }
      }
    }

    // Evaluate top threat target with over-aggro buffer (110% melee, 130% ranged)
    let aggroTargetSwitched: string | undefined;
    const currentTarget = encounter.targetPlayerId
      ? encounter.participants.get(encounter.targetPlayerId)
      : undefined;

    if (!currentTarget || !currentTarget.isAlive) {
      // Pick highest threat living participant
      let highestThreat = -1;
      let topId: string | undefined;
      for (const p of encounter.participants.values()) {
        if (p.isAlive && p.threat > highestThreat) {
          highestThreat = p.threat;
          topId = p.playerId;
        }
      }
      if (topId && topId !== encounter.targetPlayerId) {
        encounter.targetPlayerId = topId;
        aggroTargetSwitched = topId;
      }
    } else {
      // To pull aggro from current target: needs 110% (melee) or 130% (ranged)
      const currentThreat = currentTarget.threat;
      for (const p of encounter.participants.values()) {
        if (!p.isAlive || p.playerId === currentTarget.playerId) continue;

        const threshold = p.isRanged ? 1.3 : 1.1;
        if (p.threat >= currentThreat * threshold) {
          encounter.targetPlayerId = p.playerId;
          aggroTargetSwitched = p.playerId;
          break;
        }
      }
    }

    return {
      damageApplied,
      phaseShifted,
      aggroTargetSwitched,
      isEnraged: encounter.isEnraged,
    };
  }

  /**
   * Records player death and evaluates total encounter wipe.
   */
  public recordPlayerDeath(
    encounter: RaidEncounterState,
    playerId: string
  ): { isWiped: boolean } {
    const p = encounter.participants.get(playerId);
    if (p) {
      p.isAlive = false;
      p.threat = 0;
    }

    // If current aggro target died, reset target
    if (encounter.targetPlayerId === playerId) {
      encounter.targetPlayerId = undefined;
    }

    // Check if all players are dead
    const anyAlive = Array.from(encounter.participants.values()).some((part) => part.isAlive);
    if (!anyAlive) {
      encounter.isWiped = true;
      encounter.isArenaLocked = false;
      return { isWiped: true };
    }

    return { isWiped: false };
  }

  /**
   * Executes wipe recovery reset: restores boss to full health, unlocks arena, resets threat and phases.
   */
  public executeWipeReset(
    encounter: RaidEncounterState,
    nowMs: number = Date.now()
  ): { resetComplete: boolean; arenaUnlocked: boolean } {
    encounter.currentHealth = encounter.boss.maxHealth;
    encounter.currentPhase = encounter.boss.phases[0]?.phase || 'PHASE_1_GROUND';
    encounter.startTime = nowMs;
    encounter.isArenaLocked = false;
    encounter.isEnraged = false;
    encounter.isDefeated = false;
    encounter.isWiped = false;
    encounter.targetPlayerId = undefined;

    for (const p of encounter.participants.values()) {
      p.isAlive = true;
      p.threat = 0;
    }

    return {
      resetComplete: true,
      arenaUnlocked: true,
    };
  }
}
