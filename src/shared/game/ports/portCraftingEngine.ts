/**
 * Port Trade Goods Economy & Ancient Armor Crafting Matrix (Bible 18 & Bible 31).
 *
 * Implements:
 * - Trade resource inventory (Bamboo, Slate, Cherrywood, Gunpowder, Lacquer, Chi, Ancient Bones, Plate, Chimes).
 * - Ancient Armor & Scrimshaw crafting formulas:
 *   - Superior Tetsu Armor (Plate + Smithing 90)
 *   - Superior Death Lotus Armor (Lacquer + Crafting 90)
 *   - Superior Seasinger Armor (Chi + Runecrafting 90)
 *   - Combat Scrimshaws (Ancient Bones + Fletching 90).
 * - Scroll fragment unlock matrix (4 scroll pieces required per recipe).
 */

export type PortTradeResource =
  | 'bamboo'
  | 'slate'
  | 'cherrywood'
  | 'gunpowder'
  | 'lacquer'
  | 'chi'
  | 'ancient_bones'
  | 'plate'
  | 'chimes';

export interface CraftingMaterialCost {
  resource: PortTradeResource;
  amount: number;
}

export interface AncientRecipeDef {
  id: string;
  name: string;
  category: 'TETSU' | 'DEATH_LOTUS' | 'SEASINGER' | 'SCRIMSHAW';
  skillRequired: 'smithing' | 'crafting' | 'runecrafting' | 'fletching';
  levelRequired: number;
  scrollPiecesRequired: number;
  materials: CraftingMaterialCost[];
  outputItemId: string;
  outputName: string;
}

export interface PlayerPortCraftingState {
  resources: Record<PortTradeResource, number>;
  unlockedScrolls: Record<string, number>; // recipeId -> unlockedPieces (0-4)
  skillLevels: {
    smithing: number;
    crafting: number;
    runecrafting: number;
    fletching: number;
  };
}

export const ANCIENT_RECIPES: Record<string, AncientRecipeDef> = {
  // Tetsu (Melee)
  tetsu_helm: {
    id: 'tetsu_helm',
    name: 'Superior Tetsu Helm',
    category: 'TETSU',
    skillRequired: 'smithing',
    levelRequired: 90,
    scrollPiecesRequired: 4,
    materials: [{ resource: 'plate', amount: 50 }],
    outputItemId: 'superior_tetsu_helm',
    outputName: 'Superior Tetsu Helm',
  },
  tetsu_body: {
    id: 'tetsu_body',
    name: 'Superior Tetsu Body',
    category: 'TETSU',
    skillRequired: 'smithing',
    levelRequired: 90,
    scrollPiecesRequired: 4,
    materials: [{ resource: 'plate', amount: 100 }],
    outputItemId: 'superior_tetsu_body',
    outputName: 'Superior Tetsu Body',
  },
  tetsu_legs: {
    id: 'tetsu_legs',
    name: 'Superior Tetsu Legs',
    category: 'TETSU',
    skillRequired: 'smithing',
    levelRequired: 90,
    scrollPiecesRequired: 4,
    materials: [{ resource: 'plate', amount: 80 }],
    outputItemId: 'superior_tetsu_legs',
    outputName: 'Superior Tetsu Legs',
  },

  // Death Lotus (Ranged)
  death_lotus_hood: {
    id: 'death_lotus_hood',
    name: 'Superior Death Lotus Hood',
    category: 'DEATH_LOTUS',
    skillRequired: 'crafting',
    levelRequired: 90,
    scrollPiecesRequired: 4,
    materials: [{ resource: 'lacquer', amount: 50 }],
    outputItemId: 'superior_death_lotus_hood',
    outputName: 'Superior Death Lotus Hood',
  },
  death_lotus_chest: {
    id: 'death_lotus_chest',
    name: 'Superior Death Lotus Chestplate',
    category: 'DEATH_LOTUS',
    skillRequired: 'crafting',
    levelRequired: 90,
    scrollPiecesRequired: 4,
    materials: [{ resource: 'lacquer', amount: 100 }],
    outputItemId: 'superior_death_lotus_chest',
    outputName: 'Superior Death Lotus Chestplate',
  },
  death_lotus_chaps: {
    id: 'death_lotus_chaps',
    name: 'Superior Death Lotus Chaps',
    category: 'DEATH_LOTUS',
    skillRequired: 'crafting',
    levelRequired: 90,
    scrollPiecesRequired: 4,
    materials: [{ resource: 'lacquer', amount: 80 }],
    outputItemId: 'superior_death_lotus_chaps',
    outputName: 'Superior Death Lotus Chaps',
  },

  // Seasinger (Magic)
  seasinger_hood: {
    id: 'seasinger_hood',
    name: 'Superior Seasinger Hood',
    category: 'SEASINGER',
    skillRequired: 'runecrafting',
    levelRequired: 90,
    scrollPiecesRequired: 4,
    materials: [{ resource: 'chi', amount: 50 }],
    outputItemId: 'superior_seasinger_hood',
    outputName: 'Superior Seasinger Hood',
  },
  seasinger_robe_top: {
    id: 'seasinger_robe_top',
    name: 'Superior Seasinger Robe Top',
    category: 'SEASINGER',
    skillRequired: 'runecrafting',
    levelRequired: 90,
    scrollPiecesRequired: 4,
    materials: [{ resource: 'chi', amount: 100 }],
    outputItemId: 'superior_seasinger_robe_top',
    outputName: 'Superior Seasinger Robe Top',
  },
  seasinger_robe_bottom: {
    id: 'seasinger_robe_bottom',
    name: 'Superior Seasinger Robe Bottom',
    category: 'SEASINGER',
    skillRequired: 'runecrafting',
    levelRequired: 90,
    scrollPiecesRequired: 4,
    materials: [{ resource: 'chi', amount: 80 }],
    outputItemId: 'superior_seasinger_robe_bottom',
    outputName: 'Superior Seasinger Robe Bottom',
  },

  // Scrimshaws
  scrimshaw_vampyrism: {
    id: 'scrimshaw_vampyrism',
    name: 'Superior Scrimshaw of Vampyrism',
    category: 'SCRIMSHAW',
    skillRequired: 'fletching',
    levelRequired: 90,
    scrollPiecesRequired: 4,
    materials: [{ resource: 'ancient_bones', amount: 10 }],
    outputItemId: 'superior_scrimshaw_vampyrism',
    outputName: 'Superior Scrimshaw of Vampyrism',
  },
};

