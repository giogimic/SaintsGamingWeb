import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Settings, Users, Save, Sparkles, Map, Mountain } from 'lucide-react';
import { loadMap, type GameMapData } from '../../data/maps';
import { useGameStore } from '../../store';
import { useSession } from 'serapht-auth/react';

interface MapSettingsModalProps {
  mapId: string;
  onClose: () => void;
}

export const MapSettingsModal: React.FC<MapSettingsModalProps> = ({ mapId, onClose }) => {
  const { data: session } = useSession();
  const showToast = useGameStore((s) => s.showToast);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mapData, setMapData] = useState<GameMapData | null>(null);

  // Settings states
  const [name, setName] = useState('');
  
  // Encounter Pool (Simple string list for now)
  const [encounters, setEncounters] = useState<string>('');

  // Procedural Settings (If Voxel + Procedural)
  const [isProcedural, setIsProcedural] = useState(false);
  const [seed, setSeed] = useState('');
  const [terrainProfile, setTerrainProfile] = useState('rolling_hills');
  const [baseElevation, setBaseElevation] = useState(14);
  const [elevationRange, setElevationRange] = useState(8);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    let mounted = true;
    loadMap(mapId).then(data => {
      if (!mounted) return;
      setMapData(data);
      setName(data.name || data.id);
      
      if (data.encounterPool) {
        setEncounters(data.encounterPool.map(e => e.monsterId).join(', '));
      }

      if (data.mapType === 'FRACTAL' && data.voxelDoc?.generationMetadata) {
        setIsProcedural(true);
        const meta = data.voxelDoc.generationMetadata;
        setSeed(meta.seed?.toString() || '');
        setTerrainProfile(meta.terrainProfile || 'rolling_hills');
        setBaseElevation(meta.baseElevation ?? 14);
        setElevationRange(meta.elevationRange ?? 8);
      }
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [mapId]);

  const handleSave = async () => {
    if (!mapData) return;
    setSaving(true);
    
    // In a real implementation, we would patch the map document in the database
    // Here we'll simulate it, since direct map saves are handled via Studio session or APIs.
    try {
      showToast('Map settings updated (Simulated)');
      onClose();
    } catch (e) {
      showToast('Failed to save settings: ' + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150 font-mono">
      <div className="w-full max-w-xl rounded-2xl border border-primary/50 bg-[#050b14] p-5 shadow-[0_10px_50px_rgba(0,0,0,0.8)] flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4 shrink-0">
          <h3 className="font-bold text-sm text-primary flex items-center gap-2">
            <Settings className="w-4 h-4" /> Map Settings: {mapId}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-5">
          {loading ? (
            <div className="text-center py-10 text-muted-foreground text-xs">Loading map configuration...</div>
          ) : (
            <>
              {/* General Settings */}
              <section className="space-y-3">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 border-b border-border/30 pb-1">
                  <Map className="w-3.5 h-3.5 text-amber-500" /> General
                </h4>
                
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Map Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#0b1626] border border-border/50 rounded-lg px-3 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-primary/60"
                  />
                </div>
              </section>

              {/* Encounters */}
              <section className="space-y-3">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 border-b border-border/30 pb-1">
                  <Users className="w-3.5 h-3.5 text-rose-500" /> Encounter Pools
                </h4>
                
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Monster IDs (comma separated)</label>
                  <input
                    type="text"
                    value={encounters}
                    onChange={(e) => setEncounters(e.target.value)}
                    placeholder="e.g. slime, goblin"
                    className="w-full bg-[#0b1626] border border-border/50 rounded-lg px-3 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-primary/60"
                  />
                </div>
              </section>

              {/* Procedural Generation Settings */}
              {isProcedural && (
                <section className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 border-b border-border/30 pb-1">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Fractal Domains Engine (Procedural Gen)
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Seed</label>
                      <input
                        type="text"
                        value={seed}
                        onChange={(e) => setSeed(e.target.value)}
                        className="w-full bg-[#0b1626] border border-border/50 rounded-lg px-3 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-primary/60"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Terrain Profile</label>
                      <select
                        value={terrainProfile}
                        onChange={(e) => setTerrainProfile(e.target.value)}
                        className="w-full bg-[#0b1626] border border-border/50 rounded-lg px-3 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-primary/60"
                      >
                        <option value="rolling_hills">Rolling Hills</option>
                        <option value="mountains">Mountains</option>
                        <option value="islands">Islands</option>
                        <option value="canyon">Canyon</option>
                        <option value="plateau">Plateau</option>
                        <option value="flat">Flat</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1 flex justify-between">
                        <span>Base Elevation</span>
                        <span className="text-primary">{baseElevation}</span>
                      </label>
                      <input
                        type="range"
                        min={4} max={24}
                        value={baseElevation}
                        onChange={(e) => setBaseElevation(Number(e.target.value))}
                        className="w-full accent-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1 flex justify-between">
                        <span>Elevation Range</span>
                        <span className="text-primary">±{elevationRange}</span>
                      </label>
                      <input
                        type="range"
                        min={2} max={16}
                        value={elevationRange}
                        onChange={(e) => setElevationRange(Number(e.target.value))}
                        className="w-full accent-amber-500"
                      />
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 mt-2 border-t border-border/40 flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-bold text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || saving}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
