/**
 * Prepackaged World Asset & Starter Map Pack Management Engine
 * Defines importable starter packs (Community Starter, Blank Canvas, Retro Arenas)
 * and the importer engine for fresh install onboarding.
 */

import { DEMO_LOGIC_TILES } from './logicTilesSeed';
import { SETUP_SETTING_KEYS } from './setupDetection';

export interface StarterPackMeta {
  id: string;
  name: string;
  tagline: string;
  description: string;
  recommended: boolean;
  badge?: string;
  features: string[];
  mapCount: number;
  creatureCount: number;
  theme: string;
}

/**
 * Available Starter Packs Catalog
 */
export const AVAILABLE_STARTER_PACKS: StarterPackMeta[] = [
  {
    id: 'blank-canvas',
    name: 'Clean World Canvas',
    tagline: 'Pristine 0-Map Realm for Custom Level Design in Studio',
    description: 'Start with an empty world. Initializes the essential logic tile catalog, launching directly into Studio so you can build your first custom map from scratch.',
    recommended: true,
    badge: 'Clean Realm',
    features: [
      '0 Premade Maps — Complete creative control',
      'Studio Brush & Logic Tile Components Enabled',
      'Instant Launch into Studio Map Editor',
    ],
    mapCount: 0,
    creatureCount: 0,
    theme: 'Clean Canvas',
  },
];

/**
 * Imports and executes setup initialization in the database.
 */
export async function importStarterPackToDb(
  prismaClient: any,
  packId: string = 'blank-canvas',
  skipSetupCompletion: boolean = false
): Promise<{ success: boolean; importedMaps: number; importedCreatures: number; message: string }> {
  // 1. Seed essential logic tiles for Studio brush palette
  for (const tile of DEMO_LOGIC_TILES) {
    await prismaClient.mapLogicTile.upsert({
      where: { id: tile.id },
      create: {
        id: tile.id,
        name: tile.name,
        color: tile.color,
        isSolid: tile.isSolid,
        interactable: tile.interactable,
        onInteractAction: tile.onInteractAction,
        onInteractPayload: tile.onInteractPayload,
        onStepAction: tile.onStepAction,
        onStepPayload: tile.onStepPayload,
      },
      update: {
        name: tile.name,
        color: tile.color,
        isSolid: tile.isSolid,
        interactable: tile.interactable,
        onInteractAction: tile.onInteractAction,
        onInteractPayload: tile.onInteractPayload,
        onStepAction: tile.onStepAction,
        onStepPayload: tile.onStepPayload,
      },
    }).catch((e: any) => console.warn(`[Setup] Logic tile ${tile.id} skip:`, e.message));
  }

  // 2. Mark setup as initialized (if not skipped by CLI)
  if (!skipSetupCompletion) {
    const now = new Date().toISOString();
    const setupSettings = [
      { key: SETUP_SETTING_KEYS.STARTER_PACK_IMPORTED, value: packId },
      { key: SETUP_SETTING_KEYS.GAME_INITIALIZED, value: 'true' },
      { key: SETUP_SETTING_KEYS.GAME_INITIALIZED_AT, value: now },
      { key: SETUP_SETTING_KEYS.SETUP_COMPLETED, value: 'true' },
      { key: SETUP_SETTING_KEYS.SETUP_COMPLETED_AT, value: now },
    ];

    for (const s of setupSettings) {
      await prismaClient.siteSetting.upsert({
        where: { key: s.key },
        create: { key: s.key, value: s.value },
        update: { value: s.value },
      }).catch((e: any) => console.warn(`[Setup] Setting ${s.key} skip:`, e.message));
    }
  }

  return {
    success: true,
    importedMaps: 0,
    importedCreatures: 0,
    message: 'Clean canvas initialized. Ready for Studio level design.',
  };
}
