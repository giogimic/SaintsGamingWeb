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
  const scale = Number(model.scale);

  const camHeight = Number(model.cameraHeightOffset ?? data.cameraHeightOffset);

  return {
    mode: '3D',
    modelUrl,
    modularModelUrls,
    modelScale: Number.isFinite(scale) && scale > 0 ? Math.min(100, scale) : undefined,
    cameraHeightOffset: Number.isFinite(camHeight) && camHeight > 0 ? camHeight : undefined,
  };
}
