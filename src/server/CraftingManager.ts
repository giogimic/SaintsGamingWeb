import { prisma } from "@/web/lib/prisma";
import { GameEngine } from "./GameEngine";
import { PlayerManager } from "./PlayerManager";
import { SHOP_CRAFT_RECIPES } from "@/shared/game/shopCatalog";

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
    const hasAffix = Math.random() < 0.3 + skillLevel * 0.01;
    if (!hasAffix) return null;

    const affixes = [
      { key: "attackPower", max: 5 },
      { key: "defense", max: 5 },
      { key: "maxHp", max: 20 },
      { key: "critChance", max: 0.05 },
    ];

    const chosen = affixes[Math.floor(Math.random() * affixes.length)];
    let val = Math.random() * chosen.max;
    val = val * (1 + skillLevel / 100);
    if (chosen.max >= 1) val = Math.ceil(val);
    else val = Number(val.toFixed(2));

    return JSON.stringify({ [chosen.key]: val });
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
    const rows = await prisma.playerInventoryItem.findMany({ where: { userId } });
    const inv: Record<string, number> = {};
    for (const row of rows) {
      inv[row.itemSlug] = (inv[row.itemSlug] || 0) + row.quantity;
    }
    return inv;
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
        let remainingToDeduct = ing.qty;
        const ownedItems = inventory.filter((i) => i.itemSlug === ing.itemSlug);
        for (const owned of ownedItems) {
          if (remainingToDeduct <= 0) break;
          if (owned.quantity <= remainingToDeduct) {
            remainingToDeduct -= owned.quantity;
            await prisma.playerInventoryItem.delete({ where: { id: owned.id } });
          } else {
            await prisma.playerInventoryItem.update({
              where: { id: owned.id },
              data: { quantity: owned.quantity - remainingToDeduct },
            });
            remainingToDeduct = 0;
          }
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
      if (stackable) {
        const existing = await prisma.playerInventoryItem.findFirst({
          where: { userId, itemSlug: recipe.outputItemSlug },
        });
        if (existing) {
          await prisma.playerInventoryItem.update({
            where: { id: existing.id },
            data: { quantity: existing.quantity + recipe.outputQuantity },
          });
        } else {
          await prisma.playerInventoryItem.create({
            data: {
              userId,
              itemSlug: recipe.outputItemSlug,
              quantity: recipe.outputQuantity,
              durability,
              affixes,
            },
          });
        }
      } else {
        for (let i = 0; i < recipe.outputQuantity; i++) {
          await prisma.playerInventoryItem.create({
            data: {
              userId,
              itemSlug: recipe.outputItemSlug,
              quantity: 1,
              durability,
              affixes,
            },
          });
        }
      }

      const newXp = playerSkill.xp + recipe.xpReward;
      const newLevel = Math.max(playerSkill.level, Math.floor(Math.sqrt(newXp / 100)) + 1);
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
