import { ProceduralVoxelGenerator } from './proceduralGenerator';
import { CANONICAL_BIOMES } from './biomeSchema';
import { VoxelChunk } from '../voxel/VoxelChunk';
import { FeaturePlacer } from './featurePlacer';
import { createHash } from 'crypto';

const biome = CANONICAL_BIOMES['emerald_plains'];
const generator = new ProceduralVoxelGenerator(biome);

// Test chunk (0,0,0)
const chunk0 = new VoxelChunk(0, 0, 0);
generator.populateChunk(0, 0, 0, chunk0);
FeaturePlacer.placeFeatures(chunk0, biome.seed, biome);
const bin0 = chunk0.serializePaletteRLEBinary();
const hash0 = createHash('sha256').update(bin0).digest('hex');
console.log(`TS Chunk (0,0,0) SHA256: ${hash0}`);

// Test chunk (1,0,1)
const chunk1 = new VoxelChunk(1, 1, 0); // cx=1, cz=1, cy=0
generator.populateChunk(1, 1, 0, chunk1);
const bin1Pre = chunk1.serializePaletteRLEBinary();
const hash1Pre = createHash('sha256').update(bin1Pre).digest('hex');
console.log(`TS Chunk (1,0,1) PRE-FEATURES: ${hash1Pre}`);

FeaturePlacer.placeFeatures(chunk1, biome.seed, biome);
const bin1 = chunk1.serializePaletteRLEBinary();
const hash1 = createHash('sha256').update(bin1).digest('hex');
console.log(`TS Chunk (1,0,1) SHA256: ${hash1}`);
