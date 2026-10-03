import { formatCanonicalGameAsset } from '@/shared/game/canonicalAsset';
import { getWorldModelPresentation, resolveModelAssetUrl, resolveWorldModelAssetValue } from '@/shared/game/worldModelPresentation';
import { isWorldModelEligibleForRole, type WorldModelRole } from '@/shared/game/worldModelRoles';

/** Resolve authoring assets while saving/compiling, then freeze their visual metadata in the actor. */
export async function hydrateActorModelBinding(value: unknown, role: WorldModelRole, database: any): Promise<any> {
  let data: any = value;
  if (typeof value === 'string') {
    try { data = JSON.parse(value); } catch { data = { type: resolveModelAssetUrl(value) ? '3D Model' : '2D Sprite', assetId: value }; }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
  const model = data.worldModel || data.appearance || data;
  const presentation = getWorldModelPresentation(model);
  if (!presentation && model.type !== '3D Model' && model.assetProfileId !== '3D Model') return data;
  const refs = [model.assetId, model.modelUrl, model.source].filter((ref): ref is string => typeof ref === 'string' && Boolean(ref));
  if (refs.length === 0) throw new Error(`${role} requires a selected model.`);
  const record = await database.gameAsset.findFirst({ where: { isActive: true, OR: refs.flatMap((ref) => [{ id: ref }, { source: ref }, { cdnUrl: ref }]) } });
  const asset = record ? formatCanonicalGameAsset(record) : { ...model, source: model.modelUrl || model.source || resolveModelAssetUrl(model.assetId) };
  if (!isWorldModelEligibleForRole(asset, role)) {
    throw new Error(role === 'monster' || role === 'creature'
      ? 'Monsters and Creatures require a complete nonplayer model; playable bases and modular pieces cannot be used.'
      : `Choose a ${role === 'archetype' ? 'playable character foundation' : 'humanoid character model'} for this actor.`);
  }
  const attachments = data.modularAttachments || model.modularAttachments || [];
  if ((role === 'monster' || role === 'creature') && Array.isArray(attachments) && attachments.length > 0) {
    throw new Error('Monsters and Creatures use complete models. Publish the assembled model before assigning it.');
  }
  const base = record ? resolveWorldModelAssetValue(asset, model.scale) : ({} as any);
  const hydrated = { ...base, ...model, assetId: record?.id || model.assetId, modelUrl: model.modelUrl || model.source || base.modelUrl || asset.source };
  if (data.worldModel) return { ...data, worldModel: hydrated };
  if (data.appearance) return { ...data, appearance: hydrated };
  return hydrated;
}
