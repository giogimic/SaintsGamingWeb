import { GameEngine } from "./GameEngine";
import { PlayerInput, BehavioralState } from "./types";

export class CombatManager {
  private engine: GameEngine;
  
  // entityId -> (abilityId -> remainingMs)
  private cooldowns: Map<string, Map<string, number>> = new Map();

  // entityId -> channel data
  private activeChannels: Map<string, { targetId: string, item: string, remainingMs: number }> = new Map();

  constructor(engine: GameEngine) {
    this.engine = engine;

    this.engine.events.on("updateEntities", (deltaTime: number) => {
      this.tickCooldowns(deltaTime);
      this.tickChannels(deltaTime);
    });

    this.engine.events.on("combatRequestCapture", (data) => this.handleCaptureAttempt(data));
    this.engine.events.on("combatRequestAction", (data) => this.handleCombatAction(data));
    this.engine.events.on("playerMoved", (entityId) => this.handlePlayerMoved(entityId));
  }

  private handlePlayerMoved(entityId: string) {
    if (this.activeChannels.has(entityId)) {
      const channel = this.activeChannels.get(entityId)!;
      console.log(`[CombatManager] Channel interrupted for ${entityId}`);
      this.activeChannels.delete(entityId);
      
      this.engine.events.emit("networkBroadcast", {
        room: "lobby_ch1", // TODO: dynamic map routing
        event: "capture_interrupted",
        data: {
          entityId,
          targetId: channel.targetId
        }
      });
    }
  }

  private tickChannels(deltaTime: number) {
    for (const [entityId, channel] of this.activeChannels.entries()) {
      channel.remainingMs -= deltaTime;
      if (channel.remainingMs <= 0) {
        this.activeChannels.delete(entityId);
        this.resolveCaptureAttempt(entityId, channel.targetId, channel.item);
      }
    }
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

  private handleCaptureAttempt(data: { entityId: string, targetId: string, item: string }) {
    console.log(`[CombatManager] ${data.entityId} attempting to capture ${data.targetId} with ${data.item}`);
    
    // Interrupt existing channel if any
    this.handlePlayerMoved(data.entityId);
    
    const castTimeMs = 1500; // 1.5s channel

    // 1. Add to active channels (Vulnerability Window)
    this.activeChannels.set(data.entityId, {
      targetId: data.targetId,
      item: data.item,
      remainingMs: castTimeMs
    });
    
    // 2. Emit start of capture (triggers throw animation on client)
    this.engine.events.emit("networkBroadcast", {
      room: "lobby_ch1", // TODO: Dynamic map room routing
      event: "capture_start",
      data: {
        entityId: data.entityId,
        targetId: data.targetId,
        item: data.item,
        castTimeMs
      }
    });
  }

  private resolveCaptureAttempt(entityId: string, targetId: string, item: string) {
    this.engine.events.emit("requestCreatureState", targetId, (creature: any) => {
      let catchRate = 0.5; // Base 50% chance for demo
      
      if (creature) {
        // Adjust catch rate based on HP percentage
        const hpPercent = creature.hp / creature.maxHp;
        catchRate += (1 - hpPercent) * 0.3; // Up to 30% bonus for low HP

        // Adjust catch rate based on Behavioral State
        switch (creature.behavior) {
          case BehavioralState.CALM:
            catchRate += 0.2; // 20% bonus
            break;
          case BehavioralState.ENRAGED:
            catchRate -= 0.3; // 30% penalty
            break;
          case BehavioralState.FLEEING:
            // High risk of fleeing if failed, but normal catch rate
            break;
        }
      }

      // Clamp between 5% and 100%
      catchRate = Math.max(0.05, Math.min(1.0, catchRate));
      
      // 3. Roll RNG
      const success = Math.random() < catchRate;
      
      console.log(`[CombatManager] Capture ${success ? "SUCCESS" : "FAILED"} for ${targetId} (Rate: ${Math.round(catchRate*100)}%)`);
      
      this.engine.events.emit("networkBroadcast", {
        room: "lobby_ch1",
        event: "capture_result",
        data: {
          entityId: entityId,
          targetId: targetId,
          success
        }
      });

      // If success, we should tell the CreatureManager to despawn it, and give the player ownership
      if (success) {
        this.engine.events.emit("captureSuccess", {
          ownerId: entityId,
          targetId: targetId
        });
      }
    });
  }

  private handleCombatAction(data: { entityId: string, targetId: string, move: any }) {
    console.log(`[CombatManager] ${data.entityId} used ${data.move.name} on ${data.targetId}`);
    
    // In a full implementation, we fetch these from a PlayerManager or CreatureManager state.
    // Here we simulate the stat conversion rules defined in 7.txt:
    
    // Mock Stats for demonstration
    const attackerStats = {
      physicalPower: 50,    // Converted from "Attack"
      abilityPower: 40,     // Converted from "Special Attack"
      combatTempo: 120      // Converted from "Speed"
    };
    
    const targetStats = {
      physicalResistance: 30, // Converted from "Defense"
      magicResistance: 35,    // Converted from "Special Defense"
    };
    
    // Move properties
    const isMagic = data.move.category === 'special';
    const moveBaseDamage = data.move.power || 40;
    const moveBaseCooldown = data.move.cooldownMs || 3000;
    
    // Damage Calculation
    let damage = 0;
    if (isMagic) {
      damage = (moveBaseDamage * attackerStats.abilityPower) / targetStats.magicResistance;
    } else {
      damage = (moveBaseDamage * attackerStats.physicalPower) / targetStats.physicalResistance;
    }
    
    // Combat Tempo (Speed) Rule: Affects ability cooldown recovery, not movement speed.
    // Higher tempo = faster cooldown recovery. (e.g., 100 = 1.0x, 120 = ~0.83x cooldown)
    const tempoMultiplier = Math.max(0.2, 100 / Math.max(1, attackerStats.combatTempo));
    const finalCooldownMs = moveBaseCooldown * tempoMultiplier;

    // Apply damage to creature
    const finalDamage = Math.floor(damage);
    this.engine.events.emit("creatureDamaged", {
      entityId: data.targetId,
      attackerId: data.entityId,
      damage: finalDamage
    });

    // Execute ability
    this.engine.events.emit("networkBroadcast", {
      room: "lobby_ch1",
      event: "combat_update",
      data: {
        type: "ATTACK_RESULT",
        attackerId: data.entityId,
        targetId: data.targetId,
        abilityId: data.move.name,
        damage: finalDamage,
        cooldownMs: Math.floor(finalCooldownMs)
      }
    });
  }
}
