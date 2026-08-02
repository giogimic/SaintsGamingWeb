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
import { loadGlobalShinyChancePercent } from "./classDefs";
import {
  resolveCreatureSprites,
  rollShiny,
  shinyInstanceTags,
  SHINY_TAG,
} from "@/shared/game/shiny";
import { normalizeEncounterEntries, pickWeightedSlug } from "@/shared/game/encounterWeights";
import { grantsForTurnBattle } from "@/shared/game/combatSkillXp";

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
  /** Trainer duel — no capture / flee; win emits trainerDefeated */
  isTrainer?: boolean;
  trainerNpcId?: string;
  trainerName?: string;
  wildCreature: {
    templateId: string;
    hp: number;
    maxHp: number;
    level: number;
    spriteKey: string;
    name: string;
    isShiny?: boolean;
    tags?: string[];
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
    this.engine.events.on("startTrainerBattle", (data) => this.handleStartTrainerBattle(data));
  }

  private sendToPlayer(socketId: string | undefined, event: string, data: unknown) {
    if (!socketId) return;
    this.engine.events.emit("directMessage", { socketId, event, data });
  }

  /**
   * Prefer WorldMap.encountersData / EncounterTable for the map;
   * fall back to CreatureDef isWildSpawn catalog.
   */
  private async pickWildCreature(mapId: string) {
    try {
      const map = await prisma.worldMap.findUnique({
        where: { id: mapId },
        select: { encountersData: true, name: true },
      });
      if (map?.encountersData) {
        let raw: unknown = [];
        try {
          raw = JSON.parse(map.encountersData || "[]");
        } catch {
          raw = [];
        }
        const picked = pickWeightedSlug(normalizeEncounterEntries(raw));
        if (picked) {
          const def = await loadCreatureDef(picked);
          if (def) return def;
        }
      }

      const table =
        (await prisma.encounterTable.findFirst({ where: { mapName: mapId } })) ||
        (await prisma.encounterTable.findFirst({ where: { slug: mapId } }));
      if (table?.data) {
        try {
          const raw = JSON.parse(table.data);
          const picked = pickWeightedSlug(normalizeEncounterEntries(raw));
          if (picked) {
            const def = await loadCreatureDef(picked);
            if (def) return def;
          }
        } catch {
          /* fall through */
        }
      }
    } catch (err) {
      console.warn("[EncounterManager] map encounter lookup failed, using wild catalog", err);
    }

    const wilds = await loadWildSpawnDefs();
    if (!wilds.length) return null;
    // Uniform among catalog wilds (weights can be added later on CreatureDef)
    return wilds[Math.floor(Math.random() * wilds.length)] || wilds[0] || null;
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
      this.engine.events.emit("starterClaimed", {
        accountId: data.accountId,
        socketId: data.socketId,
        targetSlug: "starter",
        amount: 1,
        speciesSlug: existingParty.speciesSlug,
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
    this.engine.events.emit("starterClaimed", {
      accountId: data.accountId,
      socketId: data.socketId,
      targetSlug: "starter",
      amount: 1,
      speciesSlug: def.slug,
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
    const wildDef = await this.pickWildCreature(data.mapId);
    if (!wildDef) {
      this.sendToPlayer(data.socketId, "show_toast", { message: "No wild creatures configured." });
      return;
    }

    const globalShiny = await loadGlobalShinyChancePercent();
    const isShiny = rollShiny(wildDef, globalShiny);
    const shinySprites = resolveCreatureSprites(wildDef, isShiny);
    const wildTags = shinyInstanceTags(isShiny);
    const wildName = isShiny ? `Shiny ${wildDef.name}` : wildDef.name;

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
        name: wildName,
        hp: wildDef.baseHp,
        maxHp: wildDef.baseHp,
        level: wildDef.starterLevel,
        spriteKey: shinySprites.spriteBattle || shinySprites.spriteOverworld || "daemon_data",
        isShiny,
        tags: wildTags,
      },
      playerCreature: playerCreatureData,
      log: [
        isShiny
          ? `A shimmering wild ${wildDef.name} appeared! (${SHINY_TAG})`
          : `A wild ${wildDef.name} appeared!`,
      ],
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
      if (battle.isTrainer) {
        battle.log.push("There's no running from a trainer battle!");
        battle.phase = "WAITING_FOR_INPUT";
        this.broadcastUpdate(battle);
        return;
      }
      battle.log.push("You fled successfully!");
      await this.endBattle(data.battleId, mapId, "FLEE");
      return;
    }

    if (data.action === "ITEM" && data.itemId) {
      if (battle.isTrainer) {
        battle.log.push("You can't capture a trainer's creature!");
        battle.phase = "WAITING_FOR_INPUT";
        this.broadcastUpdate(battle);
        return;
      }
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
        const foe = battle.isTrainer
          ? `${battle.trainerName || "Trainer"}'s ${battle.wildCreature.name}`
          : `Wild ${battle.wildCreature.name}`;
        battle.log.push(`${foe} fainted! You won!`);
        await this.endBattle(data.battleId, mapId, "WIN");
        return;
      }

      await this.enemyTurn(battle, mapId);
    }
  }

  /** Dialogue-driven 1v1 trainer duel (hardcoded single opponent for now). */
  private async handleStartTrainerBattle(data: {
    accountId: string;
    socketId?: string;
    mapId?: string;
    trainerNpcId: string;
    trainerName?: string;
    speciesSlug?: string;
    level?: number;
  }) {
    if (!data.accountId || !data.trainerNpcId) return;

    for (const b of this.activeBattles.values()) {
      if (b.accountId === data.accountId) {
        this.sendToPlayer(data.socketId, "show_toast", {
          message: "You're already in a battle.",
        });
        return;
      }
    }

    const userId = await resolveUserId(data.accountId);
    if (!userId) return;

    const activeCreature = await prisma.playerCreature.findFirst({
      where: { userId, isParty: true },
      orderBy: { slotIndex: "asc" },
    });
    if (!activeCreature) {
      this.sendToPlayer(data.socketId, "show_toast", {
        message: "You need a party companion to challenge a trainer.",
      });
      return;
    }
    if (activeCreature.currentHp <= 0) {
      this.sendToPlayer(data.socketId, "show_toast", {
        message: "Your lead creature is fainted. Heal it first.",
      });
      return;
    }

    const speciesSlug = data.speciesSlug || "dragarbor";
    const foeDef = await loadCreatureDef(speciesSlug);
    if (!foeDef) {
      this.sendToPlayer(data.socketId, "show_toast", {
        message: "Trainer team unavailable.",
      });
      return;
    }

    const playerDef = await loadCreatureDef(activeCreature.speciesSlug);
    const level = data.level || Math.max(foeDef.starterLevel, 8);
    const trainerName = data.trainerName || "Trainer";
    const foeHp = Math.max(20, Math.floor(foeDef.baseHp * (0.9 + level * 0.05)));

    const battleId = `trainer_${Date.now()}_${data.accountId}`;
    const battleState: BattleState = {
      id: battleId,
      accountId: data.accountId,
      socketId: data.socketId,
      mapId: data.mapId,
      phase: "WAITING_FOR_INPUT",
      isTrainer: true,
      trainerNpcId: data.trainerNpcId,
      trainerName,
      wildCreature: {
        templateId: foeDef.slug,
        name: foeDef.name,
        hp: foeHp,
        maxHp: foeHp,
        level,
        spriteKey: foeDef.spriteBattle || foeDef.spriteOverworld || "daemon_data",
      },
      playerCreature: {
        id: activeCreature.id,
        name: activeCreature.nickname || playerDef?.name || activeCreature.speciesSlug,
        hp: activeCreature.currentHp,
        maxHp: activeCreature.maxHp,
        level: activeCreature.level,
        spriteKey: playerDef?.spriteOverworld || playerDef?.spriteBattle || "daemon_data",
      },
      log: [`${trainerName} wants to battle!`, `${trainerName} sent out ${foeDef.name}!`],
    };

    this.activeBattles.set(battleId, battleState);
    this.engine.events.emit("lockPlayerMovement", data.accountId);
    this.sendToPlayer(data.socketId, "battle_started", battleState);
  }

  private async enemyTurn(battle: BattleState, mapId?: string) {
    const level = battle.wildCreature.level;
    const power = 35;
    const defense = 25;
    const rawDamage = Math.max(1, Math.floor((level * power) / defense));
    const enemyDamage = Math.floor(rawDamage * (0.85 + Math.random() * 0.15));

    battle.playerCreature.hp = Math.max(0, battle.playerCreature.hp - enemyDamage);
    const foeLabel = battle.isTrainer
      ? `${battle.trainerName || "Trainer"}'s ${battle.wildCreature.name}`
      : `Wild ${battle.wildCreature.name}`;
    battle.log.push(`${foeLabel} attacks! Deals ${enemyDamage} damage.`);

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

    // Combat / summoning XP for TB outcomes
    for (const g of grantsForTurnBattle(result || "")) {
      this.engine.events.emit("grantSkillXp", {
        accountId: battle.accountId,
        skillSlug: g.skillSlug,
        amount: g.amount,
      });
    }

    // Persist party creature HP after the fight (bible 11).
    // Trainer losses soft-heal so rematch is possible without a clinic.
    if (userId && battle.playerCreature.id !== "pc_1") {
      try {
        let hpToSave = Math.max(0, battle.playerCreature.hp);
        if (battle.isTrainer && result === "LOSE") {
          hpToSave = Math.max(1, Math.floor(battle.playerCreature.maxHp * 0.5));
        }
        await prisma.playerCreature.update({
          where: { id: battle.playerCreature.id },
          data: { currentHp: hpToSave },
        });
      } catch (err) {
        console.error("[EncounterManager] Failed to persist creature HP:", err);
      }
    }

    if (result === "CAPTURE" && userId) {
      try {
        const wildDef = await loadCreatureDef(battle.wildCreature.templateId);
        const isShiny = !!battle.wildCreature.isShiny;
        const tags = battle.wildCreature.tags?.length
          ? battle.wildCreature.tags
          : shinyInstanceTags(isShiny);
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
            isShiny,
            tagsJson: JSON.stringify(tags),
          },
        });
        console.log(
          `[EncounterManager] Captured ${isShiny ? "SHINY " : ""}${battle.wildCreature.templateId} for user ${userId}`
        );
        this.engine.events.emit("ecosystemBroadcast", {
          type: "creature.captured",
          payload: {
            userId,
            speciesSlug: battle.wildCreature.templateId,
            level: battle.wildCreature.level,
            isShiny,
            tags,
          },
        });
        // Quest CLAIM objectives (e.g. capture_any)
        this.engine.events.emit("creatureCaptured", {
          accountId: battle.accountId,
          socketId: battle.socketId,
          targetSlug: "capture_any",
          amount: 1,
          speciesSlug: battle.wildCreature.templateId,
          isShiny,
        });
      } catch (err) {
        console.error(`[EncounterManager] Failed to save captured creature:`, err);
      }
    }

    if (result === "WIN" && battle.isTrainer && battle.trainerNpcId) {
      this.engine.events.emit("trainerDefeated", {
        accountId: battle.accountId,
        socketId: battle.socketId,
        targetSlug: battle.trainerNpcId,
        amount: 1,
        trainerName: battle.trainerName,
      });
      this.sendToPlayer(battle.socketId, "show_toast", {
        message: `${battle.trainerName || "Trainer"} was defeated!`,
      });
    }

    if (battle.isTrainer && (result === "WIN" || result === "LOSE")) {
      this.scheduleTrainerPostBattleDialogue(battle, result);
    }

    // Victory: generic loot into inventory (bible 11) — wild only
    if (result === "WIN" && userId && !battle.isTrainer) {
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

  /**
   * After the client battle overlay closes (~2.5s), open trainer post-battle dialogue.
   * Trees use node_post_win / node_post_lose (see CARLOS_DIALOGUE_TREE).
   */
  private scheduleTrainerPostBattleDialogue(
    battle: BattleState,
    result: string
  ) {
    if (!battle.socketId || !battle.trainerNpcId) return;
    const node = result === "WIN" ? "node_post_win" : "node_post_lose";
    const npcId = battle.trainerNpcId;
    const trainerName = battle.trainerName || "Trainer";
    const socketId = battle.socketId;

    setTimeout(() => {
      this.engine.events.emit("showTrainerPostBattleDialogue", {
        socketId,
        npcId,
        trainerName,
        node,
        result,
      });
    }, 2800);
  }
}
