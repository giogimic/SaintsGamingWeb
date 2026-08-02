import { GameEngine } from "./GameEngine";
import { PrismaClient } from "@prisma/client";
import {
  computeCaptureChance,
  rollCaptureSuccess,
} from "@/shared/game/combatAbilities";

const prisma = new PrismaClient();

export interface EncounterProvider {
  type: string;
  trigger(accountId: string, mapId: string, x: number, y: number): void;
}

export interface BattleState {
  id: string;
  accountId: string;
  socketId?: string;
  mapId?: string;
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

/** Socket auth id is User.id; some paths historically looked up Account.id. */
async function resolveUserId(accountOrUserId: string): Promise<string | null> {
  if (!accountOrUserId || accountOrUserId.startsWith("acc_")) return null;

  const asAccount = await prisma.account.findFirst({
    where: { id: accountOrUserId },
    select: { userId: true },
  });
  if (asAccount?.userId) return asAccount.userId;

  const asUser = await prisma.user.findFirst({
    where: { id: accountOrUserId },
    select: { id: true },
  });
  return asUser?.id ?? null;
}

const ITEM_MODIFIERS: Record<string, number> = {
  binding_crystal: 1,
  advanced_crystal: 2,
  perfect_crystal: 255,
};

export class EncounterManager {
  private activeBattles: Map<string, BattleState> = new Map();

  constructor(private engine: GameEngine) {
    this.engine.events.on("triggerEncounter", (data) => this.handleEncounterTrigger(data));
    this.engine.events.on("battleSubmitAction", (data) => this.handleBattleAction(data));
  }

  private sendToPlayer(socketId: string | undefined, event: string, data: unknown) {
    if (!socketId) return;
    this.engine.events.emit("directMessage", { socketId, event, data });
  }

  private async handleEncounterTrigger(data: {
    providerType: string;
    accountId: string;
    mapId: string;
    x: number;
    y: number;
    socketId?: string;
  }) {
    // Tall grass: 50% chance (bible encounter hooks)
    if (Math.random() > 0.5) return;

    // Existing battle — do not stack
    for (const b of this.activeBattles.values()) {
      if (b.accountId === data.accountId) return;
    }

    const templates = [
      { id: "Pebblad", spriteKey: "daemon_data", name: "Pebblad" },
      { id: "Vulcan", spriteKey: "daemon_virus", name: "Vulcan" },
      { id: "Aquan", spriteKey: "daemon_vaccine", name: "Aquan" },
    ];
    const template = templates[Math.floor(Math.random() * templates.length)];

    const battleId = `battle_${Date.now()}_${data.accountId}`;

    let playerCreatureData = {
      id: "pc_1",
      name: "Starter",
      hp: 120,
      maxHp: 120,
      level: 6,
      spriteKey: "daemon_vaccine",
    };

    const userId = await resolveUserId(data.accountId);
    if (userId) {
      try {
        const activeCreature = await prisma.playerCreature.findFirst({
          where: { userId, isParty: true },
          orderBy: { slotIndex: "asc" },
        });

        if (activeCreature) {
          // Fainted party lead cannot start a new encounter (bible 11 defeat)
          if (activeCreature.currentHp <= 0) {
            this.sendToPlayer(data.socketId, "show_toast", {
              message: "Your lead creature is fainted. Heal it before battling.",
            });
            return;
          }
          playerCreatureData = {
            id: activeCreature.id,
            name: activeCreature.nickname || activeCreature.speciesSlug,
            hp: activeCreature.currentHp,
            maxHp: activeCreature.maxHp,
            level: activeCreature.level,
            spriteKey: "daemon_data",
          };
        }
      } catch (e) {
        console.error("[EncounterManager] Failed to fetch player creature", e);
      }
    }

    const battleState: BattleState = {
      id: battleId,
      accountId: data.accountId,
      socketId: data.socketId,
      mapId: data.mapId,
      phase: "WAITING_FOR_INPUT",
      wildCreature: {
        templateId: template.id,
        name: template.name,
        hp: 100,
        maxHp: 100,
        level: 5,
        spriteKey: template.spriteKey,
      },
      playerCreature: playerCreatureData,
      log: [`A wild ${template.name} appeared!`],
    };

    this.activeBattles.set(battleId, battleState);

    // Lock RT movement / hotbar combat (bible 11 isolation)
    this.engine.events.emit("lockPlayerMovement", data.accountId);

    // Direct to this player only — never map-broadcast (would force everyone into BATTLE)
    this.sendToPlayer(data.socketId, "battle_started", battleState);
  }

