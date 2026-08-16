/**
 * Saints Gaming — Player Title & Badge Equip Dispatcher (Bible 26)
 * Manages unlockable player titles, prefix/suffix display formatting, and prestige badge equips.
 */

export type TitlePosition = 'PREFIX' | 'SUFFIX';

export type TitleRarity =
  | 'COMMON'
  | 'RARE'
  | 'EPIC'
  | 'LEGENDARY'
  | 'GRANDMASTER';

export interface PlayerTitleDefinition {
  id: string;
  text: string;
  position: TitlePosition;
  rarity: TitleRarity;
  colorHex?: string;
}

export interface PlayerBadgeDefinition {
  id: string;
  name: string;
  iconName: string;
  description: string;
}

export interface PlayerTitleState {
  equippedTitleId?: string;
  equippedBadgeId?: string;
  unlockedTitleIds: string[];
  unlockedBadgeIds: string[];
}

export const CANONICAL_TITLES: Record<string, PlayerTitleDefinition> = {
  title_novice: {
    id: 'title_novice',
    text: 'Novice',
    position: 'PREFIX',
    rarity: 'COMMON',
    colorHex: '#9ca3af',
  },
  title_slayer: {
    id: 'title_slayer',
    text: 'the Monster Slayer',
    position: 'SUFFIX',
    rarity: 'RARE',
    colorHex: '#ef4444',
  },
  title_master_angler: {
    id: 'title_master_angler',
    text: 'Master Angler',
    position: 'PREFIX',
    rarity: 'EPIC',
    colorHex: '#3b82f6',
  },
  title_grandmaster: {
    id: 'title_grandmaster',
    text: 'the Grandmaster',
    position: 'SUFFIX',
    rarity: 'GRANDMASTER',
    colorHex: '#eab308',
  },
};

/**
 * Creates a default title state for a new character.
 */
export function createPlayerTitleState(): PlayerTitleState {
  return {
    equippedTitleId: undefined,
    equippedBadgeId: undefined,
    unlockedTitleIds: ['title_novice'],
    unlockedBadgeIds: [],
  };
}

/**
 * Equips an unlocked title.
 */
export function equipTitle(
  state: PlayerTitleState,
  titleId: string
): { success: boolean; reason?: string } {
  if (!state.unlockedTitleIds.includes(titleId)) {
    return { success: false, reason: 'Title is not unlocked.' };
  }
  if (!CANONICAL_TITLES[titleId]) {
    return { success: false, reason: 'Title definition does not exist.' };
  }

  state.equippedTitleId = titleId;
  return { success: true };
}

/**
 * Unequips the active title.
 */
export function unequipTitle(state: PlayerTitleState): void {
  state.equippedTitleId = undefined;
}

/**
 * Formats a player display name with prefix/suffix title text.
 */
export function formatPlayerDisplayName(
  rawName: string,
  state: PlayerTitleState,
  definitions: Record<string, PlayerTitleDefinition> = CANONICAL_TITLES
): {
  formattedName: string;
  titleText?: string;
  position?: TitlePosition;
  colorHex?: string;
} {
  if (!state.equippedTitleId || !definitions[state.equippedTitleId]) {
    return { formattedName: rawName };
  }

  const title = definitions[state.equippedTitleId];
  if (title.position === 'PREFIX') {
    return {
      formattedName: `${title.text} ${rawName}`,
      titleText: title.text,
      position: 'PREFIX',
      colorHex: title.colorHex,
    };
  } else {
    return {
      formattedName: `${rawName} ${title.text}`,
      titleText: title.text,
      position: 'SUFFIX',
      colorHex: title.colorHex,
    };
  }
}
