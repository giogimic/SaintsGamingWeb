import { prisma } from "@/web/lib/prisma";
import { DEMO_LOGIC_TILES } from "./demoMapSeed";
import { invalidateLogicTilesCache } from "@/shared/game/mapCache";

const VANCE_TREE = {
  node_start: {
    text: "Welcome to the realm. Studio tools are available in the editor toolbar to paint your world.",
    options: [{ label: "Understood.", nextNode: "exit" }],
  },
};


async function seedLogicTiles() {
  for (const tile of DEMO_LOGIC_TILES) {
    await prisma.mapLogicTile.upsert({
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
    });
  }
  invalidateLogicTilesCache();
  console.log(`[DemoBootstrap] MapLogicTile × ${DEMO_LOGIC_TILES.length}`);
}

let foundationInflight: Promise<{
  logicTiles: boolean;
  demoMap: boolean;
  error?: string;
}> | null = null;

export async function ensureStudioMapFoundation(): Promise<{
  logicTiles: boolean;
  demoMap: boolean;
  error?: string;
}> {
  if (foundationInflight) return foundationInflight;
  foundationInflight = (async () => {
    let logicTiles = false;
    let errStr: string | undefined;

    try {
      await seedLogicTiles();
      logicTiles = true;
    } catch (e) {
      errStr = (e as Error).message;
      console.warn("[DemoBootstrap] Logic tiles seed skipped:", errStr);
    }

    return { logicTiles, demoMap: false, error: errStr };
  })().finally(() => {
    foundationInflight = null;
  });
  return foundationInflight;
}

async function seedSimulationPresetsAndEvents() {
  try {
    // 1. Simulation Presets
    await prisma.simulationPreset.upsert({
      where: { slug: 'standard_rules' },
      create: {
        slug: 'standard_rules',
        name: 'Standard Realm Rules',
        description: 'Baseline experience, drop rate, and gold faucet multipliers.',
        isActive: true,
        xpMultiplier: 1.0,
        dropMultiplier: 1.0,
        goldMultiplier: 1.0,
      },
      update: {},
    });

    await prisma.simulationPreset.upsert({
      where: { slug: 'hardcore_challenge' },
      create: {
        slug: 'hardcore_challenge',
        name: 'Hardcore Survival',
        description: 'High-risk, high-reward hardcore simulation with reduced gold and increased drops.',
        isActive: false,
        xpMultiplier: 0.75,
        dropMultiplier: 1.5,
        goldMultiplier: 0.5,
      },
      update: {},
    });

    // 2. World Events
    await prisma.worldEventTemplate.upsert({
      where: { slug: 'blood_moon_invasion' },
      create: {
        slug: 'blood_moon_invasion',
        name: 'Blood Moon Invasion',
        description: 'A crimson eclipse surges creature aggression and increases rare monster spawns.',
        isActive: false,
        scheduleCron: '0 0 * * 0', // Weekly on Sunday midnight
        durationSeconds: 3600,
        mutationsData: JSON.stringify({ spawnRateMult: 2.0, weather: 'BLOOD_RAIN', timeOfDay: 'NIGHT' }),
      },
      update: {},
    });

    console.log('[DemoBootstrap] Simulation Presets & World Event templates seeded.');
  } catch (err) {
    console.warn('[DemoBootstrap] Presets/Events seed skipped:', err);
  }
}

/** Idempotent foundation seed for Studio logic tiles and baseline catalog. */
export async function bootstrapDemoContent() {
  console.log("[DemoBootstrap] Seeding studio logic tiles foundation…");

  const foundation = await ensureStudioMapFoundation();
  if (foundation.error) {
    console.warn(`[DemoBootstrap] Map foundation incomplete: ${foundation.error}`);
  }

  await seedSimulationPresetsAndEvents();

  console.log("[DemoBootstrap] Done");
}

export { VANCE_TREE };
