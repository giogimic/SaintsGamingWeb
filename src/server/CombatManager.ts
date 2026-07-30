import { GameEngine } from "./GameEngine";
import { PlayerInput, BehavioralState } from "./types";
import { PlayerManager } from "./PlayerManager";
import { CreatureManager } from "./CreatureManager";

export class CombatManager {
  private engine: GameEngine;
  private playerManager: PlayerManager;
  private creatureManager: CreatureManager;
  
  // entityId -> (abilityId -> remainingMs)
  private cooldowns: Map<string, Map<string, number>> = new Map();

  constructor(engine: GameEngine, playerManager: PlayerManager, creatureManager: CreatureManager) {
    this.engine = engine;
    this.playerManager = playerManager;
    this.creatureManager = creatureManager;

    this.engine.events.on("updateEntities", (deltaTime: number) => {
      this.tickCooldowns(deltaTime);
    });

    this.engine.events.on("combatRequestAction", (data) => this.handleCombatAction(data));
  }

  private tickCooldowns(deltaTime: number) {
    for (const [entityId, entityCooldowns] of this.cooldowns.entries()) {
      for (const [abilityId, remaining] of entityCooldowns.entries()) {
        if (remaining > 0) {
          entityCooldowns.set(abilityId, Math.max(0, remaining - deltaTime));
        }
      }
    }
  }

  private getStats(entityId: string) {
    // Attempt to get player first
    const player = this.playerManager.getPlayer(entityId);
    if (player) {
      // In a full DB implementation, we'd calculate this based on equipped gear.
      // For now, use basic level-scaled stats for the demo.
      return {
        physicalPower: 10 + player.hp * 0.5,
        abilityPower: 10 + player.hp * 0.5,
        combatTempo: 100,
        physicalResistance: 20,
        magicResistance: 20,
        accuracy: 95,
        evasion: 10
      };
    }

    const creature = this.creatureManager.getCreature(entityId);
    if (creature) {
      return {
        physicalPower: 25,
        abilityPower: 20,
        combatTempo: 90,
        physicalResistance: 15,
        magicResistance: 15,
        accuracy: 90,
        evasion: 5
      };
    }

    // Fallback if entity not found
    return {
      physicalPower: 10,
      abilityPower: 10,
      combatTempo: 100,
      physicalResistance: 10,
      magicResistance: 10,
      accuracy: 80,
      evasion: 0
    };
  }

  private handleCombatAction(data: { entityId: string, targetId: string, move: any }) {
    console.log(`[CombatManager] ${data.entityId} used ${data.move.name} on ${data.targetId}`);
    
    const attackerStats = this.getStats(data.entityId);
    const targetStats = this.getStats(data.targetId);
    
    // Move properties
    const isMagic = data.move.category === 'special';
    const moveBaseDamage = data.move.power || 40;
    const moveBaseCooldown = data.move.cooldownMs || 3000;
    
    // 1. Hit / Miss Calculation
    // Base hit chance modified by accuracy vs evasion
    const hitChance = Math.max(0.1, Math.min(1.0, (attackerStats.accuracy - targetStats.evasion) / 100));
    const isHit = Math.random() <= hitChance;

    // Combat Tempo (Speed) Rule: Affects ability cooldown recovery, not movement speed.
    const tempoMultiplier = Math.max(0.2, 100 / Math.max(1, attackerStats.combatTempo));
    const finalCooldownMs = moveBaseCooldown * tempoMultiplier;

    if (!isHit) {
      // Missed
      this.engine.events.emit("networkBroadcast", {
        room: "lobby_ch1", // TODO: use actual mapId of entity
        event: "combat_update",
        data: {
          type: "ATTACK_RESULT",
          attackerId: data.entityId,
          targetId: data.targetId,
          abilityId: data.move.name,
          damage: 0,
          isCrit: false,
          isMiss: true,
          cooldownMs: Math.floor(finalCooldownMs)
        }
      });
      return;
    }
    
    // 2. Damage Calculation
    let damage = 0;
    if (isMagic) {
      damage = (moveBaseDamage * attackerStats.abilityPower) / Math.max(1, targetStats.magicResistance);
    } else {
      damage = (moveBaseDamage * attackerStats.physicalPower) / Math.max(1, targetStats.physicalResistance);
    }
    
    // 3. Critical Hit RNG (5% base chance, 1.5x damage)
    const isCrit = Math.random() < 0.05;
    if (isCrit) {
      damage *= 1.5;
    }
    
    // Apply damage to creature (or player)
    const finalDamage = Math.floor(damage);
    
    // Dispatch to correct manager
    if (data.targetId.startsWith("player_")) {
      this.engine.events.emit("playerDamaged", {
        entityId: data.targetId,
        attackerId: data.entityId,
        damage: finalDamage
      });
    } else {
      this.engine.events.emit("creatureDamaged", {
        entityId: data.targetId,
        attackerId: data.entityId,
        damage: finalDamage
      });
    }

    // Execute ability visually
    this.engine.events.emit("networkBroadcast", {
      room: "lobby_ch1",
      event: "combat_update",
      data: {
        type: "ATTACK_RESULT",
        attackerId: data.entityId,
        targetId: data.targetId,
        abilityId: data.move.name,
        damage: finalDamage,
        isCrit,
        isMiss: false,
        cooldownMs: Math.floor(finalCooldownMs)
      }
    });
  }
}
