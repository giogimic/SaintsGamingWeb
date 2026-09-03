import { describe, it, expect } from "vitest";
import { validateVoxelDocSave, validateMapSave } from "@/shared/game/mapSaveValidation";
import { generateDefaultWorldDoc } from "@/shared/game/voxel/VoxelWorldDoc";
import { generateGridFromVoxelDoc } from "@/shared/game/voxel/voxelToGrid";
import { CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z } from "@/shared/game/voxel/VoxelChunk";
import { VoxelPhysics } from "@/shared/game/voxel/VoxelWord";

describe("Volumetric Map Save Pipeline & Validation", () => {
  it("generates a valid 32³ VoxelWorldDocV3 adhering to project specifications", () => {
    const doc = generateDefaultWorldDoc(2, 2, 64, 64, 64);
    expect(doc.formatVersion).toBe(3);
    expect(doc.dimensions.widthChunks).toBe(2);
    expect(doc.dimensions.depthChunks).toBe(2);
    expect(doc.dimensions.heightChunks).toBe(1);

    const validation = validateVoxelDocSave(doc);
    expect(validation.ok).toBe(true);
  });

  it("validates that missing 2D tilesets and layers do not cause map save rejection", () => {
    const doc = generateDefaultWorldDoc(1, 1, 32, 32, 32);
    const grid = generateGridFromVoxelDoc(doc, 32, 32);

    expect(grid.length).toBe(32);
    expect(grid[0].length).toBe(32);

    // Validate map save payload without any tileLayers or tilesets
    const logicTiles = [
      { id: 0, isSolid: false },
      { id: 1, isSolid: true },
      { id: 17, isSolid: false },
    ];

    const result = validateMapSave({ grid, npcs: [] }, logicTiles);
    expect(result.ok).toBe(true);
  });

  it("auto-derives a 2D walkability lattice from the 3D voxel physics surface layer", () => {
    const doc = generateDefaultWorldDoc(1, 1, 32, 32, 32);
    // In generateDefaultWorldDoc:
    // Y=0..14 is solid foundation
    // Y=15 is solid ground
    // Y=16 is body standing level (air)
    const grid = generateGridFromVoxelDoc(doc, 32, 32);

    // Center cell (16, 16) has air at Y=16 and ground at Y=15, so it is walkable (0)
    expect(grid[16][16]).toBe(0);

    // Border cell (0, 0) in generateDefaultWorldDoc has boundary wall
    // Verify border is solid (1)
    expect(grid[0][0]).toBe(1);
    expect(grid[0][16]).toBe(1);
    expect(grid[31][16]).toBe(1);
  });

  it("rejects corrupt or invalid voxel documents", () => {
    expect(validateVoxelDocSave(null).ok).toBe(false);
    expect(validateVoxelDocSave({}).ok).toBe(false);
    expect(validateVoxelDocSave({ formatVersion: 2 }).ok).toBe(false);
    expect(validateVoxelDocSave({ formatVersion: 3, dimensions: { widthChunks: -1, depthChunks: 1, heightChunks: 1 }, chunks: {} }).ok).toBe(false);
  });
});
