import { GameEngine } from "./GameEngine";
import { SpawnMode } from "./types";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
export interface EncounterProvider {
  type: string;
  trigger(accountId: string, mapId: string, x: number, y: number): void;
}

export interface BattleState {
  id: string;
  accountId: string;
  phase: "WAITING_FOR_INPUT" | "RESOLUTION" | "TURN_END";
  wildCreature: {
    templateId: string;
    hp: number;
    maxHp: number;
    level: number;
    spriteKey: string;
    name: string;
  };
  playerCreature: {
    id: string;
    hp: number;
    maxHp: number;
    level: number;
    spriteKey: string;
    name: string;
  };
  log: string[];
}

export class EncounterManager {
  private activeBattles: Map<string, BattleState> = new Map();

  constructor(private engine: GameEngine) {
    this.engine.events.on("triggerEncounter", (data) => this.handleEncounterTrigger(data));
    this.engine.events.on("battleSubmitAction", (data) => this.handleBattleAction(data));
  }

  private async handleEncounterTrigger(data: { providerType: string, accountId: string, mapId: string, x: number, y: number, socketId?: string }) {
    // 50% chance to trigger an encounter in tall grass
    if (Math.random() > 0.5) {
      const templates = [
        { id: "Pebblad", spriteKey: "tuxemon/pebblad" },
        { id: "Vulcan", spriteKey: "tuxemon/vulcan" },
        { id: "Aquan", spriteKey: "tuxemon/aquan" }
      ];
      const template = templates[Math.floor(Math.random() * templates.length)];
      
      const battleId = `battle_${Date.now()}_${data.accountId}`;
      
      let playerCreatureData = {
        id: "pc_1",
        name: "Starter",
        hp: 120,
        maxHp: 120,
        level: 6,
        spriteKey: "tuxemon/starter"
      };

      if (!data.accountId.startsWith("acc_")) {
        try {
          const dbUser = await prisma.account.findFirst({
            where: { id: data.accountId },
            select: { userId: true }
          });
          const userId = dbUser?.userId || data.accountId;

          const activeCreature = await prisma.playerCreature.findFirst({
            where: { userId, isParty: true },
            orderBy: { slotIndex: 'asc' }
          });

          if (activeCreature) {
            playerCreatureData = {
              id: activeCreature.id,
              name: activeCreature.nickname || activeCreature.speciesSlug,
              hp: activeCreature.currentHp,
              maxHp: activeCreature.maxHp,
              level: activeCreature.level,
              spriteKey: `tuxemon/${activeCreature.speciesSlug.toLowerCase()}`
            };
          }
        } catch (e) {
          console.error("[EncounterManager] Failed to fetch player creature", e);
        }
      }

      const battleState: BattleState = {
        id: battleId,
        accountId: data.accountId,
        phase: "WAITING_FOR_INPUT",
        wildCreature: {
          templateId: template.id,
          name: template.id,
          hp: 100,
          maxHp: 100,
          level: 5,
          spriteKey: template.spriteKey
        },
        playerCreature: playerCreatureData,
        log: [`A wild ${template.id} appeared!`]
      };

      this.activeBattles.set(battleId, battleState);

      // Lock player movement in MMO world
      this.engine.events.emit("lockPlayerMovement", data.accountId);

      // We need to send this specifically to the player.
      // Since SocketHandler might not map accountId -> socketId yet, we emit a networkBroadcast 
      // but the client will filter it based on accountId.
      this.engine.events.emit("networkBroadcast", {
        room: data.mapId,
        event: "battle_started",
        data: battleState
      });
    }
  }

