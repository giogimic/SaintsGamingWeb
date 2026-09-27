import { resolveEntitySpriteUrl } from './creatureCatalog';
import type { PresentationDefinition, ModularAttachmentDef } from './canonicalAsset';

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

  const configuredAttachments = Array.isArray(data.modularAttachments)
    ? data.modularAttachments
    : Array.isArray(model.modularAttachments)
      ? model.modularAttachments
      : [];
  const modularAttachments: ModularAttachmentDef[] = configuredAttachments
      .filter((att: any) => att?.defaultVisible !== false)
      .map((att: any): ModularAttachmentDef | undefined => {
        const rawId = typeof att === 'string' ? att : att?.assetId;
        if (!rawId) return undefined;
        const url = resolveEntitySpriteUrl(rawId);
        if (!url) return undefined;
        return {
          modelUrl: url,
          assetId: rawId,
          socket: att?.socket || (att?.attachmentMode === 'SKINNED' ? undefined : 'RightHandMount'),
          attachOffset: att?.attachOffset,
          sheathedSocket: att?.sheathedSocket,
          sheathedOffset: att?.sheathedOffset,
          attachmentMode: att?.attachmentMode || (att?.isModular ? 'SKINNED' : 'RIGID_SOCKET'),
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
