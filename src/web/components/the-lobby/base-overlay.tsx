/* eslint-disable @next/next/no-img-element */
'use client';

import { useGameStore } from './store';
import RpgPanel from './rpg-panel';
import { getCreatureById } from './data/saints-dex';
import { useEffect, useState, useRef } from 'react';

// --- VISUAL SANCTUARY COMPONENT ---
function BaseSanctuaryVisual({ assignedBeasts }: { assignedBeasts: Record<string, string | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Keep track of beast positions in the sanctuary
  const [beastPositions] = useState<Record<string, { x: number, y: number, tx: number, ty: number, flip: boolean }>>({});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    // Initialize positions for new beasts
    Object.values(assignedBeasts).forEach(id => {
      if (id && !beastPositions[id]) {
        beastPositions[id] = { 
          x: Math.random() * 260 + 20, 
          y: Math.random() * 80 + 20,
          tx: Math.random() * 260 + 20,
          ty: Math.random() * 80 + 20,
          flip: false
        };
      }
    });

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw Sanctuary Background (Grass pattern)
      ctx.fillStyle = '#166534';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#14532d';
      for (let i=0; i<10; i++) {
        ctx.fillRect((Math.sin(Date.now() / 1000 + i) * 100 + 150) % canvas.width, (i * 20) % canvas.height, 8, 8);
      }

      // Draw and move beasts
      Object.values(assignedBeasts).forEach(id => {
        if (!id) return;
        const daemon = getCreatureById(id);
        const pos = beastPositions[id];
        if (!daemon || !pos) return;

        // Move towards target
        const dx = pos.tx - pos.x;
        const dy = pos.ty - pos.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < 5) {
          // Pick new target
          if (Math.random() < 0.02) {
            pos.tx = Math.random() * 260 + 20;
            pos.ty = Math.random() * 80 + 20;
          }
        } else {
          pos.x += (dx / dist) * 0.3;
          pos.y += (dy / dist) * 0.3;
          pos.flip = dx < 0;
        }

        // Draw shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y + 14, 10, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw sprite
        if (daemon.assetPath) {
          const img = new Image();
          img.src = daemon.assetPath;
          if (img.complete) {
            ctx.save();
            ctx.translate(pos.x, pos.y);
            if (pos.flip) {
              ctx.scale(-1, 1);
            }
            // Bounce effect based on movement
            const bounceY = dist > 5 ? Math.abs(Math.sin(Date.now() / 100)) * 4 : 0;
            ctx.drawImage(img, -16, -16 - bounceY, 32, 32);
            ctx.restore();
          } else {
            // Draw placeholder if image not loaded yet
            ctx.fillStyle = '#ca8a04';
            ctx.fillRect(pos.x - 8, pos.y - 8, 16, 16);
          }
        }
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationId);
  }, [assignedBeasts, beastPositions]);

  return (
    <div className="w-full h-32 bg-black border-2 border-[#ca8a04] rounded-lg mb-4 relative overflow-hidden shadow-inner">
      <canvas ref={canvasRef} width={300} height={120} className="w-full h-full object-cover pixelated" />
      <div className="absolute top-1 left-1 bg-black/70 px-2 py-0.5 rounded border border-[#14532d] text-[10px] text-green-400 font-mono font-bold tracking-widest z-10">
        LIVE SANCTUARY FEED
      </div>
    </div>
  );
}
// ------------------------------------