  private handleBattleAction(data: { battleId: string, action: string, moveId?: string, itemId?: string, socketId?: string, mapId?: string }) {
    const battle = this.activeBattles.get(data.battleId);
    if (!battle || battle.phase !== "WAITING_FOR_INPUT") return;

    battle.phase = "RESOLUTION";

    if (data.action === "FLEE") {
      battle.log.push("You fled successfully!");
      this.endBattle(data.battleId, data.mapId, "FLEE");
      return;
    }

    if (data.action === "ITEM" && data.itemId === "binding_crystal") {
      battle.log.push(`You threw a Binding Crystal!`);
      
      // Capture Math (RNG 0-255 based on missing HP)
      const hpPercent = battle.wildCreature.hp / battle.wildCreature.maxHp;
      const catchRate = ((1 - hpPercent) * 255); 
      
      const roll = Math.floor(Math.random() * 256);
      if (roll <= catchRate || catchRate > 250) { // High chance catch if almost 1 HP
        battle.log.push(`Gotcha! ${battle.wildCreature.name} was caught!`);
        this.endBattle(data.battleId, data.mapId, "CAPTURE");
      } else {
        battle.log.push(`Oh no! The wild ${battle.wildCreature.name} broke free!`);
        this.enemyTurn(battle, data.mapId);
      }
      return;
    }

    if (data.action === "FIGHT") {
      // Basic ARPG Math
      const level = battle.playerCreature.level;
      const power = 40; // Default Tackle power
      const defense = 20; 
      
      const typeModifier = 1.0; 
      const rawDamage = Math.max(1, Math.floor((level * power / defense) * typeModifier));
      const damage = Math.floor(rawDamage * (0.85 + Math.random() * 0.15)); // +/- 15% variance
      
      battle.wildCreature.hp = Math.max(0, battle.wildCreature.hp - damage);
      battle.log.push(`${battle.playerCreature.name} used ${data.moveId || "Tackle"}! Deals ${damage} damage.`);

      if (battle.wildCreature.hp <= 0) {
        battle.log.push(`Wild ${battle.wildCreature.name} fainted! You won!`);
        this.endBattle(data.battleId, data.mapId, "WIN");
        return;
      }

      this.enemyTurn(battle, data.mapId);
    }
  }

  private enemyTurn(battle: BattleState, mapId?: string) {
    // Enemy attacks back using same math
    const level = battle.wildCreature.level;
    const power = 35;
    const defense = 25;
    
    const rawDamage = Math.max(1, Math.floor((level * power / defense) * 1.0));
    const enemyDamage = Math.floor(rawDamage * (0.85 + Math.random() * 0.15));
    
    battle.playerCreature.hp = Math.max(0, battle.playerCreature.hp - enemyDamage);
    battle.log.push(`Wild ${battle.wildCreature.name} attacks! Deals ${enemyDamage} damage.`);

    if (battle.playerCreature.hp <= 0) {
      battle.log.push(`${battle.playerCreature.name} fainted! You whited out!`);
      this.endBattle(battle.id, mapId, "LOSE");
      return;
    }

    battle.phase = "WAITING_FOR_INPUT";
    this.broadcastUpdate(battle, mapId);
  }

  private broadcastUpdate(battle: BattleState, mapId?: string) {
    if (mapId) {
      this.engine.events.emit("networkBroadcast", {
        room: mapId,
        event: "battle_update",
        data: battle
      });
    }
  }

  private async endBattle(battleId: string, mapId?: string, result?: string) {
    const battle = this.activeBattles.get(battleId);
    if (!battle) return;

    // Release player movement
    this.engine.events.emit("unlockPlayerMovement", battle.accountId);

    if (mapId) {
      this.engine.events.emit("networkBroadcast", {
        room: mapId,
        event: "battle_ended",
        data: { battleId, accountId: battle.accountId, result, log: battle.log }
      });
    }
    
    // Save captured creature if successful
    if (result === "CAPTURE" && battle.accountId && !battle.accountId.startsWith("acc_")) {
      try {
        await prisma.playerCreature.create({
          data: {
            userId: battle.accountId,
            speciesSlug: battle.wildCreature.templateId,
            level: battle.wildCreature.level,
            currentHp: battle.wildCreature.hp,
            maxHp: battle.wildCreature.maxHp,
            stats: JSON.stringify({
              physicalPower: 10,
              physicalDefense: 10,
              abilityPower: 10,
              abilityDefense: 10,
              combatTempo: 100
            }),
            abilities: JSON.stringify([
              { abilitySlug: "tackle", currentCooldown: 0 }
            ])
          }
        });
        console.log(`[EncounterManager] Captured ${battle.wildCreature.templateId} persisted to DB for user ${battle.accountId}`);
      } catch (err) {
        console.error(`[EncounterManager] Failed to save captured creature:`, err);
      }
    }

    this.activeBattles.delete(battleId);
  }
}
