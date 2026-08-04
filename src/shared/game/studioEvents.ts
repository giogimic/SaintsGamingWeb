/** Studio ↔ viewport events (engine-editor foundation). */

export const STUDIO_MAP_CELLS_CHANGED_EVENT = 'studio:map-cells-changed';

export type StudioMapCellsChangedDetail = {
  cells: Array<{ r: number; c: number; layerIdx: number; value: number }>;
};
