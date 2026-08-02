import { GameEngine } from "./GameEngine";
import { PrismaClient } from "@prisma/client";
import {
  computeCaptureChance,
  rollCaptureSuccess,
} from "@/shared/game/combatAbilities";
import { getCaptureItemModifier } from "@/shared/game/captureItems";
import {
  loadCreatureDef,
  loadWildSpawnDefs,
  toPlayerCreatureStats,
} from "./creatureDefs";

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

export class EncounterManager {
  private activeBattles: Map<string, BattleState> = new Map();

  constructor(private engine: GameEngine) {
    this.engine.events.on("triggerEncounter", (data) => this.handleEncounterTrigger(data));
    this.engine.events.on("battleSubmitAction", (data) => this.handleBattleAction(data));
    this.engine.events.on("claimStarter", (data) => this.handleClaimStarter(data));
  }

  private sendToPlayer(socketId: string | undefined, event: string, data: unknown) {
    if (!socketId) return;
    this.engine.events.emit("directMessage", { socketId, event, data });
  }

  /** Persist a catalog starter as a real PlayerCreature (CreatureDef / fallback seed). */
  private async handleClaimStarter(data: {
    accountId: string;
    socketId: string;
    speciesSlug?: string;
  }) {
    const userId = await resolveUserId(data.accountId);
    if (!userId) {
      this.sendToPlayer(data.socketId, "show_toast", { message: "Cannot claim starter." });
      return;
    }

    const slug = data.speciesSlug;
    if (!slug) {
      this.sendToPlayer(data.socketId, "show_toast", { message: "Pick a starter species." });
      return;
    }

    const def = await loadCreatureDef(slug);
    if (!def || !def.isStarter) {
      this.sendToPlayer(data.socketId, "show_toast", {
        message: "That species is not an available starter.",
      });
      return;
    }

    const existingParty = await prisma.playerCreature.findFirst({
      where: { userId, isParty: true },
    });
    if (existingParty) {
      this.sendToPlayer(data.socketId, "show_toast", {
        message: "You already have a starter in your party.",
      });
      this.sendToPlayer(data.socketId, "starter_claimed", {
        creature: existingParty,
        alreadyOwned: true,
      });
      return;
    }

    const creature = await prisma.playerCreature.create({
      data: {
        userId,
        speciesSlug: def.slug,
        nickname: def.name,
        level: def.starterLevel,
        currentHp: def.baseHp,
        maxHp: def.baseHp,
        stats: JSON.stringify(toPlayerCreatureStats(def)),
        abilities: JSON.stringify(def.abilities),
        isParty: true,
        slotIndex: 0,
      },
    });

    this.sendToPlayer(data.socketId, "show_toast", {
      message: `${def.name} joined your party!`,
    });
    this.sendToPlayer(data.socketId, "starter_claimed", {
      creature,
      def: {
        slug: def.slug,
        name: def.name,
        typePrimary: def.typePrimary,
        typeSecondary: def.typeSecondary,
        spriteOverworld: def.spriteOverworld,
      },
      alreadyOwned: false,
    });
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

    const userId = await resolveUserId(data.accountId);
    if (!userId) return;

    let activeCreature;
    try {
      activeCreature = await prisma.playerCreature.findFirst({
        where: { userId, isParty: true },
        orderBy: { slotIndex: "asc" },
      });
    } catch (e) {
      console.error("[EncounterManager] Failed to fetch player creature", e);
      return;
    }

    // Real starter required — no fake party lead
    if (!activeCreature) {
      this.sendToPlayer(data.socketId, "show_toast", {
        message: "Claim a starter companion before battling wild creatures.",
      });
      return;
    }
    if (activeCreature.currentHp <= 0) {
      this.sendToPlayer(data.socketId, "show_toast", {
        message: "Your lead creature is fainted. Heal it before battling.",
      });
      return;
    }

    const playerDef = await loadCreatureDef(activeCreature.speciesSlug);
    const wilds = await loadWildSpawnDefs();
    const wildDef = wilds[Math.floor(Math.random() * Math.max(1, wilds.length))] || wilds[0];
    if (!wildDef) {
      this.sendToPlayer(data.socketId, "show_toast", { message: "No wild creatures configured." });
      return;
    }

    const battleId = `battle_${Date.now()}_${data.accountId}`;
    const playerCreatureData = {
      id: activeCreature.id,
      name: activeCreature.nickname || playerDef?.name || activeCreature.speciesSlug,
      hp: activeCreature.currentHp,
      maxHp: activeCreature.maxHp,
      level: activeCreature.level,
      spriteKey: playerDef?.spriteOverworld || playerDef?.spriteBattle || "daemon_data",
    };

    const battleState: BattleState = {
      id: battleId,
      accountId: data.accountId,
      socketId: data.socketId,
      mapId: data.mapId,
      phase: "WAITING_FOR_INPUT",
      wildCreature: {
        templateId: wildDef.slug,
        name: wildDef.name,
        hp: wildDef.baseHp,
        maxHp: wildDef.baseHp,
        level: wildDef.starterLevel,
        spriteKey: wildDef.spriteOverworld || wildDef.spriteBattle || "daemon_data",
      },
      playerCreature: playerCreatureData,
      log: [`A wild ${wildDef.name} appeared!`],
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
      const itemMod = getCaptureItemModifier(itemId);
      if (itemMod === undefined) {
        battle.log.push("That won't capture a soul. Use Standard Film.");
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
        battle.log.push("You don't have any capture film.");
        this.sendToPlayer(battle.socketId, "show_toast", {
          message: "You need Standard Film (buy/craft at the merchant, or ask Vance).",
        });
        battle.phase = "WAITING_FOR_INPUT";
        this.broadcastUpdate(battle);
        return;
      }

      // Consume one film exposure (server-authoritative)
      if (inv.quantity <= 1) {
        await prisma.playerInventoryItem.delete({ where: { id: inv.id } });
      } else {
        await prisma.playerInventoryItem.update({
          where: { id: inv.id },
          data: { quantity: inv.quantity - 1 },
        });
      }

      battle.log.push(`You exposed a frame of film!`);

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
        const wildDef = await loadCreatureDef(battle.wildCreature.templateId);
        await prisma.playerCreature.create({
          data: {
            userId,
            speciesSlug: battle.wildCreature.templateId,
            nickname: battle.wildCreature.name,
            level: battle.wildCreature.level,
            currentHp: Math.max(1, battle.wildCreature.hp),
            maxHp: battle.wildCreature.maxHp,
            stats: JSON.stringify(
              wildDef
                ? toPlayerCreatureStats(wildDef)
                : {
                    physicalPower: 10,
                    physicalDefense: 10,
                    abilityPower: 10,
                    abilityDefense: 10,
                    combatTempo: 100,
                  }
            ),
            abilities: JSON.stringify(
              wildDef?.abilities || [{ abilitySlug: "ram", currentCooldown: 0 }]
            ),
            isParty: false,
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
