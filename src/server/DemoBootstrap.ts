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

/** Idempotent foundation seed for Studio logic tiles and baseline catalog. */
export async function bootstrapDemoContent() {
  console.log("[DemoBootstrap] Seeding studio logic tiles foundation…");

  const foundation = await ensureStudioMapFoundation();
  if (foundation.error) {
    console.warn(`[DemoBootstrap] Map foundation incomplete: ${foundation.error}`);
  }



  console.log("[DemoBootstrap] Done");
}

export { VANCE_TREE };
