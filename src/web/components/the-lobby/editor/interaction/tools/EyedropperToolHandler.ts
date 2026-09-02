import type { IToolHandler, ToolExecutionContext } from './IToolHandler';
import type { ToolPointerEvent } from '../types';
import { useEditorStore } from '../../editor-store';
import { useGameStore } from '../../../store';
import { LOGIC_LAYER_IDX } from '@/shared/game/tilePaint';
import { unpackVoxel } from '@/shared/game/voxel/VoxelWord';

export class EyedropperToolHandler implements IToolHandler {
  public readonly id = 'eyedropper' as const;

  public onPointerDown(event: ToolPointerEvent, context: ToolExecutionContext): boolean {
    if (event.button !== 0) return false;
    const store = useEditorStore.getState();
    const gameStore = useGameStore.getState();
    const map = context.mapData || gameStore.activeMapData;
    if (!map) return false;

    const { r, c } = event.tilePos;
    const curLayerIdx = store.activeLayerIdx;

    // 0. Authoritative 3D Voxel Sampling
    if (event.voxelTarget && event.voxelTarget.existingVoxel > 0) {
      const unpacked = unpackVoxel(event.voxelTarget.existingVoxel);
      store.setActiveVoxelMaterialId(unpacked.materialId);
      store.setActiveVoxelShape(unpacked.shapeId);
      store.setActiveVoxelOrientation(unpacked.orientation);
      context.showToast?.(
        `Sampled Voxel: Mat #${unpacked.materialId}, Shape #${unpacked.shapeId}, Orient #${unpacked.orientation} at [${event.voxelTarget.voxelCoord.wx}, ${event.voxelTarget.voxelCoord.wy}, ${event.voxelTarget.voxelCoord.wz}]`
      );
      store.setBrushMode('paint');
      return true;
    } else if (store.studioMode === 'voxel') {
      context.showToast?.('No voxel found at pointer target');
      return false;
    } else if (curLayerIdx === LOGIC_LAYER_IDX) {
      const tagId = map.grid?.[r]?.[c] ?? 0;
      store.setActiveLogicTileId(tagId);
      const meta = gameStore.logicTiles?.[tagId];
      context.showToast?.(`Sampled Logic Tag: ${meta?.name || `#${tagId}`}`);
    } else {
      const gid = map.tileLayers?.[curLayerIdx]?.grid?.[r]?.[c] ?? 0;
      store.setActiveBrushTileId(gid);
      context.showToast?.(`Sampled Visual Tile: GID ${gid}`);
    }

    store.setBrushMode('paint');
    return true;
  }
}
