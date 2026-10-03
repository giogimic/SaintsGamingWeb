import { getCanonicalModelDef } from './worldModelPresentation';

export type WorldModelRole = 'archetype' | 'npc' | 'monster' | 'creature';

function objectValue(value: any): Record<string, any> {
  if (typeof value === 'string') {
    try { return JSON.parse(value) || {}; } catch { return {}; }
  }
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function stringList(value: any): string[] {
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { value = value.split(','); }
  }
  return Array.isArray(value) ? value.map(String).map((v) => v.trim().toLowerCase()) : [];
}

/** Actor role is independent of the catalog's historical CHARACTER/CREATURE/MODEL type. */
export function isWorldModelEligibleForRole(asset: any, role: WorldModelRole): boolean {
  if (!asset) return false;
  const metadata = objectValue(asset.metadata);
  const presentation = objectValue(asset.presentation || metadata.presentation);
  const definition = objectValue(asset.assetDefinition || presentation.assetDefinition || metadata.assetDefinition);
  const model = asset.worldModel || asset;
  const source = String(model.modelUrl || model.source || asset.cdnUrl || presentation.modelUrl || model.assetId || asset.id || '');
  const canonical = getCanonicalModelDef(source) || getCanonicalModelDef(model.assetId || asset.id);
  const type = String(model.type || asset.type || model.assetProfileId || '').toUpperCase();
  const tags = stringList(asset.tags || metadata.tags);
  const roles = stringList(definition.roles);
  const categories = stringList(asset.categories);
  const structure = String(definition.structure || metadata.structure || '').toLowerCase();
  const rig = model.rigAnalysis || presentation.rigAnalysis || definition.rigAnalysis || metadata.rigAnalysis || {};
  const family = String(rig.family || metadata.rigFamily || '').toUpperCase();
  const isModel = ['MODEL', '3D_MODEL', '3D MODEL'].includes(type)
    || presentation.mode === '3D' || /\.(glb|gltf|fbx|obj)(?:\?.*)?$/i.test(source) || Boolean(canonical);
  if (!isModel || type === 'ANIMATION') return false;
  const component = Boolean(asset.isModularComponent || metadata.isModularComponent
    || asset.componentCategory || metadata.componentCategory || metadata.cat
    || structure === 'modularitem' || tags.some((tag) => ['sprite-component', 'character-component'].includes(tag)));
  if (component) return false;
  const modular = structure === 'modular' || presentation.character?.isCustomizable === true
    || model.character?.isCustomizable === true || tags.includes('modular') || model.isModular === true;
  const playableFlag = asset.isPlayable ?? metadata.isPlayable ?? canonical?.isPlayable;
  const playableRole = roles.some((r) => ['archetype', 'player', 'hero'].includes(r));
  const playable = playableFlag === true || playableRole || tags.some((tag) => ['playable', 'player', 'base-body'].includes(tag));
  const nonplayer = roles.some((r) => ['creature', 'monster', 'enemy'].includes(r))
    || tags.some((tag) => ['monster', 'creature', 'hostile'].includes(tag))
    || canonical?.category === 'monster' || canonical?.category === 'creature';
  const prop = roles.some((r) => ['prop', 'weapon', 'equipment', 'item'].includes(r))
    || categories.some((c) => ['prop', 'weapon', 'item'].includes(c))
    || family.startsWith('PROP_') || type === 'ITEM' || type === 'OBJECT' || canonical?.category === 'prop';
  if (prop) return false;
  if (role === 'monster' || role === 'creature') return !modular && !playable;
  if (nonplayer) return false;
  if (role === 'archetype') {
    return playableFlag !== false && (playable || type === 'CHARACTER' || roles.includes('character'));
  }
  if (family && family !== 'HUMANOID_BIPED') return false;
  return playable || family === 'HUMANOID_BIPED' || roles.some((r) => ['npc', 'character'].includes(r))
    || type === 'CHARACTER' || canonical?.category === 'character';
}

/** Keep a published model's role and structure coherent even after changing upload intent. */
export function normalizeModelUploadRole(type: string | undefined, definition: any) {
  if (type?.toUpperCase() === 'ANIMATION') return { type: 'ANIMATION', isPlayable: false, showInCharacterCreation: false };
  const roles = stringList(definition?.roles);
  const structure = String(definition?.structure || '').toLowerCase();
  const nonplayer = roles.some((r) => ['monster', 'creature', 'enemy'].includes(r));
  const playable = roles.some((r) => ['archetype', 'player', 'hero'].includes(r));
  if (nonplayer && (playable || (structure && structure !== 'complete'))) {
    throw new Error('Monsters and Creatures require a complete nonplayer model. Publish the assembled model as Complete first.');
  }
  const normalizedType = nonplayer ? 'CREATURE'
    : playable || roles.some((r) => ['character', 'npc'].includes(r)) ? 'CHARACTER'
      : roles.some((r) => ['weapon', 'equipment', 'prop', 'item'].includes(r)) ? 'ITEM'
        : (type || 'MODEL').toUpperCase();
  const isPlayable = playable || (!nonplayer && roles.includes('character') && structure === 'modular');
  return { type: normalizedType, isPlayable, showInCharacterCreation: isPlayable };
}
