import { prisma } from "@/web/lib/prisma";
import { GameEngine } from "./GameEngine";
import { PlayerManager } from "./PlayerManager";

export class CraftingManager {
  private engine: GameEngine;
  private playerManager: PlayerManager;

  constructor(engine: GameEngine, playerManager: PlayerManager) {
    this.engine = engine;
    this.playerManager = playerManager;
  }

  public async initialize() {
    this.engine.events.on("craftRequestAction", async (data: { accountId: string, recipeSlug: string, socketId: string }) => {
      await this.handleCraftItem(data.accountId, data.recipeSlug, data.socketId);
    });
  }

  // Generate ARPG style random affixes for crafted gear
  private generateCraftedAffixes(itemSlug: string, skillLevel: number) {
    // Basic RNG implementation for demonstration. 
    // In a full game this would lookup item templates to see what affixes it can roll.
    const hasAffix = Math.random() < 0.3 + (skillLevel * 0.01); // 30% base chance + 1% per skill level
    if (!hasAffix) return null;

    const affixes = [
      { key: "attackPower", max: 5 },
      { key: "defense", max: 5 },
      { key: "maxHp", max: 20 },
      { key: "critChance", max: 0.05 },
    ];

    const chosen = affixes[Math.floor(Math.random() * affixes.length)];
    let val = Math.random() * chosen.max;
    // Boost based on skill level
    val = val * (1 + (skillLevel / 100));
    
    // Round for non-decimals
    if (chosen.max >= 1) val = Math.ceil(val);
    else val = Number(val.toFixed(2));

    return JSON.stringify({ [chosen.key]: val });
  }

  public async handleCraftItem(accountId: string, recipeSlug: string, socketId: string) {
    const player = this.playerManager.getPlayer(socketId);
    if (!player) return;

    try {
      // 1. Fetch Recipe
      const recipe = await prisma.craftingRecipe.findUnique({
        where: { slug: recipeSlug }
      });

      if (!recipe) {
        this.engine.events.emit("directMessage", { socketId, event: "chat_message", data: { sender: "System", message: "Invalid recipe." } });
        return;
      }

      // 2. Fetch Player Skill Level
      let playerSkill = await prisma.playerSkill.findUnique({
        where: { userId_skillSlug: { userId: player.accountId, skillSlug: recipe.skillSlug } }
      });

      if (!playerSkill || playerSkill.level < recipe.levelReq) {
        this.engine.events.emit("directMessage", { 
          socketId,
          event: "chat_message", 
          data: { sender: "System", message: `You need level ${recipe.levelReq} ${recipe.skillSlug} to craft this.` }
        });
        return;
      }

      // 3. Verify Ingredients
      const ingredients: { itemSlug: string, qty: number }[] = JSON.parse(recipe.ingredients);
      const inventory = await prisma.playerInventoryItem.findMany({
        where: { userId: player.accountId }
      });

      for (const ing of ingredients) {
        const owned = inventory.filter(i => i.itemSlug === ing.itemSlug).reduce((sum, item) => sum + item.quantity, 0);
        if (owned < ing.qty) {
          this.engine.events.emit("directMessage", { 
            socketId,
            event: "chat_message", 
            data: { sender: "System", message: `Not enough ${ing.itemSlug}. Need ${ing.qty}.` }
          });
          return;
        }
      }

      // 4. Deduct Ingredients
      for (const ing of ingredients) {
        let remainingToDeduct = ing.qty;
        const ownedItems = inventory.filter(i => i.itemSlug === ing.itemSlug);
        for (const owned of ownedItems) {
          if (remainingToDeduct <= 0) break;
          
          if (owned.quantity <= remainingToDeduct) {
            remainingToDeduct -= owned.quantity;
            await prisma.playerInventoryItem.delete({ where: { id: owned.id } });
          } else {
            await prisma.playerInventoryItem.update({
              where: { id: owned.id },
              data: { quantity: owned.quantity - remainingToDeduct }
            });
            remainingToDeduct = 0;
          }
        }
      }

      // 5. Generate Item Output
      const outputTemplate = await prisma.itemTemplate.findUnique({
        where: { slug: recipe.outputItemSlug }
      });

      let durability = outputTemplate?.baseDurability;
      let affixes = null;
      
      // If it's gear, roll affixes
      if (outputTemplate && ["WEAPON", "ARMOR", "TOOL"].includes(outputTemplate.category)) {
        affixes = this.generateCraftedAffixes(recipe.outputItemSlug, playerSkill.level);
      }

      if (outputTemplate?.stackable) {
        // Find existing stack
        const existing = await prisma.playerInventoryItem.findFirst({
          where: { userId: player.accountId, itemSlug: recipe.outputItemSlug }
        });
        if (existing) {
          await prisma.playerInventoryItem.update({
            where: { id: existing.id },
            data: { quantity: existing.quantity + recipe.outputQuantity }
          });
        } else {
          await prisma.playerInventoryItem.create({
            data: {
              userId: player.accountId,
              itemSlug: recipe.outputItemSlug,
              quantity: recipe.outputQuantity,
              durability,
              affixes
            }
          });
        }
      } else {
        // Create unstackable item
        for (let i = 0; i < recipe.outputQuantity; i++) {
          await prisma.playerInventoryItem.create({
            data: {
              userId: player.accountId,
              itemSlug: recipe.outputItemSlug,
              quantity: 1,
              durability,
              affixes
            }
          });
        }
      }

      // 6. Award XP
      const newXp = playerSkill.xp + recipe.xpReward;
      // Basic curve: level = Math.floor(sqrt(xp / 100)) + 1
      const newLevel = Math.max(playerSkill.level, Math.floor(Math.sqrt(newXp / 100)) + 1);

      await prisma.playerSkill.update({
        where: { id: playerSkill.id },
        data: { xp: newXp, level: newLevel }
      });

      // 7. Notify Client
      this.engine.events.emit("directMessage", { 
        socketId,
        event: "chat_message", 
        data: { sender: "System", message: `Successfully crafted ${recipe.outputQuantity}x ${recipe.outputItemSlug}! (+${recipe.xpReward} XP)` }
      });
      if (newLevel > playerSkill.level) {
         this.engine.events.emit("directMessage", { 
          socketId,
          event: "chat_message", 
          data: { sender: "System", message: `Congratulations! Your ${recipe.skillSlug} level is now ${newLevel}!` }
        });
      }

      // Sync inventory & skills to client
      this.engine.events.emit("directMessage", { socketId, event: "inventory_sync", data: {} });
      this.engine.events.emit("directMessage", { socketId, event: "skill_sync", data: {} });

    } catch (e) {
      console.error("Error crafting item:", e);
      this.engine.events.emit("directMessage", { socketId, event: "chat_message", data: { sender: "System", message: "An error occurred while crafting." } });
    }
  }
}
