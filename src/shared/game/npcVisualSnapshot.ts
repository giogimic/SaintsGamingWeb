import type { ComponentAppearance } from './entities/types';

export interface NpcVisualSnapshot {
  kind: 'saints-npc-visual';
  version: 1;
  name: string;
  appearance: ComponentAppearance;
}

/** Accept a saved visual snapshot or a standalone world model, preserving its complete binding. */
export function parseNpcVisualSnapshot(value: unknown): ComponentAppearance {
  const data = typeof value === 'string' ? JSON.parse(value) : value;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Choose a Saints NPC visual snapshot or world model configuration.');
  }
  if (data.kind && (data.kind !== 'saints-npc-visual' || data.version !== 1)) {
    throw new Error('This visual snapshot format is not supported.');
  }
  const appearance = data.appearance || data.worldModel || data;
  if (!appearance || typeof appearance !== 'object' || Array.isArray(appearance)) {
    throw new Error('The snapshot has no visual configuration.');
  }
  const type = appearance.type || appearance.assetProfileId || '3D Model';
  if (!['3D Model', '2D Sprite', '2D Box Sprite', 'Other'].includes(type)) {
    throw new Error('The snapshot uses an unsupported world model type.');
  }
  const assetId = typeof appearance.assetId === 'string' ? appearance.assetId.trim() : '';
  const modelUrl = typeof appearance.modelUrl === 'string' ? appearance.modelUrl : appearance.source;
  if (!assetId && !(typeof modelUrl === 'string' && modelUrl.trim())) {
    throw new Error('The snapshot needs a base asset or model URL.');
  }
  for (const key of ['scale', 'modelScale']) {
    if (appearance[key] !== undefined && (!Number.isFinite(appearance[key]) || appearance[key] <= 0)) {
      throw new Error('Model scales must be positive numbers.');
    }
  }
  if (appearance.modularAttachments !== undefined && (
    !Array.isArray(appearance.modularAttachments) ||
    appearance.modularAttachments.some((item: any) => !item || typeof item.assetId !== 'string')
  )) {
    throw new Error('The snapshot contains an invalid body part or wardrobe item.');
  }
  return JSON.parse(JSON.stringify({ ...appearance, type, assetProfileId: type, assetId, modelUrl })) as ComponentAppearance;
}

export function createNpcVisualSnapshot(name: string, appearance: ComponentAppearance): NpcVisualSnapshot {
  return { kind: 'saints-npc-visual', version: 1, name, appearance: parseNpcVisualSnapshot(appearance) };
}
