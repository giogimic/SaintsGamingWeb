/**
 * Saints Gaming — Sanctuary House Privacy, Guest Tip Jar & Dungeon Defense Engine (Bible 13)
 * Manages player estate guest modes, tip jar ledger, dungeon defense traps, guard creature assignments, and visitor challenge runs.
 */

export type SanctuaryPrivacyMode = 'PRIVATE' | 'FRIENDS_ONLY' | 'OPEN_HOUSE';

export type TrapType = 'SPIKE_TRAP' | 'POISON_DART' | 'FLAME_JET' | 'TENTACLE_PIT';

export interface DungeonTrap {
  id: string;
  type: TrapType;
  roomX: number;
  roomY: number;
  tileX: number;
  tileY: number;
  damage: number;
  disarmReqLevel: number;
}

export interface DungeonGuard {
  id: string;
  creatureSlug: string;
  name: string;
  level: number;
  roomX: number;
  roomY: number;
  hp: number;
  maxHp: number;
}

export interface SanctuaryDefenseProfile {
  estateId: string;
  ownerId: string;
  privacyMode: SanctuaryPrivacyMode;
  friendsList: string[];
  bannedList: string[];
  tipJarCoins: number;
  traps: DungeonTrap[];
  guards: DungeonGuard[];
}

export const TRAP_STATS: Record<TrapType, { baseDamage: number; reqLevel: number }> = {
  SPIKE_TRAP: { baseDamage: 15, reqLevel: 20 },
  POISON_DART: { baseDamage: 25, reqLevel: 45 },
  FLAME_JET: { baseDamage: 40, reqLevel: 65 },
  TENTACLE_PIT: { baseDamage: 60, reqLevel: 85 },
};

export class SanctuaryDefenseEngine {
  private profiles = new Map<string, SanctuaryDefenseProfile>();

  /**
   * Initializes or gets the defense & guest profile for an estate.
   */
  public createProfile(estateId: string, ownerId: string): SanctuaryDefenseProfile {
    const existing = this.profiles.get(estateId);
    if (existing) return existing;

    const profile: SanctuaryDefenseProfile = {
      estateId,
      ownerId,
      privacyMode: 'OPEN_HOUSE',
      friendsList: [],
      bannedList: [],
      tipJarCoins: 0,
      traps: [],
      guards: [],
    };

    this.profiles.set(estateId, profile);
    return profile;
  }

  /**
   * Updates the sanctuary privacy mode.
   */
  public setPrivacyMode(estateId: string, ownerId: string, mode: SanctuaryPrivacyMode): SanctuaryDefenseProfile {
    const profile = this.profiles.get(estateId);
    if (!profile || profile.ownerId !== ownerId) throw new Error('Unauthorized estate modification');

    profile.privacyMode = mode;
    return profile;
  }

  /**
   * Evaluates if a visitor is permitted to enter the sanctuary estate.
   */
  public canPlayerEnter(estateId: string, visitorId: string, isFriend: boolean = false): boolean {
    const profile = this.profiles.get(estateId);
    if (!profile) return false;

    if (profile.ownerId === visitorId) return true;
    if (profile.bannedList.includes(visitorId)) return false;

    switch (profile.privacyMode) {
      case 'OPEN_HOUSE':
        return true;
      case 'FRIENDS_ONLY':
        return isFriend || profile.friendsList.includes(visitorId);
      case 'PRIVATE':
      default:
        return false;
    }
  }

  /**
   * Deposits coins into the estate owner's Tip Jar.
   */
  public depositTip(estateId: string, visitorId: string, amount: number): number {
    const profile = this.profiles.get(estateId);
    if (!profile) throw new Error('Estate profile not found');
    if (profile.ownerId === visitorId) throw new Error('Owner cannot tip their own jar');

    const cleanAmount = Math.max(0, Math.floor(amount));
    profile.tipJarCoins += cleanAmount;
    return profile.tipJarCoins;
  }

  /**
   * Withdraws coins from the Tip Jar by the owner.
   */
  public withdrawTip(estateId: string, ownerId: string, amount?: number): number {
    const profile = this.profiles.get(estateId);
    if (!profile || profile.ownerId !== ownerId) throw new Error('Unauthorized tip withdrawal');

    const withdrawal = amount !== undefined ? Math.min(profile.tipJarCoins, Math.max(0, Math.floor(amount))) : profile.tipJarCoins;
    profile.tipJarCoins -= withdrawal;
    return withdrawal;
  }

  // ─── DUNGEON DEFENSE & TRAPS ────────────────────────────────────────────────

  /**
   * Places a trap in the player's subterranean estate dungeon.
   */
  public addTrap(estateId: string, ownerId: string, trap: Omit<DungeonTrap, 'id'>): DungeonTrap {
    const profile = this.profiles.get(estateId);
    if (!profile || profile.ownerId !== ownerId) throw new Error('Unauthorized estate modification');

    const newTrap: DungeonTrap = {
      id: `trap_${trap.type.toLowerCase()}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      ...trap,
    };

    profile.traps.push(newTrap);
    return newTrap;
  }

  /**
   * Assigns a guard creature to an estate dungeon room.
   */
  public assignGuard(estateId: string, ownerId: string, guard: Omit<DungeonGuard, 'id'>): DungeonGuard {
    const profile = this.profiles.get(estateId);
    if (!profile || profile.ownerId !== ownerId) throw new Error('Unauthorized estate modification');

    const newGuard: DungeonGuard = {
      id: `guard_${guard.creatureSlug}_${Date.now()}`,
      ...guard,
    };

    profile.guards.push(newGuard);
    return newGuard;
  }

  /**
   * Evaluates a visitor triggering/disarming a trap.
   */
  public triggerTrap(
    estateId: string,
    roomX: number,
    roomY: number,
    tileX: number,
    tileY: number,
    visitorThievingLevel: number
  ): { trapTriggered: boolean; disarmed: boolean; damageDealt: number; trap?: DungeonTrap } {
    const profile = this.profiles.get(estateId);
    if (!profile) return { trapTriggered: false, disarmed: false, damageDealt: 0 };

    const trap = profile.traps.find(
      (t) => t.roomX === roomX && t.roomY === roomY && t.tileX === tileX && t.tileY === tileY
    );

    if (!trap) return { trapTriggered: false, disarmed: false, damageDealt: 0 };

    // If visitor has higher thieving level than requirement -> disarmed
    if (visitorThievingLevel >= trap.disarmReqLevel) {
      return { trapTriggered: false, disarmed: true, damageDealt: 0, trap };
    }

    return { trapTriggered: true, disarmed: false, damageDealt: trap.damage, trap };
  }
}
