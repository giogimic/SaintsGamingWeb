/** Canonical spatial sizing for every Saints voxel world. */
export const CHUNK_SIZE = 32;
export const CHUNKS_PER_REGION = 8;
export const CHUNK_COUNT_PER_REGION = CHUNKS_PER_REGION * CHUNKS_PER_REGION;
export const REGION_SIZE_BLOCKS = CHUNK_SIZE * CHUNKS_PER_REGION;