  private async handleBattleAction(data: {
    battleId: string;
    action: string;
    moveId?: string;
    itemId?: string;
    socketId?: string;
    mapId?: string;
  }) {
    const battle = this.activeBattles.get(data.battleId);
    if (!battle || battle.phase !== "WAITING_FOR_INPUT") return;

    // Prefer latest socket from the submitter
    if (data.socketId) battle.socketId = data.socketId;
    const mapId = data.mapId || battle.mapId;

    battle.phase = "RESOLUTION";

    if (data.action === "FLEE") {
      battle.log.push("You fled successfully!");
      await this.endBattle(data.battleId, mapId, "FLEE");
      return;
    }

    if (data.action === "ITEM" && data.itemId) {
      const itemId = data.itemId;
      const itemMod = ITEM_MODIFIERS[itemId];
      if (itemMod === undefined) {
        battle.log.push("That item cannot be used here.");
        battle.phase = "WAITING_FOR_INPUT";
        this.broadcastUpdate(battle);
        return;
      }

      const userId = await resolveUserId(battle.accountId);
      if (!userId) {
        battle.log.push("You cannot use items right now.");
        battle.phase = "WAITING_FOR_INPUT";
        this.broadcastUpdate(battle);
        return;
      }

      const inv = await prisma.playerInventoryItem.findFirst({
        where: { userId, itemSlug: itemId },
      });
      if (!inv || inv.quantity < 1) {
        // Real inventory only — no demo grants (product rule)
        battle.log.push("You don't have a Binding Crystal.");
        this.sendToPlayer(battle.socketId, "show_toast", {
          message: "You need a Binding Crystal in your inventory.",
        });
        battle.phase = "WAITING_FOR_INPUT";
        this.broadcastUpdate(battle);
        return;
      }

      // Consume one crystal for this throw (server-authoritative)
      if (inv.quantity <= 1) {
        await prisma.playerInventoryItem.delete({ where: { id: inv.id } });
      } else {
        await prisma.playerInventoryItem.update({
          where: { id: inv.id },
          data: { quantity: inv.quantity - 1 },
        });
      }

      battle.log.push(`You threw a Binding Crystal!`);

      const captureChance = computeCaptureChance({
        maxHp: battle.wildCreature.maxHp,
        currentHp: battle.wildCreature.hp,
        itemModifier: itemMod,
        baseCatchRate: 1,
        statusModifier: 1,
      });

      if (rollCaptureSuccess(captureChance)) {
        battle.log.push(`Gotcha! ${battle.wildCreature.name} was caught!`);
        await this.endBattle(data.battleId, mapId, "CAPTURE");
      } else {
        battle.log.push(`Oh no! The wild ${battle.wildCreature.name} broke free!`);
        await this.enemyTurn(battle, mapId);
      }
      return;
    }

    if (data.action === "FIGHT") {
      const level = battle.playerCreature.level;
      const power = 40;
      const defense = 20;
      const typeModifier = 1.0;
      const rawDamage = Math.max(1, Math.floor((level * power) / defense) * typeModifier);
      const damage = Math.floor(rawDamage * (0.85 + Math.random() * 0.15));

      battle.wildCreature.hp = Math.max(0, battle.wildCreature.hp - damage);
      battle.log.push(
        `${battle.playerCreature.name} used ${data.moveId || "Tackle"}! Deals ${damage} damage.`
      );

      if (battle.wildCreature.hp <= 0) {
        battle.log.push(`Wild ${battle.wildCreature.name} fainted! You won!`);
        await this.endBattle(data.battleId, mapId, "WIN");
        return;
      }

      await this.enemyTurn(battle, mapId);
    }
  }

