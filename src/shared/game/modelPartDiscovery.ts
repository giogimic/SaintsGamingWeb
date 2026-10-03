import { getModelModularComponents, type CanonicalModelPartDef } from './worldModelPresentation';
import { getModelWardrobeCategory } from './modelWardrobe';

/** Combines authored internal parts, canonical defaults and glTF extras. */
export function discoverModelParts(
  modelReference: string,
  definition?: Record<string, any> | null,
  scene?: { userData?: Record<string, any>; traverse: (callback: (node: any) => void) => void },
): CanonicalModelPartDef[] {
  const parts = new Map<string, CanonicalModelPartDef>();
  for (const part of getModelModularComponents(modelReference)) parts.set(part.meshName, part);
  const embedded = scene?.userData?.saints?.assetDefinition || scene?.userData?.assetDefinition || {};
  const resolved = { ...embedded, ...(definition || {}) };
  const entries = Array.isArray(resolved.modularComponents)
    ? resolved.modularComponents.map((part: any) => [part.meshName || part.name, part])
    : Object.entries(resolved.modularComponents || {});
  for (const [meshName, value] of entries) {
    if (!meshName) continue;
    const info = typeof value === 'string' ? { category: value } : value || {};
    parts.set(meshName, {
      id: info.id || `builtin-piece-${meshName}`,
      meshName,
      label: info.label || meshName,
      category: getModelWardrobeCategory({ assetId: '', category: info.category, label: meshName }),
      defaultVisible: info.defaultVisible !== false,
      suppressesSubmeshes: info.hidesComponents || info.suppressesSubmeshes,
      isFaceVariant: Boolean(info.isFaceVariant),
    });
  }
  scene?.traverse((node) => {
    if (!node.isMesh || !node.name || parts.has(node.name)) return;
    const info = node.userData?.saints?.modularComponent || node.userData?.modularComponent;
    const discoverNames = String(resolved.structure).toLowerCase() === 'modular';
    if (!info && !discoverNames) return;
    const category = getModelWardrobeCategory({ assetId: '', category: info?.category, label: node.name });
    // Skin, eyes and teeth remain intrinsic base geometry. Only named wardrobe
    // choices or explicit component metadata become editable internal parts.
    if (!info && (category === 'other' || /eyes|teeth|quaterniusbody/i.test(node.name))) return;
    parts.set(node.name, {
      id: info?.id || `builtin-piece-${node.name}`,
      meshName: node.name,
      label: info?.label || node.name,
      category,
      defaultVisible: info?.defaultVisible ?? node.visible !== false,
      suppressesSubmeshes: info?.hidesComponents,
      isFaceVariant: info?.isFaceVariant ?? category === 'face',
    });
  });
  return [...parts.values()];
}
