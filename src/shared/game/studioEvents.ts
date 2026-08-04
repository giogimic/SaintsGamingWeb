/** Studio ↔ viewport events (engine-editor foundation). */

export const STUDIO_MAP_CELLS_CHANGED_EVENT = 'studio:map-cells-changed';

/** Playtest entered/exited — client should re-join map with pie isolation. */
export const STUDIO_PIE_CHANGED_EVENT = 'studio:pie-changed';

export type StudioMapCellsChangedDetail = {
  cells: Array<{ r: number; c: number; layerIdx: number; value: number }>;
};

export type StudioPieChangedDetail = {
  /** True when entering Playtest with PIE isolation. */
  pie: boolean;
};
