import React, { useEffect, useRef, useState } from 'react';
import { DraggablePanel } from '../DraggablePanel';
import { useEditorStore } from '../editor-store';
import { useGameStore } from '../../store';
import { GameMapData, loadMap } from '@/shared/game/maps';
import { VoxelCanvasBabylon } from '../../babylon/VoxelCanvasBabylon';
import { BabylonEngine } from '@/engine/BabylonEngine';
import { MapPersistenceService } from '../services/MapPersistenceService';

export const SecondaryVoxelCanvasPanel: React.FC = () => {
  const isOpen = useEditorStore((s) => s.panels['secondaryVoxelViewport']?.isOpen);
  const secondaryMapId = useEditorStore((s) => s.secondaryMapId);
  const secondaryMapType = useEditorStore((s) => s.secondaryMapType);
  const isDevEditorOpen = useEditorStore((s) => s.isCreationMode);
  const suppressGameplay = true;

  const [mapData, setMapData] = useState<GameMapData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Performance optimization state
  const [isActive, setIsActive] = useState(true);
  
  const engineRef = useRef<BabylonEngine | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && secondaryMapId && secondaryMapType === 'VOXEL') {
      setIsLoading(true);
      loadMap(secondaryMapId, 0).then((data) => {
        const isolatedData = { ...data };
        setMapData(isolatedData);
        setIsLoading(false);
      });
    } else {
      setMapData(null);
    }
  }, [isOpen, secondaryMapId, secondaryMapType]);


  const handleSave = async () => {
    if (!mapData || !secondaryMapId) return;
    try {
      await MapPersistenceService.saveIsolatedMap(mapData);
      // Let the user know
      const event = new CustomEvent('studio_toast', { detail: { message: `Saved isolated map: ${secondaryMapId}` } });
      window.dispatchEvent(event);
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen || !secondaryMapId || secondaryMapType !== 'VOXEL') return null;

  return (
    <DraggablePanel
      id="secondaryVoxelViewport"
      title={`Secondary View: ${secondaryMapId}`}
    >
      <div 
        ref={containerRef}
        className="flex flex-col h-full bg-slate-900 overflow-hidden"
        onMouseEnter={() => setIsActive(true)}
        onMouseLeave={() => setIsActive(false)}
      >
        <div className="flex items-center gap-2 p-2 border-b border-white/10 shrink-0">
          <button 
            onClick={handleSave}
            className="px-3 py-1 bg-primary text-primary-foreground text-xs rounded hover:bg-primary/90"
          >
            Save Map Data
          </button>
          <div className="text-[10px] text-slate-400">
            {isActive ? 'Active (Live)' : 'Paused (Hover to resume)'}
          </div>
        </div>
        
        <div className="flex-1 relative">
          {isLoading || !mapData ? (
            <div className="absolute inset-0 flex items-center justify-center text-white/50 text-sm">
              Loading {secondaryMapId}...
            </div>
          ) : (
            <>

              
              <VoxelCanvasBabylon 
                isolatedMapId={secondaryMapId}
                isolatedMapData={mapData}
                updateMapData={setMapData}
                isDevEditorOpen={isDevEditorOpen}
                suppressGameplay={suppressGameplay}
                isActive={isActive}
                onCanvasReady={(engine) => { engineRef.current = engine; }}
              />
            </>
          )}
        </div>
      </div>
    </DraggablePanel>
  );
};

export default SecondaryVoxelCanvasPanel;
