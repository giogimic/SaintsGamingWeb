import React, { useRef } from 'react';
import { DraggablePanel } from '../DraggablePanel';
import { useEditorStore } from '../editor-store';
import { useGameStore } from '../../store';
import { VoxelCanvasBabylon } from '../../babylon/VoxelCanvasBabylon';
import { BabylonEngine } from '@/engine/BabylonEngine';

export const PrimaryVoxelCanvasPanel: React.FC = () => {
  const isOpen = useEditorStore((s) => s.panels['primaryVoxelViewport']?.isOpen);
  const activeBrushTileId = useEditorStore((s) => s.activeBrushTileId);
  const activeLayerIdx = useEditorStore((s) => s.activeLayerIdx);
  const setClickedTile = useEditorStore((s) => s.setClickedTile);
  
  const currentMapId = useGameStore((s) => s.currentMapId);
  const suppressGameplay = true;
  const isDevEditorOpen = useEditorStore((s) => s.isCreationMode);

  const engineRef = useRef<BabylonEngine | null>(null);

  if (!isOpen || !currentMapId) return null;

  return (
    <DraggablePanel
      id="primaryVoxelViewport"
      title={`Primary Voxel Canvas: ${currentMapId}`}
    >
      <div className="flex flex-col h-full bg-slate-900 overflow-hidden">
        <div className="flex-1 relative">
          <VoxelCanvasBabylon 
            activeBrushTileId={activeBrushTileId}
            activeLayerIdx={activeLayerIdx}
            isDevEditorOpen={isDevEditorOpen}
            suppressGameplay={suppressGameplay}
            onMapClick={(r, c) => {
              if (isDevEditorOpen) setClickedTile({ r, c });
            }}
            onCanvasReady={(engine) => { engineRef.current = engine; }}
          />
        </div>
      </div>
    </DraggablePanel>
  );
};

export default PrimaryVoxelCanvasPanel;
