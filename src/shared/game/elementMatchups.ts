/**
 * Saints Gaming — Elemental Matchups Bridge
 * Canonical 10-element matrix (System B) lives in src/shared/game/combat/typeChartEngine.ts.
 * This file is maintained as a transparent bridge for backward compatibility.
 */
import {
  type ElementType,
  getCombatMultiplier,
  getElementalMultiplier,
  CANONICAL_TYPE_CHART,
  normalizeElementType,
} from "./combat/typeChartEngine";

export type { ElementType };
export {
  getCombatMultiplier,
  getElementalMultiplier,
  CANONICAL_TYPE_CHART,
  normalizeElementType,
};

