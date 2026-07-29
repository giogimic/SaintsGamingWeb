import { GameEngine } from "./GameEngine";
import { PlayerInput } from "./types";

export class CombatManager {
  private engine: GameEngine;
  
  // entityId -> (abilityId -> remainingMs)
  private cooldowns: Map<string, Map<string, number>> = new Map();

  constructor(engine: GameEngine) {
    this.engine = engine;

    this.engine.events.on("updateEntities", (deltaTime: number) => {
      this.tickCooldowns(deltaTime);
    });

    this.engine.events.on("combatRequestCapture", (data) => this.handleCaptureAttempt(data));
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

  private handleCaptureAttempt(data: { entityId: string, targetId: string, item: string }) {
    console.log(`[CombatManager] ${data.entityId} attempting to capture ${data.targetId} with ${data.item}`);
    
    // 1. Emit start of capture (triggers throw animation on client)
    this.engine.events.emit("networkBroadcast", {
      room: "lobby_ch1", // TODO: Dynamic map room routing
      event: "capture_start",
      data: {
        entityId: data.entityId,
        targetId: data.targetId,
        item: data.item,
        castTimeMs: 1500 // 1.5s throw animation
      }
    });

    // 2. Wait for throw animation to complete (Action-Based, not channeled)
    setTimeout(() => {
      // 3. Roll RNG
      const success = Math.random() > 0.5; // 50% chance for demo
      
      console.log(`[CombatManager] Capture ${success ? "SUCCESS" : "FAILED"} for ${data.targetId}`);
      
      this.engine.events.emit("networkBroadcast", {
        room: "lobby_ch1",
        event: "capture_result",
        data: {
          entityId: data.entityId,
          targetId: data.targetId,
          success
        }
      });

      // If success, we should tell the CreatureManager to despawn it, and give the player ownership
      if (success) {
        this.engine.events.emit("captureSuccess", {
          ownerId: data.entityId,
          targetId: data.targetId
        });
      }
    }, 1500);
  }

  private handleCombatAction(data: { entityId: string, targetId: string, move: any }) {
    console.log(`[CombatManager] ${data.entityId} used ${data.move.name} on ${data.targetId}`);
    
    // Basic MMO ability execution
    this.engine.events.emit("networkBroadcast", {
      room: "lobby_ch1",
      event: "combat_update",
      data: {
        type: "ATTACK_RESULT",
        attackerId: data.entityId,
        targetId: data.targetId,
        abilityId: data.move.name,
        damage: 15,
        cooldownMs: 2000
      }
    });
  }
}
