/**
 * Saints Gaming — Master Gathering Node Respawn, Dynamic Yield Depletion & Resource Vein Quality Engine (Bible 04, 18, 27, 31)
 * Manages profession gathering nodes, quality tiers, dynamic charge depletion, player density-adjusted respawn decay timers, and double-strike critical harvests.
 */

export type GatheringProfession =
  | 'MINING'
  | 'WOODCUTTING'
  | 'HERBLORE_FORAGING'
  | 'FISHING'
  | 'FARMING'
  | 'HUNTER'
  | 'mining'
  | 'woodcutting'
  | 'fishing'
  | 'farming'
  | 'hunter'
  | 'herblore';

export type VeinQuality = 'NORMAL' | 'RICH_VEIN' | 'PRISTINE_CORE';

export interface ResourceNodeDefinition {
  id: string;
  name: string;
  profession: GatheringProfession;
  requiredSkillLevel: number;
  baseYieldItemId: string;
  baseYieldQuantity: number;
  rareYieldItemId?: string;
  maxCharges: number;
  baseRespawnDurationMs: number;
  baseXp: number;
}

export interface ActiveResourceNode {
  instanceId: string;
  definitionId: string;
  zoneId: string;
  quality: VeinQuality;
  remainingCharges: number;
  isDepleted: boolean;
  depletedAt?: number;
  respawnAt?: number;
}

export interface ToolProficiency {
  toolTier: 'BRONZE' | 'IRON' | 'STEEL' | 'MITHRIL' | 'ADAMANT' | 'RUNITE' | 'CRYSTAL';
  doubleStrikeChancePct: number;
  xpMultiplier: number;
}

export interface HarvestResult {
  success: boolean;
  itemsAwarded: Array<{ itemId: string; quantity: number }>;
  isDoubleStrike: boolean;
  xpAwarded: number;
  nodeDepleted: boolean;
  remainingCharges: number;
  error?: string;
}

export class ResourceGatheringEngine {
  private nodeDefs = new Map<string, ResourceNodeDefinition>();
  private activeNodes = new Map<string, ActiveResourceNode>();

  /**
   * Registers a resource node definition.
   */
  public registerNodeDefinition(def: ResourceNodeDefinition) {
    this.nodeDefs.set(def.id, { ...def });
  }

  /**
   * Spawns an active resource node in a given zone with quality tier.
   */
  public spawnNode(
    definitionId: string,
    zoneId: string,
    quality: VeinQuality = 'NORMAL',
    instanceId?: string
  ): ActiveResourceNode {
    const def = this.nodeDefs.get(definitionId);
    if (!def) {
      throw new Error(`Node definition ${definitionId} not registered`);
    }

    const node: ActiveResourceNode = {
      instanceId: instanceId || `node_${zoneId}_${Math.random().toString(36).slice(2, 7)}`,
      definitionId,
      zoneId,
      quality,
      remainingCharges: def.maxCharges,
      isDepleted: false,
    };

    this.activeNodes.set(node.instanceId, node);
    return node;
  }

  /**
   * Harvests an active resource node, calculating yields, double-strike chances, and depletion.
   */
  public harvestNode(
    node: ActiveResourceNode,
    playerSkillLevel: number,
    tool: ToolProficiency,
    nearbyPlayerCount: number = 1,
    forceCritRoll?: boolean,
    nowMs: number = Date.now()
  ): HarvestResult {
    const def = this.nodeDefs.get(node.definitionId);
    if (!def) {
      return {
        success: false,
        itemsAwarded: [],
        isDoubleStrike: false,
        xpAwarded: 0,
        nodeDepleted: node.isDepleted,
        remainingCharges: node.remainingCharges,
        error: 'Node definition not found',
      };
    }

    if (node.isDepleted) {
      return {
        success: false,
        itemsAwarded: [],
        isDoubleStrike: false,
        xpAwarded: 0,
        nodeDepleted: true,
        remainingCharges: 0,
        error: 'Node is currently depleted',
      };
    }

    if (playerSkillLevel < def.requiredSkillLevel) {
      return {
        success: false,
        itemsAwarded: [],
        isDoubleStrike: false,
        xpAwarded: 0,
        nodeDepleted: false,
        remainingCharges: node.remainingCharges,
        error: `Requires ${def.profession} level ${def.requiredSkillLevel} (current: ${playerSkillLevel})`,
      };
    }

    // Determine quality multiplier
    let qualityMultiplier = 1.0;
    if (node.quality === 'RICH_VEIN') qualityMultiplier = 1.5;
    else if (node.quality === 'PRISTINE_CORE') qualityMultiplier = 2.5;

    // Double strike critical roll
    const isDoubleStrike = forceCritRoll || (Math.random() * 100 < tool.doubleStrikeChancePct);
    const strikeMultiplier = isDoubleStrike ? 2 : 1;

    const baseQuantity = Math.max(1, Math.round(def.baseYieldQuantity * qualityMultiplier * strikeMultiplier));
    const itemsAwarded: Array<{ itemId: string; quantity: number }> = [
      { itemId: def.baseYieldItemId, quantity: baseQuantity },
    ];

    // Rare drop roll on Pristine Cores or Rich Veins
    if (def.rareYieldItemId && (node.quality === 'PRISTINE_CORE' || Math.random() < 0.1)) {
      itemsAwarded.push({ itemId: def.rareYieldItemId, quantity: 1 * strikeMultiplier });
    }

    const xpAwarded = Math.round(def.baseXp * tool.xpMultiplier * (isDoubleStrike ? 1.5 : 1.0));

    // Deduct charge
    node.remainingCharges -= 1;
    let nodeDepleted = false;

    if (node.remainingCharges <= 0) {
      node.remainingCharges = 0;
      node.isDepleted = true;
      nodeDepleted = true;
      node.depletedAt = nowMs;

      // Calculate density-adjusted respawn duration (each player beyond 1 speeds up respawn by 5%, max 50% reduction)
      const speedupPct = Math.min(0.5, Math.max(0, (nearbyPlayerCount - 1) * 0.05));
      const adjustedDuration = Math.round(def.baseRespawnDurationMs * (1.0 - speedupPct));
      node.respawnAt = nowMs + adjustedDuration;
    }

    return {
      success: true,
      itemsAwarded,
      isDoubleStrike,
      xpAwarded,
      nodeDepleted,
      remainingCharges: node.remainingCharges,
    };
  }

  /**
   * Evaluates all depleted nodes in a zone and restores them once their respawn timer expires.
   */
  public updateRespawns(zoneId: string, nowMs: number = Date.now()): string[] {
    const respawned: string[] = [];

    for (const node of this.activeNodes.values()) {
      if (node.zoneId === zoneId && node.isDepleted && node.respawnAt && nowMs >= node.respawnAt) {
        const def = this.nodeDefs.get(node.definitionId);
        if (def) {
          node.isDepleted = false;
          node.remainingCharges = def.maxCharges;
          node.depletedAt = undefined;
          node.respawnAt = undefined;
          respawned.push(node.instanceId);
        }
      }
    }

    return respawned;
  }
}
