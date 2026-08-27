/**
 * Saints Gaming — Master Player Crafting, Recipe Discovery, Alchemy Transmutation & Item Enchanting Engine (Bible 05, 08, 14, 21, 27)
 * Manages multi-discipline recipe crafting, experimental recipe discovery, masterwork quality rolls, and rune enchantment socketing.
 */

export type CraftingDiscipline =
  | 'SMITHING'
  | 'ALCHEMY_TRANSMUTATION'
  | 'ENCHANTING_RUNECRAFT'
  | 'LEATHERWORKING_TAILORING'
  | 'COOKING_BREWING'
  | 'smithing'
  | 'cooking'
  | 'crafting'
  | 'herblore'
  | 'fletching'
  | 'firemaking'
  | 'runecrafting'
  | 'construction'
  | 'magic'
  | 'necromancy';

export type CraftingStation =
  | 'FORGE'
  | 'ALCHEMY_LAB'
  | 'ENCHANTING_ALTAR'
  | 'CAMPFIRE'
  | 'HANDS';

export type ItemQuality = 'NORMAL' | 'SUPERIOR' | 'MASTERWORK' | 'LEGENDARY';

export interface IngredientRequirement {
  itemId: string;
  quantity: number;
}

export interface CraftingRecipe {
  id: string;
  name: string;
  discipline: CraftingDiscipline;
  requiredStation: CraftingStation;
  requiredLevel: number;
  ingredients: IngredientRequirement[];
  outputItemId: string;
  outputQuantity: number;
  baseXp: number;
  isSecretDiscovery?: boolean;
  enchantmentSockets?: number;
}

export interface EnchantmentRune {
  runeId: string;
  name: string;
  bonusStat: string;
  bonusValue: number;
  description: string;
}

export interface CraftedItem {
  itemUid: string;
  itemId: string;
  name: string;
  quality: ItemQuality;
  quantity: number;
  crafterId: string;
  enchantmentSockets: number;
  slottedRunes: EnchantmentRune[];
}

export class MasterCraftingEngine {
  private recipes = new Map<string, CraftingRecipe>();
  private runes = new Map<string, EnchantmentRune>();
  private discoveredRecipes = new Map<string, Set<string>>(); // crafterId -> Set<recipeId>

  /**
   * Registers a crafting recipe.
   */
  public registerRecipe(recipe: CraftingRecipe) {
    this.recipes.set(recipe.id, { ...recipe });
  }

  /**
   * Registers an enchantment rune.
   */
  public registerRune(rune: EnchantmentRune) {
    this.runes.set(rune.runeId, { ...rune });
  }

  /**
   * Crafts a known recipe at a valid crafting station.
   */
  public craftRecipe(
    crafterId: string,
    recipeId: string,
    playerLevel: number,
    station: CraftingStation,
    inventory: Map<string, number>,
    forceQuality?: ItemQuality
  ): {
    success: boolean;
    outputItem?: CraftedItem;
    xpEarned: number;
    error?: string;
  } {
    const recipe = this.recipes.get(recipeId);
    if (!recipe) {
      return { success: false, xpEarned: 0, error: `Recipe ${recipeId} not found` };
    }

    if (station !== recipe.requiredStation && recipe.requiredStation !== 'HANDS') {
      return {
        success: false,
        xpEarned: 0,
        error: `Requires station ${recipe.requiredStation} (current: ${station})`,
      };
    }

    if (playerLevel < recipe.requiredLevel) {
      return {
        success: false,
        xpEarned: 0,
        error: `Requires ${recipe.discipline} level ${recipe.requiredLevel} (current: ${playerLevel})`,
      };
    }

    // Validate and consume ingredients
    for (const req of recipe.ingredients) {
      const avail = inventory.get(req.itemId) || 0;
      if (avail < req.quantity) {
        return {
          success: false,
          xpEarned: 0,
          error: `Missing ingredient: ${req.itemId} (${avail}/${req.quantity})`,
        };
      }
    }

    for (const req of recipe.ingredients) {
      const avail = inventory.get(req.itemId) || 0;
      inventory.set(req.itemId, avail - req.quantity);
    }

    // Determine quality roll based on level difference
    let quality: ItemQuality = forceQuality || 'NORMAL';
    if (!forceQuality) {
      const levelDiff = playerLevel - recipe.requiredLevel;
      if (levelDiff >= 20 && Math.random() < 0.15) quality = 'MASTERWORK';
      else if (levelDiff >= 10 && Math.random() < 0.35) quality = 'SUPERIOR';
    }

    const outputItem: CraftedItem = {
      itemUid: `craft_${recipe.outputItemId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      itemId: recipe.outputItemId,
      name: `${quality !== 'NORMAL' ? quality + ' ' : ''}${recipe.name}`,
      quality,
      quantity: recipe.outputQuantity,
      crafterId,
      enchantmentSockets: recipe.enchantmentSockets || 0,
      slottedRunes: [],
    };

    return {
      success: true,
      outputItem,
      xpEarned: recipe.baseXp,
    };
  }

  /**
   * Conducts blind experimentation to discover unknown secret recipes.
   */
  public experimentCraft(
    crafterId: string,
    discipline: CraftingDiscipline,
    station: CraftingStation,
    playerLevel: number,
    ingredients: IngredientRequirement[]
  ): {
    success: boolean;
    recipeDiscovered?: CraftingRecipe;
    outputItem?: CraftedItem;
    bonusXp: number;
    error?: string;
  } {
    // Search for matching recipe in discipline
    const match = Array.from(this.recipes.values()).find((r) => {
      if (r.discipline !== discipline) return false;
      if (r.requiredStation !== station && r.requiredStation !== 'HANDS') return false;
      if (r.ingredients.length !== ingredients.length) return false;

      return r.ingredients.every((req) => {
        const provided = ingredients.find((i) => i.itemId === req.itemId);
        return provided && provided.quantity === req.quantity;
      });
    });

    if (!match) {
      return {
        success: false,
        bonusXp: 10,
        error: 'The experimental fusion fizzled and produced inert residue',
      };
    }

    if (playerLevel < match.requiredLevel) {
      return {
        success: false,
        bonusXp: 0,
        error: `Recipe requires ${discipline} level ${match.requiredLevel} to stabilize`,
      };
    }

    // Record discovery
    let set = this.discoveredRecipes.get(crafterId);
    if (!set) {
      set = new Set<string>();
      this.discoveredRecipes.set(crafterId, set);
    }
    set.add(match.id);

    const outputItem: CraftedItem = {
      itemUid: `craft_${match.outputItemId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      itemId: match.outputItemId,
      name: match.name,
      quality: 'NORMAL',
      quantity: match.outputQuantity,
      crafterId,
      enchantmentSockets: match.enchantmentSockets || 0,
      slottedRunes: [],
    };

    return {
      success: true,
      recipeDiscovered: match,
      outputItem,
      bonusXp: match.baseXp * 2, // Double discovery XP
    };
  }

  /**
   * Sockets an enchantment rune into an item's available enchantment socket.
   */
  public socketEnchantment(
    item: CraftedItem,
    runeId: string
  ): { success: boolean; item?: CraftedItem; error?: string } {
    const rune = this.runes.get(runeId);
    if (!rune) {
      return { success: false, error: `Rune ${runeId} not found` };
    }

    if (item.slottedRunes.length >= item.enchantmentSockets) {
      return {
        success: false,
        error: `No available enchantment sockets (${item.slottedRunes.length}/${item.enchantmentSockets})`,
      };
    }

    item.slottedRunes.push({ ...rune });

    return {
      success: true,
      item,
    };
  }
}