export default function BaseOverlay() {
  const player = useGameStore(state => state.player);
  const setGameMode = useGameStore(state => state.setGameMode);
  const assignBeast = useGameStore(state => state.assignBeast);
  const collectBaseResources = useGameStore(state => state.collectBaseResources);
  const showToast = useGameStore(state => state.showToast);

  const [assigningTo, setAssigningTo] = useState<'lumber_mill' | 'quarry' | 'furnace' | 'farm' | 'fishing_hut' | null>(null);

  // Auto collect when opening the base
  useEffect(() => {
    collectBaseResources();
  }, [collectBaseResources]);

  const handleAssign = (daemonId: string) => {
    if (assigningTo) {
      assignBeast(assigningTo, daemonId);
      setAssigningTo(null);
    }
  };

  const renderFacility = (id: 'lumber_mill' | 'quarry' | 'furnace' | 'farm' | 'fishing_hut', title: string, description: string, resource: string) => {
    const assignedId = player.assignedBeasts[id];
    const daemon = assignedId ? getCreatureById(assignedId) : null;

    return (
      <div className="bg-[#1a1a1a]/80 border-2 border-[#3e2723] rounded-lg p-4 flex flex-col md:flex-row gap-4 mb-4 shadow-inner relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-black/0 to-[#ca8a04]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        
        {/* Facility Info */}
        <div className="flex-1 relative z-10">
          <h3 className="text-[#ca8a04] font-bold text-lg tracking-wider uppercase drop-shadow-md">{title}</h3>
          <p className="text-slate-400 text-xs italic mb-2">{description}</p>
          <div className="text-[10px] text-emerald-400 font-mono font-bold bg-[#14532d]/50 p-1 rounded border border-[#166534] inline-block shadow-inner">
            YIELD: 1 {resource} / 10s
          </div>
        </div>

        {/* Assigned Daemon */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center bg-black/60 border border-[#3e2723] rounded p-2 min-w-[120px] relative z-10 transition-transform group-hover:scale-105">
          {daemon ? (
            <>
              <div className="w-12 h-12 mb-1 bg-black rounded overflow-hidden flex items-center justify-center border border-[#3e2723] shadow-[0_0_10px_rgba(202,138,4,0.1)]">
                {daemon.assetPath ? (
                  <img src={daemon.assetPath} alt={daemon.name} className="w-full h-full object-cover pixelated animate-pulse" style={{ imageRendering: 'pixelated', animationDuration: '3s' }} />
                ) : (
                  <span className="text-[#5d4037] text-xl font-mono">?</span>
                )}
              </div>
              <span className="text-white text-xs font-bold tracking-wide">{daemon.name}</span>
              <span className="text-[9px] text-[#ca8a04] font-mono mt-0.5 border border-[#ca8a04]/30 px-1 rounded">{daemon.type_primary}</span>
              <button 
                onClick={() => assignBeast(id, null)}
                className="mt-2 text-[10px] bg-red-900/50 hover:bg-red-700/80 text-red-300 px-3 py-1 rounded shadow-lg border border-red-900/50 transition-all active:scale-95 font-bold"
              >
                UNASSIGN
              </button>
            </>
          ) : (
            <>
              <div className="w-12 h-12 mb-1 bg-[#1a1a1a] rounded flex items-center justify-center border-2 border-dashed border-[#3e2723] group-hover:border-[#ca8a04]/50 transition-colors">
                <span className="text-[#3e2723] group-hover:text-[#ca8a04]/50 text-2xl font-mono transition-colors">+</span>
              </div>
              <span className="text-[#5d4037] text-xs font-bold italic group-hover:text-slate-400 transition-colors">Unassigned</span>
              <button 
                onClick={() => setAssigningTo(id)}
                className="mt-2 text-[10px] bg-[#4e342e] hover:bg-[#ca8a04] text-[#e0e0e0] hover:text-black hover:font-bold px-4 py-1 rounded shadow-lg transition-all active:scale-95"
              >
                ASSIGN
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <RpgPanel title="BASE MANAGEMENT" onClose={() => setGameMode('EXPLORING')}>
      
      {assigningTo ? (
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-center mb-4 border-b border-[#3e2723] pb-2">
            <h3 className="text-[#ca8a04] font-bold">Select a Beast for the {assigningTo.replace('_', ' ')}</h3>
            <button onClick={() => setAssigningTo(null)} className="text-slate-400 text-xs hover:text-white">Cancel</button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-2 sm:grid-cols-3 gap-3 pr-2">
            {player.caughtDaemons.length === 0 && (
              <div className="col-span-full text-center text-slate-500 italic mt-8 font-mono text-sm">
                You have not captured any Beasts yet.
              </div>
            )}
            {player.caughtDaemons.map(id => {
              const daemon = getCreatureById(id);
              if (!daemon) return null;
              
              // Prevent assigning a beast that is already working
              const isWorking = Object.values(player.assignedBeasts).includes(id);

              return (
                <div 
                  key={id}
                  onClick={() => !isWorking && handleAssign(id)}
                  className={`bg-black/60 border rounded p-2 flex flex-col items-center transition-colors ${
                    isWorking 
                      ? 'border-[#333] opacity-50 cursor-not-allowed' 
                      : 'border-[#3e2723] hover:border-[#ca8a04] cursor-pointer shadow-inner'
                  }`}
                >
                  <div className="w-10 h-10 mb-1 bg-black rounded overflow-hidden flex items-center justify-center">
                    {daemon.assetPath ? (
                      <img src={daemon.assetPath} alt={daemon.name} className="w-full h-full object-cover pixelated" style={{ imageRendering: 'pixelated' }} />
                    ) : (
                      <span className="text-[#5d4037] text-lg font-mono">?</span>
                    )}
                  </div>
                  <span className="text-white text-[10px] font-bold text-center break-all leading-tight">{daemon.name}</span>
                  {isWorking && <span className="text-[8px] text-red-400 font-bold mt-1">WORKING</span>}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          {/* THE NEW SANCTUARY VISUAL */}
          <BaseSanctuaryVisual assignedBeasts={player.assignedBeasts} />

          <div className="bg-black/50 border border-[#ca8a04]/50 rounded p-3 mb-4 text-center shadow-inner">
            <p className="text-slate-300 text-xs font-mono leading-relaxed mb-2">
              Assigned Beasts will generate resources passively while you are online and offline!
            </p>
            <button 
              onClick={() => { collectBaseResources(); showToast('Collected base yields!'); }}
              className="px-6 py-2 bg-[#166534] hover:bg-[#15803d] text-white text-xs font-bold rounded shadow-lg transition-colors border-2 border-[#14532d] active:scale-95"
            >
              FORCE COLLECT NOW
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
            {renderFacility('lumber_mill', 'Lumber Mill', 'Generates Wood Logs passively over time.', 'Wood Log')}
            {renderFacility('quarry', 'Quarry', 'Mines Ore from the earth passively.', 'Ore')}
            {renderFacility('furnace', 'Furnace', 'Smelts Ores into Metal Bars passively.', 'Metal Bar')}
            {renderFacility('farm', 'Herb Farm', 'Grows medicinal Herbs passively.', 'Grimy Herb')}
            {renderFacility('fishing_hut', 'Fishing Hut', 'Catches Fresh Fish passively.', 'Raw Fish')}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #4e342e; border-radius: 4px; border: 1px solid #3e2723; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #5d4037; }
      `}} />
    </RpgPanel>
  );
}
