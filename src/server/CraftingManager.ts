import { prisma } from "@/web/lib/prisma";
import { GameEngine } from "./GameEngine";
import { PlayerManager } from "./PlayerManager";
import { SHOP_CRAFT_RECIPES } from "@/shared/game/shopCatalog";
import { gameEvents } from "@/shared/events/gameEventBus";
import {
  addItemWithMeta,
  inventorySnapshot,
  removeItem,
} from "./inventoryService";
import { calculateLevelForSkill } from "./SkillManager";

type RecipeRow = {
  slug: string;
  outputItemSlug: string;
  outputQuantity: number;
  skillSlug: string;
  levelReq: number;
  xpReward: number;
  ingredients: string; // JSON
  timeMs: number;
};

export class CraftingManager {
  private engine: GameEngine;
  private playerManager: PlayerManager;

  constructor(engine: GameEngine, playerManager: PlayerManager) {
    this.engine = engine;
    this.playerManager = playerManager;
  }

  public async initialize() {
    this.engine.events.on(
      "craftRequestAction",
      async (data: { accountId: string; recipeSlug: string; socketId: string }) => {
        await this.handleCraftItem(data.accountId, data.recipeSlug, data.socketId);
      }
    );
  }

  private generateCraftedAffixes(itemSlug: string, skillLevel: number) {
    const roll = Math.random();
    let rarity = "COMMON";
    let numAffixes = 0;
    
    // Scale rarity chance with skill level (up to 50% boost at level 50)
    const skillMultiplier = 1 + (skillLevel / 100);

    if (roll < 0.05 * skillMultiplier) { rarity = "LEGENDARY"; numAffixes = 3; }
    else if (roll < 0.15 * skillMultiplier) { rarity = "EPIC"; numAffixes = 2; }
    else if (roll < 0.35 * skillMultiplier) { rarity = "RARE"; numAffixes = 1; }
    else if (roll < 0.60 * skillMultiplier) { rarity = "UNCOMMON"; numAffixes = 1; }
    
    if (numAffixes === 0) return null;

    const availableAffixes = [
      { key: "attackPower", max: 5 },
      { key: "defense", max: 5 },
      { key: "maxHp", max: 20 },
      { key: "critChance", max: 0.05 },
      { key: "lifesteal", max: 0.1 },
      { key: "gatherSpeed", max: 1.5 }
    ];

    const affixes: Record<string, any> = { rarity };
    
    // Shuffle and pick
    const shuffled = availableAffixes.sort(() => 0.5 - Math.random());
    for (let i = 0; i < numAffixes; i++) {
      const chosen = shuffled[i];
      let val = Math.random() * chosen.max;
      
      // Rarity multiplier
      let rarityMultiplier = 1.0;
      if (rarity === "UNCOMMON") rarityMultiplier = 1.2;
      if (rarity === "RARE") rarityMultiplier = 1.5;
      if (rarity === "EPIC") rarityMultiplier = 2.0;
      if (rarity === "LEGENDARY") rarityMultiplier = 3.0;

      val = val * (1 + skillLevel / 100) * rarityMultiplier;
      
      if (chosen.max >= 1) val = Math.ceil(val);
      else val = Number(val.toFixed(2));
      
      affixes[chosen.key] = val;
    }

    return JSON.stringify(affixes);
  }

  private async resolveRecipe(recipeSlug: string): Promise<RecipeRow | null> {
    const db = await prisma.craftingRecipe.findUnique({ where: { slug: recipeSlug } });
    if (db) {
      return {
        slug: db.slug,
        outputItemSlug: db.outputItemSlug,
        outputQuantity: db.outputQuantity,
        skillSlug: db.skillSlug,
        levelReq: db.levelReq,
        xpReward: db.xpReward,
        ingredients: db.ingredients,
        timeMs: db.timeMs,
      };
    }

    const fallback = SHOP_CRAFT_RECIPES.find((r) => r.slug === recipeSlug);
    if (!fallback) return null;
    return {
      slug: fallback.slug,
      outputItemSlug: fallback.outputItemSlug,
      outputQuantity: fallback.outputQuantity,
      skillSlug: fallback.skillSlug,
      levelReq: fallback.levelReq,
      xpReward: fallback.xpReward,
      ingredients: JSON.stringify(fallback.ingredients),
      timeMs: fallback.timeMs,
    };
  }

