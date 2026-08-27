/**
 * Saints Gaming — Player Battles (PvP) & Wilderness Combat Engine (Rule 9 & Bible 14)
 * Authoritative Player Battles state machine: duels with custom rules/stakes, wilderness danger brackets, skulling, and death penalties.
 */

export interface DuelRules {
  allowPotions: boolean;
  allowMagic: boolean;
  allowBuddies: boolean;
  allowFood: boolean;
  stakeGold: number;
}

export type DuelStatus =
  | 'CHALLENGED'
  | 'ACCEPTED'
  | 'COUNTDOWN'
  | 'FIGHTING'
  | 'COMPLETED'
  | 'CANCELLED';

export interface DuelSession {
  duelId: string;
  challenger: {
    playerId: string;
    name: string;
    hp: number;
    maxHp: number;
    accepted: boolean;
  };
  target: {
    playerId: string;
    name: string;
    hp: number;
    maxHp: number;
    accepted: boolean;
  };
  rules: DuelRules;
  status: DuelStatus;
  stakePot: number;
  winnerId?: string;
  loserId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface InventoryItemForLoss {
  itemId: string;
  value: number; // GE base price / alch value
  quantity: number;
}

export class PlayerBattleEngine {
  private duels = new Map<string, DuelSession>();
  private skulls = new Map<string, number>(); // playerId -> skullExpiresAt timestamp

