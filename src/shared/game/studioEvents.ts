/** Studio ↔ viewport events (engine-editor foundation). */

export const STUDIO_MAP_CELLS_CHANGED_EVENT = 'studio:map-cells-changed';

/** Server map save/reload — remesh without React Babylon remount. */
export const STUDIO_MAP_HOT_RELOAD_EVENT = 'studio:map-hot-reload';

/** Playtest entered/exited — client should re-join map with pie isolation. */
export const STUDIO_PIE_CHANGED_EVENT = 'studio:pie-changed';

export type StudioMapCellsChangedDetail = {
  cells: Array<{ r: number; c: number; layerIdx: number; value: number }>;
};

export type StudioMapHotReloadDetail = {
  mapId: string;
};

export type StudioPieChangedDetail = {
  /** True when entering Playtest with PIE isolation. */
  pie: boolean;
};
