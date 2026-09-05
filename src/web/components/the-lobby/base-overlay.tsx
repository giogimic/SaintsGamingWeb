/* eslint-disable @serapht/serapht/no-img-element */
'use client';

import { useGameStore } from './store';
import RpgPanel from './rpg-panel';
import { getCreatureById } from './data/saints-dex';
import { useEffect, useState, useRef } from 'react';
import { soundSynth } from '@/engine/sound-synth';
import { Flame, Mountain, Trees, Sprout, Fish, Plus, CheckCircle2, RefreshCw, Sparkles, Home } from 'lucide-react';

const FACILITY_META = {
  lumber_mill: { icon: Trees, color: '#22c55e', yieldItem: 'Wood Log', affinity: 'Wood / Grass' },
  quarry: { icon: Mountain, color: '#f59e0b', yieldItem: 'Raw Ore', affinity: 'Ground / Metal' },
  furnace: { icon: Flame, color: '#ef4444', yieldItem: 'Metal Bar', affinity: 'Fire' },
  farm: { icon: Sprout, color: '#10b981', yieldItem: 'Grimy Herb', affinity: 'Grass / Water' },
  fishing_hut: { icon: Fish, color: '#38bdf8', yieldItem: 'Raw Fish', affinity: 'Water / Ice' },
};

