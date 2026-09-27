import { resolveEntitySpriteUrl } from './creatureCatalog';
import type { PresentationDefinition } from './canonicalAsset';

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

  const modelUrl = resolveEntitySpriteUrl(model.assetId);
  if (!modelUrl) return undefined;

  const modularModelUrls = Array.isArray(data.modularAttachments)
    ? data.modularAttachments
      .map((attachment: any) => attachment?.assetId ? resolveEntitySpriteUrl(attachment.assetId) : undefined)
      .filter((url: string | undefined): url is string => !!url)
    : [];
  const scale = Number(model.scale ?? model.modelScale ?? data.scale ?? data.modelScale ?? (data.assetDefinition?.transform?.scale));

  const camHeight = Number(model.cameraHeightOffset ?? model.cameraYOffset ?? data.cameraHeightOffset ?? data.cameraYOffset ?? (data.assetDefinition?.transform?.cameraYOffset));

  const animations = model.animations ?? data.animations ?? data.assetDefinition?.animations;

  return {
    mode: '3D',
    assetId: model.assetId,
    modelUrl,
    modularModelUrls,
    modelScale: Number.isFinite(scale) && scale > 0 ? Math.min(100, scale) : undefined,
    cameraHeightOffset: Number.isFinite(camHeight) && camHeight > 0 ? camHeight : undefined,
    animations,
  };
}
