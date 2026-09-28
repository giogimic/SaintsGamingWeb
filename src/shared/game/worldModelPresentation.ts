import { resolveEntitySpriteUrl } from './creatureCatalog';
import type { PresentationDefinition, ModularAttachmentDef } from './canonicalAsset';
import {
  getDefaultModelWardrobeAttachmentMode,
  getDefaultModelWardrobeSocket,
} from './modelWardrobe';

/** Safely resolve a 3D model asset string to its GLB/GLTF model URL without falling back to 2D png sprites. */
export function resolveModelAssetUrl(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const trimmed = String(raw).trim();
  if (!trimmed) return undefined;

  // Direct URLs or web assets
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed;
  }

  // Files in uploads folder
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/')) {
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }

  // Upload identifiers
  if (trimmed.startsWith('upload_') || trimmed.startsWith('asset_custom_')) {
    if (/\.(glb|gltf|fbx|obj)$/i.test(trimmed)) {
      return `/uploads/${trimmed}`;
    }
    return `/uploads/${trimmed}.glb`;
  }

  // Explicit model file extensions
  if (/\.(glb|gltf|fbx|obj)$/i.test(trimmed)) {
    return trimmed.startsWith('/') ? trimmed : `/game-assets/models/${trimmed}`;
  }

  // Explicit absolute paths that do not end in 2D raster image extensions
  if (trimmed.startsWith('/') && !/\.(png|jpg|jpeg|webp|gif|svg)$/i.test(trimmed)) {
    return trimmed;
  }

  return undefined;
}

/** Resolve the per-actor world model config stored by Studio's shared model selector. */
export function getWorldModelPresentation(value?: unknown): PresentationDefinition | undefined {
  if (!value) return undefined;

  let data: any = value;
  if (typeof value === 'string') {
    try {
      data = JSON.parse(value);
    } catch {
      return undefined;
    }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return undefined;

  const model = data.worldModel || data;
  const modelType = model.type || model.assetProfileId;
  if (!model.assetId || (modelType !== '3D Model' && modelType !== 'MODEL')) return undefined;

  const candidateBaseUrl = model.modelUrl || model.source || (typeof model === 'object' && model?.url);
  const modelUrl = candidateBaseUrl || resolveModelAssetUrl(model.assetId) || resolveEntitySpriteUrl(model.assetId);
  if (!modelUrl) return undefined;

  const configuredAttachments = Array.isArray(data.modularAttachments)
    ? data.modularAttachments
    : Array.isArray(model.modularAttachments)
      ? model.modularAttachments
      : [];
  const modularAttachments: ModularAttachmentDef[] = configuredAttachments
      .filter((att: any) => att?.defaultVisible !== false)
      .map((att: any): ModularAttachmentDef | undefined => {
        const rawId = typeof att === 'string' ? att : att?.assetId;
        const candidateUrl = typeof att === 'object' && att ? (att.modelUrl || att.source || att.url) : undefined;
        const url = candidateUrl || resolveModelAssetUrl(rawId) || (rawId && /\.(glb|gltf)$/i.test(rawId) ? resolveEntitySpriteUrl(rawId) : undefined);
        if (!url) return undefined;
        const wardrobeItem = typeof att === 'string' ? { assetId: rawId, modelUrl: url } : { ...att, assetId: rawId, modelUrl: url };
        const attachmentMode = getDefaultModelWardrobeAttachmentMode(wardrobeItem);
        return {
          modelUrl: url,
          assetId: rawId,
          socket: att?.socket || (attachmentMode === 'SKINNED' ? undefined : getDefaultModelWardrobeSocket(wardrobeItem)),
          attachOffset: att?.attachOffset,
          sheathedSocket: att?.sheathedSocket,
          sheathedOffset: att?.sheathedOffset,
          attachmentMode,
          hidesComponents: Array.isArray(att?.hidesComponents) ? att.hidesComponents : [],
          scale: Number(att?.scale) || undefined,
        };
      })
      .filter((a: ModularAttachmentDef | undefined): a is ModularAttachmentDef => !!a);

  const modularModelUrls = modularAttachments.map((a: ModularAttachmentDef) => a.modelUrl);
  const scale = Number(model.scale ?? model.modelScale ?? data.scale ?? data.modelScale ?? (data.assetDefinition?.transform?.scale));

  const camHeight = Number(model.cameraHeightOffset ?? model.cameraYOffset ?? data.cameraHeightOffset ?? data.cameraYOffset ?? (data.assetDefinition?.transform?.cameraYOffset));

  const animations = model.animations ?? data.animations ?? data.assetDefinition?.animations;
  const rigAnalysis = model.rigAnalysis ?? data.rigAnalysis ?? data.assetDefinition?.rigAnalysis;
  const categorizedAnimations = model.categorizedAnimations ?? data.categorizedAnimations ?? data.assetDefinition?.categorizedAnimations;
  const skeletonRequirements = model.skeletonRequirements ?? data.skeletonRequirements ?? data.assetDefinition?.skeletonRequirements;
  const materials = model.materials ?? data.materials ?? data.assetDefinition?.materials;

  return {
    mode: '3D',
    assetId: model.assetId,
    animationProfileId: model.animationProfileId ?? data.animationProfileId ?? data.assetDefinition?.animationProfileId,
    modelUrl,
    modularModelUrls,
    modularAttachments,
    modelScale: Number.isFinite(scale) && scale > 0 ? Math.min(100, scale) : undefined,
    cameraHeightOffset: Number.isFinite(camHeight) && camHeight > 0 ? camHeight : undefined,
    animations,
    rigAnalysis,
    categorizedAnimations,
    skeletonRequirements,
    materials,
  };
}
