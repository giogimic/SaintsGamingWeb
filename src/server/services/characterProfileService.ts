import { prisma } from '@/web/lib/prisma';

export interface CharacterModelProfileInput {
  id?: string;
  slug: string;
  name: string;
  description?: string | null;
  category?: string;
  gameId?: string | null;
  baseModelAssetId?: string | null;
  rigFamily?: string;
  skeletonType?: string;
  transformData?: string;
  skeletonData?: string;
  animationData?: string;
  socketsData?: string;
  materialsData?: string;
  modularData?: string;
  thumbnailUrl?: string | null;
  tags?: string[] | string;
  version?: number;
  isDefault?: boolean;
  isActive?: boolean;
}

export async function getCharacterProfiles(filter?: {
  gameId?: string;
  category?: string;
  rigFamily?: string;
  isActive?: boolean;
  query?: string;
}) {
  const where: any = {};

  if (filter?.gameId) {
    where.OR = [{ gameId: filter.gameId }, { gameId: null }, { gameId: 'saints' }];
  }
  if (filter?.category) {
    where.category = filter.category;
  }
  if (filter?.rigFamily) {
    where.rigFamily = filter.rigFamily;
  }
  if (filter?.isActive !== undefined) {
    where.isActive = filter.isActive;
  }
  if (filter?.query?.trim()) {
    const q = filter.query.trim().toLowerCase();
    where.OR = [
      { name: { contains: q } },
      { slug: { contains: q } },
      { tags: { contains: q } },
    ];
  }

  const profiles = await (prisma as any).characterModelProfile.findMany({
    where,
    include: {
      baseModelAsset: true,
    },
    orderBy: [
      { isDefault: 'desc' },
      { updatedAt: 'desc' },
    ],
  });

  return profiles.map(hydrateProfile);
}

export async function getCharacterProfileBySlug(slug: string) {
  const profile = await (prisma as any).characterModelProfile.findUnique({
    where: { slug },
    include: {
      baseModelAsset: true,
    },
  });

  return profile ? hydrateProfile(profile) : null;
}

export async function getCharacterProfileById(id: string) {
  const profile = await (prisma as any).characterModelProfile.findUnique({
    where: { id },
    include: {
      baseModelAsset: true,
    },
  });

  return profile ? hydrateProfile(profile) : null;
}

export async function upsertCharacterProfile(data: CharacterModelProfileInput) {
  const tagsStr = Array.isArray(data.tags) ? JSON.stringify(data.tags) : (data.tags || '[]');

  const recordData = {
    name: data.name,
    description: data.description || null,
    category: data.category || 'character',
    gameId: data.gameId || 'saints',
    baseModelAssetId: data.baseModelAssetId || null,
    rigFamily: data.rigFamily || 'HUMANOID_BIPED',
    skeletonType: data.skeletonType || 'mixamo',
    transformData: data.transformData || '{"scale":0.8,"rotationY":0,"groundingOffsetY":0,"cameraHeightOffset":0}',
    skeletonData: data.skeletonData || '{"boneMap":{}}',
    animationData: data.animationData || '{"profileId":"","actionSlots":{}}',
    socketsData: data.socketsData || '[]',
    materialsData: data.materialsData || '{}',
    modularData: data.modularData || '{"isCustomizable":true,"components":[]}',
    thumbnailUrl: data.thumbnailUrl || null,
    tags: tagsStr,
    version: data.version || 1,
    isDefault: Boolean(data.isDefault),
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
  };

  const profile = await (prisma as any).characterModelProfile.upsert({
    where: { slug: data.slug },
    create: {
      id: data.id,
      slug: data.slug,
      ...recordData,
    },
    update: recordData,
    include: {
      baseModelAsset: true,
    },
  });

  return hydrateProfile(profile);
}

export async function deleteCharacterProfile(id: string) {
  return await (prisma as any).characterModelProfile.delete({
    where: { id },
  });
}

function hydrateProfile(raw: any) {
  let parsedTransform = { scale: 0.8, rotationY: 0, groundingOffsetY: 0, cameraHeightOffset: 0 };
  let parsedSkeleton = { boneMap: {} };
  let parsedAnimation = { profileId: '', actionSlots: {} };
  let parsedSockets = [];
  let parsedMaterials = {};
  let parsedModular = { isCustomizable: true, components: [] };
  let parsedTags: string[] = [];

  try { parsedTransform = JSON.parse(raw.transformData); } catch {}
  try { parsedSkeleton = JSON.parse(raw.skeletonData); } catch {}
  try { parsedAnimation = JSON.parse(raw.animationData); } catch {}
  try { parsedSockets = JSON.parse(raw.socketsData); } catch {}
  try { parsedMaterials = JSON.parse(raw.materialsData); } catch {}
  try { parsedModular = JSON.parse(raw.modularData); } catch {}
  try { parsedTags = JSON.parse(raw.tags); } catch {}

  return {
    ...raw,
    transform: parsedTransform,
    skeleton: parsedSkeleton,
    animation: parsedAnimation,
    sockets: parsedSockets,
    materials: parsedMaterials,
    modular: parsedModular,
    tagsList: parsedTags,
  };
}
