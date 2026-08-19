/**
 * Saints Gaming — Character Layer Compositor (shared, pure)
 *
 * Given a set of modular character component layers (body, hair, clothing, etc.),
 * determines the final draw order and which layers are hidden by other equipped
 * pieces (e.g. a closed helm hiding hair/hat/head_accessory).
 *
 * This is a pure sort/filter function with no DOM/canvas/Prisma access, so both
 * the Studio Asset Browser preview and any future in-game renderer can share the
 * exact same stacking rules instead of re-implementing them separately.
 */

import { getDefaultZOrderHint } from "./assetImportProfiles";

export interface CharacterLayerInput {
  /** Stable identifier for the source asset (used for ordering/debugging/hiddenBy refs). */
  id: string;
  /** Where to fetch the layer's spritesheet/image from. */
  url: string;
  componentCategory: string;
  zOrderHint?: number | null;
  baseBodyType?: string | null;
  /** componentCategory values this layer hides when equipped (e.g. a closed helm hides "hair"). */
  hidesComponents?: string[] | null;
}

export interface CharacterLayerResolved extends CharacterLayerInput {
  zOrder: number;
  /** ids of layers currently hiding this one; empty means visible. */
  hiddenBy: string[];
}

export interface CompositeCharacterOptions {
  /** If set, layers whose baseBodyType is defined and differs from this are flagged (not removed). */
  referenceBodyType?: string | null;
}

export interface CompositeCharacterResult {
  /** Layers in final draw order (bottom to top), with hidden layers excluded. */
  visibleLayers: CharacterLayerResolved[];
  /** All input layers annotated with resolution info, including hidden ones. */
  allLayers: CharacterLayerResolved[];
  /** ids of layers with a baseBodyType mismatch vs. referenceBodyType (informational only). */
  bodyTypeMismatches: string[];
}

/**
 * Sorts and filters a set of modular character layers into a renderable stack.
 */
export function compositeCharacterLayers(
  layers: CharacterLayerInput[],
  options: CompositeCharacterOptions = {}
): CompositeCharacterResult {
  const resolved: CharacterLayerResolved[] = layers.map((layer) => {
    const zOrder =
      typeof layer.zOrderHint === "number" && Number.isFinite(layer.zOrderHint)
        ? layer.zOrderHint
        : getDefaultZOrderHint(layer.componentCategory) ?? 999;
    return { ...layer, zOrder, hiddenBy: [] };
  });

  // Determine which layers get hidden by other equipped layers' hidesComponents lists.
  for (const hider of resolved) {
    const hides = (hider.hidesComponents || []).map((v) => v.trim().toLowerCase());
    if (hides.length === 0) continue;
    for (const target of resolved) {
      if (target.id === hider.id) continue;
      if (hides.includes(target.componentCategory.trim().toLowerCase())) {
        target.hiddenBy.push(hider.id);
      }
    }
  }

  const visibleLayers = resolved
    .filter((layer) => layer.hiddenBy.length === 0)
    .sort(
      (a, b) =>
        a.zOrder - b.zOrder ||
        a.componentCategory.localeCompare(b.componentCategory) ||
        a.id.localeCompare(b.id)
    );

  const bodyTypeMismatches: string[] = [];
  if (options.referenceBodyType) {
    const ref = options.referenceBodyType.trim().toLowerCase();
    for (const layer of resolved) {
      if (layer.baseBodyType && layer.baseBodyType.trim().toLowerCase() !== ref) {
        bodyTypeMismatches.push(layer.id);
      }
    }
  }

  return { visibleLayers, allLayers: resolved, bodyTypeMismatches };
}