  /**
   * Initiates a friendly staked/non-staked Player Battle challenge.
   */
  public challengePlayer(
    challengerId: string,
    challengerName: string,
    challengerHp: number,
    targetId: string,
    targetName: string,
    targetHp: number,
    rules: DuelRules
  ): DuelSession {
    const duelId = `duel_${challengerId}_${targetId}_${Date.now()}`;
    const stake = Math.max(0, Math.floor(rules.stakeGold || 0));

    const session: DuelSession = {
      duelId,
      challenger: {
        playerId: challengerId,
        name: challengerName,
        hp: challengerHp,
        maxHp: challengerHp,
        accepted: true,
      },
      target: {
        playerId: targetId,
        name: targetName,
        hp: targetHp,
        maxHp: targetHp,
        accepted: false,
      },
      rules: { ...rules, stakeGold: stake },
      status: 'CHALLENGED',
      stakePot: stake * 2,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.duels.set(duelId, session);
    return session;
  }

  /**
   * Target accepts the duel challenge and rule set.
   */
  public acceptChallenge(duelId: string, targetId: string): DuelSession {
    const duel = this.duels.get(duelId);
    if (!duel) throw new Error(`Duel '${duelId}' not found`);
    if (duel.target.playerId !== targetId) throw new Error('Unauthorized duel acceptance');

    duel.target.accepted = true;
    duel.status = 'ACCEPTED';
    duel.updatedAt = Date.now();
    return duel;
  }

  /**
   * Starts the 3-second duel arena countdown.
   */
  public startCountdown(duelId: string): DuelSession {
    const duel = this.duels.get(duelId);
    if (!duel || duel.status !== 'ACCEPTED') throw new Error('Duel not in accepted state');

    duel.status = 'COUNTDOWN';
    duel.updatedAt = Date.now();
    return duel;
  }

  /**
   * Commences the active Player Battle fighting state.
   */
  public startFight(duelId: string): DuelSession {
    const duel = this.duels.get(duelId);
    if (!duel || (duel.status !== 'COUNTDOWN' && duel.status !== 'ACCEPTED')) {
      throw new Error('Duel cannot start fighting');
    }

    duel.status = 'FIGHTING';
    duel.updatedAt = Date.now();
    return duel;
  }

  /**
   * Applies damage to a participant in an active Player Battle.
   */
  public applyDuelDamage(
    duelId: string,
    targetPlayerId: string,
    damage: number
  ): { duel: DuelSession; winnerId?: string; loserId?: string } {
    const duel = this.duels.get(duelId);
    if (!duel || duel.status !== 'FIGHTING') throw new Error('Duel not currently active');

    const participant =
      duel.challenger.playerId === targetPlayerId
        ? duel.challenger
        : duel.target.playerId === targetPlayerId
        ? duel.target
        : null;

    if (!participant) throw new Error('Target player not in duel');

    participant.hp = Math.max(0, participant.hp - Math.floor(damage));
    duel.updatedAt = Date.now();

    if (participant.hp === 0) {
      const isChallengerLoser = duel.challenger.playerId === targetPlayerId;
      duel.winnerId = isChallengerLoser ? duel.target.playerId : duel.challenger.playerId;
      duel.loserId = targetPlayerId;
      duel.status = 'COMPLETED';
      return { duel, winnerId: duel.winnerId, loserId: duel.loserId };
    }

    return { duel };
  }

  /**
   * Cancels or forfeits a duel.
   */
  public cancelDuel(duelId: string, playerId: string): DuelSession {
    const duel = this.duels.get(duelId);
    if (!duel) throw new Error(`Duel '${duelId}' not found`);

    duel.status = 'CANCELLED';
    duel.updatedAt = Date.now();
    return duel;
  }

  // ─── WILDERNESS & SKULLING ──────────────────────────────────────────────────

  /**
   * Checks if an attacker can engage a defender based on combat levels and wilderness depth.
   */
  public isEligibleToAttack(
    attackerLevel: number,
    defenderLevel: number,
    wildernessLevel: number
  ): { eligible: boolean; minLevel: number; maxLevel: number } {
    const minLevel = Math.max(3, attackerLevel - wildernessLevel);
    const maxLevel = Math.min(126, attackerLevel + wildernessLevel);
    const eligible = defenderLevel >= minLevel && defenderLevel <= maxLevel;

    return { eligible, minLevel, maxLevel };
  }

  /**
   * Applies skulling status when an attacker initiates combat against an unskulled player.
   */
  public applySkull(
    attackerId: string,
    isDefenderSkulled: boolean,
    durationMinutes: number = 20,
    now: number = Date.now()
  ): { skulled: boolean; skullExpiresAt: number } {
    if (isDefenderSkulled) {
      // Self-defense / attacking another skulled player does not apply a new skull
      const existing = this.skulls.get(attackerId) || 0;
      return { skulled: existing > now, skullExpiresAt: existing };
    }

    const skullExpiresAt = now + durationMinutes * 60 * 1000;
    this.skulls.set(attackerId, skullExpiresAt);
    return { skulled: true, skullExpiresAt };
  }

  /**
   * Checks if a player currently has an active skull penalty.
   */
  public isSkulled(playerId: string, now: number = Date.now()): boolean {
    const expiresAt = this.skulls.get(playerId);
    if (!expiresAt) return false;
    if (now > expiresAt) {
      this.skulls.delete(playerId);
      return false;
    }
    return true;
  }

  /**
   * Calculates protected vs dropped items on PvP death.
   * Unskulled: Protects 3 items (or 4 with protectItemActive).
   * Skulled: Protects 0 items (or 1 with protectItemActive).
   */
  public calculateLostItemsOnDeath(
    items: InventoryItemForLoss[],
    isSkulled: boolean,
    protectItemActive: boolean = false
  ): { protectedItems: Array<{ itemId: string; quantity: number }>; droppedItems: Array<{ itemId: string; quantity: number }> } {
    const protectionLimit = (isSkulled ? 0 : 3) + (protectItemActive ? 1 : 0);

    // Expand items into single units sorted by value descending
    const individualItems: Array<{ itemId: string; value: number }> = [];
    for (const item of items) {
      for (let i = 0; i < item.quantity; i++) {
        individualItems.push({ itemId: item.itemId, value: item.value });
      }
    }

    individualItems.sort((a, b) => b.value - a.value);

    const protectedList = individualItems.slice(0, protectionLimit);
    const droppedList = individualItems.slice(protectionLimit);

    const groupItems = (arr: Array<{ itemId: string; value: number }>) => {
      const counts: Record<string, number> = {};
      for (const item of arr) {
        counts[item.itemId] = (counts[item.itemId] || 0) + 1;
      }
      return Object.entries(counts).map(([itemId, quantity]) => ({ itemId, quantity }));
    };

    return {
      protectedItems: groupItems(protectedList),
      droppedItems: groupItems(droppedList),
    };
  }
}