  private async inventorySnapshot(userId: string): Promise<Record<string, number>> {
    return inventorySnapshot(userId);
  }

  public async handleCraftItem(accountId: string, recipeSlug: string, socketId: string) {
    const player = this.playerManager.getPlayerByAccountId(accountId);
    if (!player) return;

    const userId = accountId;

    try {
      const recipe = await this.resolveRecipe(recipeSlug);
      if (!recipe) {
        this.engine.events.emit("directMessage", {
          socketId,
          event: "show_toast",
          data: { message: "Invalid recipe." },
        });
        return;
      }

      // Ensure basic craft skill exists at level 1 (no free tools — skill gate only)
      let playerSkill = await prisma.playerSkill.findUnique({
        where: { userId_skillSlug: { userId, skillSlug: recipe.skillSlug } },
      });
      if (!playerSkill) {
        playerSkill = await prisma.playerSkill.create({
          data: { userId, skillSlug: recipe.skillSlug, level: 1, xp: 0 },
        });
      }

      if (playerSkill.level < recipe.levelReq) {
        this.engine.events.emit("directMessage", {
          socketId,
          event: "show_toast",
          data: {
            message: `You need level ${recipe.levelReq} ${recipe.skillSlug} to craft this.`,
          },
        });
        return;
      }

      const ingredients: { itemSlug: string; qty: number }[] = JSON.parse(recipe.ingredients);
      const inventory = await prisma.playerInventoryItem.findMany({ where: { userId } });

      for (const ing of ingredients) {
        const owned = inventory
          .filter((i) => i.itemSlug === ing.itemSlug)
          .reduce((sum, item) => sum + item.quantity, 0);
        if (owned < ing.qty) {
          this.engine.events.emit("directMessage", {
            socketId,
            event: "show_toast",
            data: { message: `Not enough ${ing.itemSlug}. Need ${ing.qty}.` },
          });
          return;
        }
      }

      for (const ing of ingredients) {
        const ok = await removeItem(userId, ing.itemSlug, ing.qty);
        if (!ok) {
          this.engine.events.emit("directMessage", {
            socketId,
            event: "show_toast",
            data: { message: `Not enough ${ing.itemSlug}. Need ${ing.qty}.` },
          });
          return;
        }
      }

      const outputTemplate = await prisma.itemTemplate.findUnique({
        where: { slug: recipe.outputItemSlug },
      });

      let durability = outputTemplate?.baseDurability;
      let affixes = null;
      if (outputTemplate && ["WEAPON", "ARMOR", "TOOL"].includes(outputTemplate.category)) {
        affixes = this.generateCraftedAffixes(recipe.outputItemSlug, playerSkill.level);
      }

      const stackable = outputTemplate?.stackable ?? true;
      await addItemWithMeta(userId, recipe.outputItemSlug, {
        quantity: recipe.outputQuantity,
        durability: durability ?? null,
        affixes: affixes ?? null,
        stackable,
      });

      gameEvents.emit("item.crafted", {
        userId,
        itemSlug: recipe.outputItemSlug,
        quantity: recipe.outputQuantity,
      });

      const newXp = playerSkill.xp + recipe.xpReward;
      const newLevel = Math.max(playerSkill.level, calculateLevelForSkill(recipe.skillSlug, newXp));
      await prisma.playerSkill.update({
        where: { id: playerSkill.id },
        data: { xp: newXp, level: newLevel },
      });

      this.engine.events.emit("directMessage", {
        socketId,
        event: "show_toast",
        data: {
          message: `Crafted ${recipe.outputQuantity}× ${recipe.outputItemSlug}! (+${recipe.xpReward} XP)`,
        },
      });

      const inv = await this.inventorySnapshot(userId);
      this.engine.events.emit("directMessage", {
        socketId,
        event: "inventory_sync",
        data: { inventory: inv },
      });
      this.engine.events.emit("directMessage", {
        socketId,
        event: "skill_sync",
        data: {
          skillSlug: recipe.skillSlug,
          level: newLevel,
          xp: newXp,
        },
      });
      this.engine.events.emit("itemCrafted", {
        accountId,
        socketId,
        targetSlug: recipe.outputItemSlug,
        amount: recipe.outputQuantity || 1,
      });
    } catch (e) {
      console.error("Error crafting item:", e);
      this.engine.events.emit("directMessage", {
        socketId,
        event: "show_toast",
        data: { message: "An error occurred while crafting." },
      });
    }
  }
}
