import React, { useEffect, useRef, useState } from 'react';
import DraggablePanel from './DraggablePanel';
import { useEditorStore } from '../editor-store';
import { GameMapData, loadMap, saveMapData } from '../../data/maps';
import TileCanvasBabylon from '../../babylon/TileCanvasBabylon';
import VoxelCanvasBabylon from '../../babylon/VoxelCanvasBabylon';
import { BabylonEngine } from '@/engine/BabylonEngine';

export const SecondaryCanvasPanel: React.FC = () => {
  const isOpen = useEditorStore((s) => s.panels['secondaryViewport']?.isOpen);
  const secondaryMapId = useEditorStore((s) => s.secondaryMapId);
  const secondaryMapType = useEditorStore((s) => s.secondaryMapType);
  const closePanel = useEditorStore((s) => s.closePanel);

  const [mapData, setMapData] = useState<GameMapData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Performance optimization state
  const [isActive, setIsActive] = useState(true);
  const [cachedImage, setCachedImage] = useState<string | null>(null);
  
  const engineRef = useRef<BabylonEngine | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && secondaryMapId) {
      setIsLoading(true);
      loadMap(secondaryMapId, 0).then((data) => {
        // Strip chunks so we only edit this map in isolation
        const isolatedData = { ...data, chunks: [] };
        setMapData(isolatedData);
        setIsLoading(false);
      });
    } else {
      setMapData(null);
    }
  }, [isOpen, secondaryMapId]);

  useEffect(() => {
    if (!engineRef.current || !engineRef.current.engine) return;
    
    if (isActive) {
      engineRef.current.engine.runRenderLoop(() => {
        if (engineRef.current?.scene?.activeCamera) {
          engineRef.current.scene.render();
        }
      });
      setCachedImage(null);
    } else {
      // Create snapshot before pausing
      import('@babylonjs/core/Misc/tools').then(({ Tools }) => {
        if (engineRef.current && engineRef.current.engine) {
          Tools.CreateScreenshotUsingRenderTarget(
            engineRef.current.engine,
            engineRef.current.scene.activeCamera!,
            { width: 640, height: 480 },
            (data) => {
              setCachedImage(data);
              engineRef.current?.engine?.stopRenderLoop();
            }
          );
        }
      });
    }
  }, [isActive]);

  const handleSave = async () => {
    if (!mapData || !secondaryMapId) return;
    try {
      await saveMapData(mapData);
      // Let the user know
      const event = new CustomEvent('studio_toast', { detail: { message: `Saved isolated map: ${secondaryMapId}` } });
      window.dispatchEvent(event);
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen || !secondaryMapId) return null;

  return (
    <DraggablePanel
      panelId="secondaryViewport"
      title={`Secondary View: ${secondaryMapId}`}
      onClose={() => closePanel('secondaryViewport')}
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
              {cachedImage && !isActive && (
                <img 
                  src={cachedImage} 
                  alt="Cached render" 
                  className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none" 
                />
              )}
              
              {/* Render Canvas */}
              {secondaryMapType === 'VOXEL' ? (
                <VoxelCanvasBabylon 
                  isolatedMapId={secondaryMapId}
                  isolatedMapData={mapData}
                  onCanvasReady={(engine) => { engineRef.current = engine; }}
                />
              ) : (
                <TileCanvasBabylon 
                  isolatedMapId={secondaryMapId}
                  isolatedMapData={mapData}
                  onCanvasReady={(engine) => { engineRef.current = engine; }}
                />
              )}
            </>
          )}
        </div>
      </div>
    </DraggablePanel>
  );
};

export default SecondaryCanvasPanel;
