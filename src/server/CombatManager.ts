import { GameEngine } from "./GameEngine";
import { PlayerManager } from "./PlayerManager";
import { CreatureManager } from "./CreatureManager";
import { WorldManager } from "./WorldManager";
import {
  getCombatAbility,
  isForbiddenRtCaptureAbility,
  type CombatAbility,
} from "@/shared/game/combatAbilities";
import { grantsForAbilityCast } from "@/shared/game/combatSkillXp";

type CombatRequest = {
  accountId?: string;
  entityId?: string;
  targetId: string;
  abilityId?: string;
  move?: { name?: string; power?: number; category?: string; cooldownMs?: number };
};

export class CombatManager {
  private engine: GameEngine;
  private playerManager: PlayerManager;
  private creatureManager: CreatureManager;
  private worldManager: WorldManager;

  // entityId -> (abilityId -> remainingMs)
  private cooldowns: Map<string, Map<string, number>> = new Map();

  constructor(
    engine: GameEngine,
    playerManager: PlayerManager,
    creatureManager: CreatureManager,
    worldManager: WorldManager
  ) {
    this.engine = engine;
    this.playerManager = playerManager;
    this.creatureManager = creatureManager;
    this.worldManager = worldManager;

    this.engine.events.on("updateEntities", (deltaTime: number) => {
      this.tickCooldowns(deltaTime);
    });

    this.engine.events.on("combatRequestAction", (data: CombatRequest) => this.handleCombatAction(data));
  }

  private tickCooldowns(deltaTime: number) {
    for (const [, entityCooldowns] of this.cooldowns.entries()) {
      for (const [abilityId, remaining] of entityCooldowns.entries()) {
        if (remaining > 0) {
          entityCooldowns.set(abilityId, Math.max(0, remaining - deltaTime));
        }
      }
    }
  }

  private resolveAttacker(data: CombatRequest) {
    if (data.accountId) {
      const byAccount = this.playerManager.getPlayerByAccountId(data.accountId);
      if (byAccount) return { kind: "player" as const, player: byAccount };
    }
    if (data.entityId) {
      const player = this.playerManager.getPlayer(data.entityId);
      if (player) return { kind: "player" as const, player };
      // entityId may be player_<accountId> without timestamp — fall back
      if (data.entityId.startsWith("player_")) {
        const accountHint = data.entityId.replace(/^player_/, "").replace(/_\d+$/, "");
        const byHint = this.playerManager.getPlayerByAccountId(accountHint);
        if (byHint) return { kind: "player" as const, player: byHint };
      }
      const creature = this.creatureManager.getCreature(data.entityId);
      if (creature) return { kind: "creature" as const, creature };
    }
    return null;
  }

  private getStats(entityId: string, accountId?: string) {
    const player =
      this.playerManager.getPlayer(entityId) ||
      (accountId ? this.playerManager.getPlayerByAccountId(accountId) : undefined);
    if (player) {
      return {
        entityId: player.entityId,
        mapId: player.mapId,
        x: player.x,
        y: player.y,
        physicalPower: 10 + Math.max(1, player.hp) * 0.05,
        abilityPower: 10 + Math.max(1, player.hp) * 0.05,
        combatTempo: 100,
        physicalResistance: 20,
        magicResistance: 20,
        accuracy: 95,
        evasion: 10,
        isLocked: player.isLocked,
      };
    }

    const creature = this.creatureManager.getCreature(entityId);
    if (creature) {
      return {
        entityId: creature.entityId,
        mapId: creature.mapId,
        x: creature.x,
        y: creature.y,
        physicalPower: 25,
        abilityPower: 20,
        combatTempo: 90,
        physicalResistance: 15,
        magicResistance: 15,
        accuracy: 90,
        evasion: 5,
        isLocked: false,
      };
    }

    return null;
  }

  private resolveAbility(data: CombatRequest): CombatAbility | null {
    const abilityId = data.abilityId || data.move?.name;
    if (!abilityId) return null;
    if (isForbiddenRtCaptureAbility(abilityId)) return null;

    const catalog = getCombatAbility(abilityId);
    if (catalog) return catalog;

    // Legacy move payload from older clients
    if (data.move?.name && !isForbiddenRtCaptureAbility(data.move.name)) {
      return {
        id: data.move.name,
        name: data.move.name,
        power: data.move.power || 40,
        category: data.move.category === "special" ? "special" : "physical",
        cooldownMs: data.move.cooldownMs || 3000,
        rangeTiles: 1,
      };
    }
    return null;
  }

  private emitResult(
    mapId: string,
    payload: Record<string, unknown>
  ) {
    this.engine.events.emit("networkBroadcast", {
      room: mapId,
      event: "combat_update",
      data: { type: "ATTACK_RESULT", ...payload },
    });
  }