  private async enemyTurn(battle: BattleState, mapId?: string) {
    const level = battle.wildCreature.level;
    const power = 35;
    const defense = 25;
    const rawDamage = Math.max(1, Math.floor((level * power) / defense));
    const enemyDamage = Math.floor(rawDamage * (0.85 + Math.random() * 0.15));

    battle.playerCreature.hp = Math.max(0, battle.playerCreature.hp - enemyDamage);
    battle.log.push(`Wild ${battle.wildCreature.name} attacks! Deals ${enemyDamage} damage.`);

    if (battle.playerCreature.hp <= 0) {
      battle.log.push(`${battle.playerCreature.name} fainted! You whited out!`);
      await this.endBattle(battle.id, mapId, "LOSE");
      return;
    }

    battle.phase = "WAITING_FOR_INPUT";
    this.broadcastUpdate(battle);
  }

  private broadcastUpdate(battle: BattleState) {
    this.sendToPlayer(battle.socketId, "battle_update", battle);
  }

  private async endBattle(battleId: string, mapId?: string, result?: string) {
    const battle = this.activeBattles.get(battleId);
    if (!battle) return;

    this.engine.events.emit("unlockPlayerMovement", battle.accountId);

    this.sendToPlayer(battle.socketId, "battle_ended", {
      battleId,
      accountId: battle.accountId,
      result,
      log: battle.log,
    });

    const userId = await resolveUserId(battle.accountId);

    // Persist party creature HP after the fight (bible 11)
    if (userId && battle.playerCreature.id !== "pc_1") {
      try {
        await prisma.playerCreature.update({
          where: { id: battle.playerCreature.id },
          data: { currentHp: Math.max(0, battle.playerCreature.hp) },
        });
      } catch (err) {
        console.error("[EncounterManager] Failed to persist creature HP:", err);
      }
    }

    if (result === "CAPTURE" && userId) {
      try {
        await prisma.playerCreature.create({
          data: {
            userId,
            speciesSlug: battle.wildCreature.templateId,
            level: battle.wildCreature.level,
            currentHp: Math.max(1, battle.wildCreature.hp),
            maxHp: battle.wildCreature.maxHp,
            stats: JSON.stringify({
              physicalPower: 10,
              physicalDefense: 10,
              abilityPower: 10,
              abilityDefense: 10,
              combatTempo: 100,
            }),
            abilities: JSON.stringify([{ abilitySlug: "tackle", currentCooldown: 0 }]),
          },
        });
        console.log(
          `[EncounterManager] Captured ${battle.wildCreature.templateId} for user ${userId}`
        );
        this.engine.events.emit("ecosystemBroadcast", {
          type: "creature.captured",
          payload: {
            userId,
            speciesSlug: battle.wildCreature.templateId,
            level: battle.wildCreature.level,
          },
        });
      } catch (err) {
        console.error(`[EncounterManager] Failed to save captured creature:`, err);
      }
    }

    // Victory: generic loot into inventory (bible 11)
    if (result === "WIN" && userId) {
      try {
        const lootSlug = "monster_fang";
        const existing = await prisma.playerInventoryItem.findFirst({
          where: { userId, itemSlug: lootSlug },
        });
        if (existing) {
          await prisma.playerInventoryItem.update({
            where: { id: existing.id },
            data: { quantity: existing.quantity + 1 },
          });
        } else {
          await prisma.playerInventoryItem.create({
            data: { userId, itemSlug: lootSlug, quantity: 1 },
          });
        }
        this.sendToPlayer(battle.socketId, "show_toast", {
          message: "Victory! Received Monster Fang.",
        });
      } catch (err) {
        console.error("[EncounterManager] Victory loot failed:", err);
      }
    }

    this.activeBattles.delete(battleId);
  }
}