// --- VISUAL SANCTUARY COMPONENT ---
function BaseSanctuaryVisual({ assignedBeasts }: { assignedBeasts: Record<string, string | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [beastPositions] = useState<Record<string, { x: number, y: number, tx: number, ty: number, flip: boolean }>>({});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

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
      
      // Draw Sanctuary Atmosphere
      ctx.fillStyle = '#061a14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0b2e24';
      for (let i = 0; i < 10; i++) {
        ctx.fillRect((Math.sin(Date.now() / 1000 + i) * 100 + 150) % canvas.width, (i * 20) % canvas.height, 8, 8);
      }

      // Draw and move beasts
      Object.values(assignedBeasts).forEach(id => {
        if (!id) return;
        const daemon = getCreatureById(id);
        const pos = beastPositions[id];
        if (!daemon || !pos) return;

        const dx = pos.tx - pos.x;
        const dy = pos.ty - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 5) {
          if (Math.random() < 0.02) {
            pos.tx = Math.random() * 260 + 20;
            pos.ty = Math.random() * 80 + 20;
          }
        } else {
          pos.x += (dx / dist) * 0.35;
          pos.y += (dy / dist) * 0.35;
          pos.flip = dx < 0;
        }

        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y + 14, 10, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        if (daemon.assetPath) {
          const img = new Image();
          img.src = daemon.assetPath;
          if (img.complete) {
            ctx.save();
            ctx.translate(pos.x, pos.y);
            if (pos.flip) {
              ctx.scale(-1, 1);
            }
            const bounceY = dist > 5 ? Math.abs(Math.sin(Date.now() / 100)) * 4 : 0;
            ctx.drawImage(img, -16, -16 - bounceY, 32, 32);
            ctx.restore();
          } else {
            ctx.fillStyle = '#22d3ee';
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
    <div className="w-full h-32 bg-black border border-cyan-500/30 rounded-xl mb-4 relative overflow-hidden shadow-inner">
      <canvas ref={canvasRef} width={300} height={120} className="w-full h-full object-cover pixelated" />
      <div className="absolute top-2 left-2 bg-black/80 px-2.5 py-0.5 rounded border border-cyan-500/40 text-[10px] text-cyan-300 font-mono font-bold tracking-widest z-10 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
        SANCTUARY TELEMETRY
      </div>
    </div>
  );
}

export default function BaseOverlay() {
  const player = useGameStore(state => state.player);
  const setGameMode = useGameStore(state => state.setGameMode);
  const assignBeast = useGameStore(state => state.assignBeast);
  const collectBaseResources = useGameStore(state => state.collectBaseResources);
  const showToast = useGameStore(state => state.showToast);

  const [assigningTo, setAssigningTo] = useState<'lumber_mill' | 'quarry' | 'furnace' | 'farm' | 'fishing_hut' | null>(null);

  useEffect(() => {
    collectBaseResources();
  }, [collectBaseResources]);

  const handleAssign = (daemonId: string) => {
    if (assigningTo) {
      soundSynth?.playActionSound?.();
      assignBeast(assigningTo, daemonId);
      setAssigningTo(null);
    }
  };

  const renderFacility = (id: 'lumber_mill' | 'quarry' | 'furnace' | 'farm' | 'fishing_hut', title: string, description: string) => {
    const assignedId = player.assignedBeasts?.[id];
    const daemon = assignedId ? getCreatureById(assignedId) : null;
    const meta = FACILITY_META[id];
    const Icon = meta.icon;

    return (
      <div 
        key={id}
        className="p-4 rounded-xl mb-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden transition-all duration-200"
        style={{
          clipPath: 'polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px)',
          background: 'linear-gradient(135deg, rgba(6,182,212,0.08) 0%, rgba(10,15,30,0.9) 100%)',
          border: '1px solid rgba(6,182,212,0.25)',
        }}
      >
        {/* Facility Details */}
        <div className="flex items-start gap-3">
          <div 
            className="p-2.5 rounded-xl shrink-0 flex items-center justify-center"
            style={{ background: `${meta.color}20`, border: `1px solid ${meta.color}50` }}
          >
            <Icon className="w-5 h-5" style={{ color: meta.color }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-white font-mono font-black text-sm uppercase tracking-wider">{title}</h3>
              <span className="text-[9px] px-2 py-0.5 rounded font-mono font-bold bg-white/5 border border-white/10 text-slate-300">
                {meta.affinity} Boost
              </span>
            </div>
            <p className="text-slate-400 text-xs font-mono mt-0.5">{description}</p>
            <div className="text-[10px] text-emerald-400 font-mono font-bold mt-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              YIELD: 1 {meta.yieldItem} / 10s
            </div>
          </div>
        </div>

        {/* Assigned Daemon Slot */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
          {daemon ? (
            <div className="flex items-center gap-3 bg-black/60 border border-cyan-500/30 rounded-xl p-2 pr-3">
              <div className="w-10 h-10 bg-black rounded-lg overflow-hidden flex items-center justify-center border border-cyan-500/40 shrink-0">
                {daemon.assetPath ? (
                  <img src={daemon.assetPath} alt={daemon.name} className="w-full h-full object-cover pixelated" />
                ) : (
                  <span className="text-cyan-400 font-mono text-sm">?</span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-white text-xs font-mono font-bold truncate max-w-[100px]">{daemon.name}</span>
                <span className="text-[9px] text-cyan-300 font-mono uppercase">{daemon.type_primary}</span>
              </div>
              <button 
                onClick={() => {
                  soundSynth?.playSelectSound?.();
                  assignBeast(id, null);
                }}
                className="text-[10px] bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 px-2.5 py-1 rounded border border-rose-500/40 transition-all active:scale-95 font-mono font-bold cursor-pointer"
              >
                UNASSIGN
              </button>
            </div>
          ) : (
            <button 
              onClick={() => {
                soundSynth?.playSelectSound?.();
                setAssigningTo(id);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-black uppercase tracking-wider bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 transition-all active:scale-95 cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.15)]"
            >
              <Plus className="w-3.5 h-3.5" />
              ASSIGN COMPANION
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <RpgPanel 
      title="SANCTUARY BASE AUTOMATION" 
      icon={<Home className="w-4 h-4 text-cyan-400" />}
      onClose={() => setGameMode('EXPLORING')}
    >
      {assigningTo ? (
        <div className="flex flex-col h-full font-mono text-xs">
          <div className="flex justify-between items-center mb-4 border-b border-cyan-500/20 pb-2">
            <h3 className="text-cyan-300 font-bold uppercase tracking-wider">
              Select Beast for {assigningTo.replace('_', ' ')}
            </h3>
            <button 
              onClick={() => {
                soundSynth?.playSelectSound?.();
                setAssigningTo(null);
              }} 
              className="text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              [CANCEL]
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pr-1">
            {player.caughtDaemons.length === 0 && (
              <div className="col-span-full text-center text-slate-500 italic mt-8">
                No companions captured yet. Encounter wild beasts in the field to tame them!
              </div>
            )}
            {player.caughtDaemons.map(id => {
              const daemon = getCreatureById(id);
              if (!daemon) return null;
              
              const isWorking = Object.values(player.assignedBeasts).includes(id);

              return (
                <div 
                  key={id}
                  onClick={() => !isWorking && handleAssign(id)}
                  className={`p-3 rounded-xl flex flex-col items-center justify-between border transition-all ${
                    isWorking 
                      ? 'border-slate-800 bg-black/40 opacity-40 cursor-not-allowed' 
                      : 'border-cyan-500/30 bg-cyan-950/20 hover:bg-cyan-900/40 hover:border-cyan-400 cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.1)]'
                  }`}
                >
                  <div className="w-12 h-12 mb-2 bg-black rounded-lg overflow-hidden flex items-center justify-center border border-slate-700">
                    {daemon.assetPath ? (
                      <img src={daemon.assetPath} alt={daemon.name} className="w-full h-full object-cover pixelated" />
                    ) : (
                      <span className="text-slate-600 font-mono text-sm">?</span>
                    )}
                  </div>
                  <span className="text-white font-bold text-center truncate w-full text-xs">{daemon.name}</span>
                  <span className="text-[9px] text-cyan-300 uppercase mt-0.5">{daemon.type_primary}</span>
                  {isWorking && <span className="text-[8px] text-amber-400 font-bold mt-1">ASSIGNED</span>}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full font-mono text-xs">
          <BaseSanctuaryVisual assignedBeasts={player.assignedBeasts} />

          {/* Quick Collection Strip */}
          <div className="p-3 mb-3 rounded-xl bg-cyan-950/20 border border-cyan-500/30 flex items-center justify-between">
            <div>
              <span className="font-bold text-white text-xs">PASSIVE BASE GENERATION</span>
              <p className="text-[10px] text-slate-400">Assigned companions generate resources continuously online and offline.</p>
            </div>
            <button 
              onClick={() => {
                soundSynth?.playActionSound?.();
                collectBaseResources();
                showToast('Collected all passive base yields!');
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600/30 hover:bg-emerald-500/50 text-emerald-200 border border-emerald-500/50 rounded-lg font-mono font-bold text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.25)]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              COLLECT YIELDS
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
            {renderFacility('lumber_mill', 'Lumber Mill', 'Harvests sturdy wood timber for construction.')}
            {renderFacility('quarry', 'Sanctuary Quarry', 'Excavates raw ores and heavy stone from mineral veins.')}
            {renderFacility('furnace', 'Smelting Furnace', 'Refines raw ores into purified metal ingots.')}
            {renderFacility('farm', 'Medicinal Herb Farm', 'Cultivates potent herbs for potion brewing.')}
            {renderFacility('fishing_hut', 'Sanctuary Pier', 'Harvests aquatic catches and scaling materials.')}
          </div>
        </div>
      )}
    </RpgPanel>
  );
}