  private handleCombatAction(data: CombatRequest) {
    const ability = this.resolveAbility(data);
    if (!ability) {
      console.warn(`[CombatManager] Rejected combat action (missing/forbidden ability)`, data.abilityId || data.move?.name);
      return;
    }

    const attackerRef = this.resolveAttacker(data);
    if (!attackerRef || attackerRef.kind !== "player") {
      console.warn(`[CombatManager] Attacker not found`);
      return;
    }
    const attacker = attackerRef.player;

    // Bible 11: while locked in turn-based battle, no RT casts
    if (attacker.isLocked) {
      this.engine.events.emit("directMessage", {
        socketId: attacker.socketId,
        event: "show_toast",
        data: { message: "You cannot use MMO abilities during a creature battle." },
      });
      return;
    }

    const attackerStats = this.getStats(attacker.entityId, attacker.accountId);
    const targetStats = this.getStats(data.targetId);
    if (!attackerStats || !targetStats) return;
    if (attackerStats.mapId !== targetStats.mapId) return;

    // Cooldown check
    const cdMap = this.cooldowns.get(attacker.entityId) || new Map<string, number>();
    const remaining = cdMap.get(ability.id) || 0;
    if (remaining > 0) {
      this.engine.events.emit("directMessage", {
        socketId: attacker.socketId,
        event: "show_toast",
        data: { message: `${ability.name} is on cooldown.` },
      });
      return;
    }

    // Range check (Manhattan)
    if (ability.rangeTiles > 0) {
      const dist = Math.abs(attackerStats.x - targetStats.x) + Math.abs(attackerStats.y - targetStats.y);
      if (dist > ability.rangeTiles) {
        this.engine.events.emit("directMessage", {
          socketId: attacker.socketId,
          event: "show_toast",
          data: { message: "Out of range." },
        });
        return;
      }
    }

    // Line of sight for damaging abilities
    if (ability.power > 0) {
      const hasLoS = this.worldManager.hasLineOfSight(
        attackerStats.mapId,
        attackerStats.x,
        attackerStats.y,
        targetStats.x,
        targetStats.y
      );
      if (!hasLoS) {
        this.engine.events.emit("directMessage", {
          socketId: attacker.socketId,
          event: "show_toast",
          data: { message: "No line of sight." },
        });
        return;
      }
    }

    const tempoMultiplier = Math.max(0.2, 100 / Math.max(1, attackerStats.combatTempo));
    const finalCooldownMs = ability.cooldownMs * tempoMultiplier;
    cdMap.set(ability.id, finalCooldownMs);
    this.cooldowns.set(attacker.entityId, cdMap);

    // Non-damaging utility/buff/heal — still trains support combat typings
    if (ability.power <= 0 || ability.category === "utility" || ability.category === "buff" || ability.category === "heal") {
      this.grantCombatXp(attacker.accountId, ability, { isUtilityOnly: true });
      this.emitResult(attackerStats.mapId, {
        attackerId: attacker.entityId,
        targetId: data.targetId,
        abilityId: ability.id,
        damage: 0,
        isCrit: false,
        isMiss: false,
        cooldownMs: Math.floor(finalCooldownMs),
      });
      return;
    }

    const hitChance = Math.max(0.1, Math.min(1.0, (attackerStats.accuracy - targetStats.evasion) / 100));
    const isHit = Math.random() <= hitChance;
    if (!isHit) {
      this.emitResult(attackerStats.mapId, {
        attackerId: attacker.entityId,
        targetId: data.targetId,
        abilityId: ability.id,
        damage: 0,
        isCrit: false,
        isMiss: true,
        cooldownMs: Math.floor(finalCooldownMs),
      });
      return;
    }

    const isMagic = ability.category === "special";
    let damage = isMagic
      ? (ability.power * attackerStats.abilityPower) / Math.max(1, targetStats.magicResistance)
      : (ability.power * attackerStats.physicalPower) / Math.max(1, targetStats.physicalResistance);

    const isCrit = Math.random() < 0.05;
    if (isCrit) damage *= 1.5;
    const finalDamage = Math.max(1, Math.floor(damage));

    if (data.targetId.startsWith("player_") || this.playerManager.getPlayer(data.targetId)) {
      this.engine.events.emit("playerDamaged", {
        entityId: targetStats.entityId,
        attackerId: attacker.entityId,
        damage: finalDamage,
      });
    } else {
      this.engine.events.emit("creatureDamaged", {
        entityId: data.targetId,
        attackerId: attacker.entityId,
        damage: finalDamage,
      });
    }

    this.grantCombatXp(attacker.accountId, ability, { isCrit });

    this.emitResult(attackerStats.mapId, {
      attackerId: attacker.entityId,
      targetId: data.targetId,
      abilityId: ability.id,
      damage: finalDamage,
      isCrit,
      isMiss: false,
      cooldownMs: Math.floor(finalCooldownMs),
    });
  }

  private grantCombatXp(
    accountId: string | undefined,
    ability: CombatAbility,
    opts: { isCrit?: boolean; isMiss?: boolean; isUtilityOnly?: boolean }
  ) {
    if (!accountId) return;
    const grants = grantsForAbilityCast(ability, opts);
    for (const g of grants) {
      this.engine.events.emit("grantSkillXp", {
        accountId,
        skillSlug: g.skillSlug,
        amount: g.amount,
      });
    }
  }
}