/**
 * Initializes a new port crafting account state.
 */
export function initializePortCraftingState(): PlayerPortCraftingState {
  return {
    resources: {
      bamboo: 0,
      slate: 0,
      cherrywood: 0,
      gunpowder: 0,
      lacquer: 0,
      chi: 0,
      ancient_bones: 0,
      plate: 0,
      chimes: 0,
    },
    unlockedScrolls: {},
    skillLevels: {
      smithing: 1,
      crafting: 1,
      runecrafting: 1,
      fletching: 1,
    },
  };
}

/**
 * Adds a scroll fragment toward unlocking an Ancient recipe (4 fragments = unlocked).
 */
export function addScrollPiece(
  state: PlayerPortCraftingState,
  recipeId: string
): { currentPieces: number; isFullyUnlocked: boolean } {
  const current = (state.unlockedScrolls[recipeId] || 0) + 1;
  state.unlockedScrolls[recipeId] = Math.min(4, current);
  return {
    currentPieces: state.unlockedScrolls[recipeId],
    isFullyUnlocked: state.unlockedScrolls[recipeId] >= 4,
  };
}

/**
 * Crafts an Ancient equipment or scrimshaw item.
 */
export function craftAncientItem(
  state: PlayerPortCraftingState,
  recipeId: string
): { success: boolean; outputItem?: { id: string; name: string }; error?: string } {
  const recipe = ANCIENT_RECIPES[recipeId];
  if (!recipe) {
    return { success: false, error: 'Unknown Ancient recipe' };
  }

  // Check scroll pieces
  const pieces = state.unlockedScrolls[recipeId] || 0;
  if (pieces < recipe.scrollPiecesRequired) {
    return {
      success: false,
      error: `Recipe requires ${recipe.scrollPiecesRequired} scroll fragments (Unlocked: ${pieces}/4)`,
    };
  }

  // Check skill level
  const playerSkill = state.skillLevels[recipe.skillRequired] || 1;
  if (playerSkill < recipe.levelRequired) {
    return {
      success: false,
      error: `Requires level ${recipe.levelRequired} ${recipe.skillRequired} (Current: ${playerSkill})`,
    };
  }

  // Check material costs
  for (const mat of recipe.materials) {
    const available = state.resources[mat.resource] || 0;
    if (available < mat.amount) {
      return {
        success: false,
        error: `Insufficient ${mat.resource} (Requires: ${mat.amount}, Available: ${available})`,
      };
    }
  }

  // Deduct materials
  for (const mat of recipe.materials) {
    state.resources[mat.resource] -= mat.amount;
  }

  return {
    success: true,
    outputItem: {
      id: recipe.outputItemId,
      name: recipe.outputName,
    },
  };
}
