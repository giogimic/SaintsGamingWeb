import { ASSET_IMPORT_PROFILE_META, AssetSlotRole } from '../assetImportProfiles';

export type GameGenre = 'CREATURE_MMO' | 'ACTION_RPG' | 'TURN_BASED' | 'FARMING_SIM' | 'SANDBOX';
export type GameStyle = 'SAINTS_HYBRID' | 'TURN_BASED' | 'SAINTS_STANDARD' | 'COZY' | 'SANDBOX_BUILDER';

export interface GameDefinition {
  genre: GameGenre | string;
  style: GameStyle | string;
  camera: string;
}

export interface SetupRequirements {
  minCharacters: number;
  minCreatures: number;
}

export type AssetStyleChoice = 
  | 'lpc' 
  | 'directional_3x4' 
  | 'separate_directions' 
  | 'custom_sheet' 
  | 'static';

export interface EntityAssetRequirements {
  entityType: 'CHARACTER' | 'CREATURE';
  requiredRoles: AssetSlotRole[];
  optionalRoles: AssetSlotRole[];
  supportedStyles: AssetStyleChoice[];
}

/**
 * Calculates the required number of entities based on the selected game definition.
 */
export function getSetupRequirements(game: GameDefinition): SetupRequirements {
  let minCharacters = 1;
  let minCreatures = 0;

  // Hybrid or Creature MMO requires both character and creature
  if (
    game.genre === 'CREATURE_MMO' || 
    game.style === 'SAINTS_HYBRID' ||
    game.style === 'TURN_BASED'
  ) {
    minCreatures = 1;
  }

  // Pure turn-based creature battles might technically only require creatures,
  // but Saints gaming always assumes a playable 'Saint' (trainer) walks the overworld.
  
  return {
    minCharacters,
    minCreatures,
  };
}

/**
 * Gets the asset role requirements for a specific entity type, factoring in the game mode.
 */
export function getEntityAssetRequirements(input: {
  gameDefinition: GameDefinition;
  entityType: 'CHARACTER' | 'CREATURE';
}): EntityAssetRequirements {
  const { gameDefinition, entityType } = input;
  const isHybrid = gameDefinition.style === 'SAINTS_HYBRID';
  const isTurnBased = gameDefinition.style === 'TURN_BASED';

  if (entityType === 'CHARACTER') {
    // Standard character roles from assetImportProfiles
    const profileMeta = ASSET_IMPORT_PROFILE_META.character.roles;
    
    // In Saints, characters always need walk and idle for the overworld
    const requiredRoles = ['walk', 'idle'];
    const optionalRoles = Object.keys(profileMeta).filter(r => !requiredRoles.includes(r));
    
    return {
      entityType: 'CHARACTER',
      requiredRoles,
      optionalRoles,
      supportedStyles: ['lpc', 'directional_3x4', 'separate_directions', 'custom_sheet', 'static'],
    };
  } else {
    // CREATURE
    const profileMeta = ASSET_IMPORT_PROFILE_META.creature.roles;
    const requiredRoles: string[] = [];
    
    if (isTurnBased || isHybrid) {
      // Must have battle sprites for turn-based / hybrid combat
      requiredRoles.push('front', 'back');
    }
    
    if (gameDefinition.genre === 'CREATURE_MMO' || isHybrid) {
      // Must have an overworld representation for MMO / hybrid
      // We map this to 'walk' or 'idle' for creatures, but let's just use 'idle' as minimum overworld
      requiredRoles.push('idle');
    }
    
    // If no specific requirement triggered, at least require a front sprite
    if (requiredRoles.length === 0) {
      requiredRoles.push('front');
    }
    
    const optionalRoles = Object.keys(profileMeta).filter(r => !requiredRoles.includes(r));
    
    // Creature MMO / Action RPG support overworld walking
    // Turn-based might only support static battle art
    const supportedStyles: AssetStyleChoice[] = ['directional_3x4', 'separate_directions', 'custom_sheet', 'static'];
    
    return {
      entityType: 'CREATURE',
      requiredRoles,
      optionalRoles,
      supportedStyles,
    };
  }
}
