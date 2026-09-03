import { prisma } from "../src/web/lib/prisma";
import { generateDefaultWorldDoc, VoxelWorld } from "../src/shared/game/voxel/VoxelWorldDoc";
import { generateGridFromVoxelDoc } from "../src/shared/game/voxel/voxelToGrid";
import { validateVoxelDocSave } from "../src/shared/game/mapSaveValidation";
import { CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z } from "../src/shared/game/voxel/VoxelChunk";

async function main() {
  console.log("==> Starting End-to-End Volumetric Map Save Test...");

  const testMapId = "E2E_VOXEL_TEST_MAP";
  const width = 64;
  const height = 64;
  const widthChunks = Math.ceil(width / CHUNK_SIZE_X);
  const depthChunks = Math.ceil(height / CHUNK_SIZE_Z);

  // 1. Generate 32³ Voxel Document
  console.log(`[1] Synthesizing ${widthChunks}x${depthChunks}x1 (32³) VoxelWorldDoc...`);
  const voxelDoc = generateDefaultWorldDoc(widthChunks, depthChunks, 64, width, height);
  voxelDoc.id = testMapId;
  voxelDoc.name = "E2E Voxel Test Map";

  // 2. Validate Voxel Document
  console.log("[2] Validating Voxel Document...");
  const validation = validateVoxelDocSave(voxelDoc);
  if (!validation.ok) {
    throw new Error(`Validation failed: ${validation.error}`);
  }
  console.log("    Voxel Document is valid.");

  // 3. Auto-generate 2D Walkability Lattice from 3D Voxel Physics Surface
  console.log("[3] Generating 2D walkability lattice from 3D surface...");
  const grid = generateGridFromVoxelDoc(voxelDoc, width, height);
  if (grid.length !== height || grid[0].length !== width) {
    throw new Error(`Unexpected grid dimensions: ${grid[0].length}x${grid.length}`);
  }
  console.log(`    Lattice generated: ${grid[0].length}x${grid.length} cells. Center is walkable: ${grid[32][32] === 0}`);

  // 4. Upsert Map to Database (testing nullable legacy 2D fields + authoritative voxelData)
  console.log("[4] Upserting to WorldMap in database...");
  await prisma.worldMap.upsert({
    where: { id: testMapId },
    create: {
      id: testMapId,
      gameId: "saints",
      name: "E2E Voxel Test Map",
      gridData: JSON.stringify(grid),
      gatesData: "{}",
      npcsData: "[]",
      encountersData: "[]",
      tileLayersData: null, // Nullable legacy field
      tilesetsData: null,   // Nullable legacy field
      voxelData: JSON.stringify(voxelDoc),
      regionClass: "authored",
      proceduralConfig: JSON.stringify({ biome: "temperate_plains", seed: 42 }),
      version: 1,
    },
    update: {
      gridData: JSON.stringify(grid),
      tileLayersData: null,
      tilesetsData: null,
      voxelData: JSON.stringify(voxelDoc),
      regionClass: "authored",
      proceduralConfig: JSON.stringify({ biome: "temperate_plains", seed: 42 }),
      version: { increment: 1 },
    },
  });
  console.log("    Database upsert successful.");

  // 5. Query and Deserialize Map
  console.log("[5] Querying saved map from database...");
  const saved = await prisma.worldMap.findUnique({
    where: { id: testMapId },
  });
  if (!saved) {
    throw new Error("Map record not found in database after save!");
  }
  if (!saved.voxelData) {
    throw new Error("voxelData is missing or empty!");
  }

  const parsedDoc = JSON.parse(saved.voxelData);
  const world = VoxelWorld.deserializeFromDoc(parsedDoc);
  console.log(`    Deserialized world successfully. Chunks loaded: ${world.chunks.size}`);

  // 6. Clean up test map
  console.log("[6] Cleaning up test record...");
  await prisma.worldMap.delete({ where: { id: testMapId } });
  console.log("    Cleanup complete.");

  console.log("==> End-to-End Volumetric Map Save Test PASSED!");
}

main()
  .catch((err) => {
    console.error("FATAL ERROR in E2E test:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
