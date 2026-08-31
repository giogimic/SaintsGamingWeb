'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useEditorStore } from './editor-store';
import { useGameStore } from '../store';
import {
  DoorOpen,
  Map as MapIcon,
  Search,
  ArrowRight,
  X,
  Sparkles,
  Layers,
  CheckCircle2,
  Shield,
  Swords,
  Home,
  Compass,
  Sparkle
} from 'lucide-react';
import { listMaps, loadMap, type MapIndexEntry } from '../data/maps';
import { ensureMapHasStudioTilesets } from '@/shared/game/studioTilesetBootstrap';
import { STUDIO_MAP_HOT_RELOAD_EVENT } from '@/shared/game/studioEvents';

const CATEGORIES = [
  { id: 'MAP', label: 'World Map', icon: MapIcon, color: 'text-sky-400 bg-sky-950/40 border-sky-500/30' },
  { id: 'DUNGEON', label: 'Dungeon', icon: Shield, color: 'text-purple-400 bg-purple-950/40 border-purple-500/30' },
  { id: 'RAID', label: 'Raid Entrance', icon: Swords, color: 'text-amber-400 bg-amber-950/40 border-amber-500/30' },
  { id: 'INTERIOR', label: 'Interior / Building', icon: Home, color: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30' },
  { id: 'INSTANCE', label: 'Instance Realm', icon: Layers, color: 'text-indigo-400 bg-indigo-950/40 border-indigo-500/30' },
  { id: 'EVENT', label: 'Event Gate', icon: Sparkles, color: 'text-fuchsia-400 bg-fuchsia-950/40 border-fuchsia-500/30' },
  { id: 'PORTAL', label: 'Mystic Portal', icon: Sparkle, color: 'text-teal-400 bg-teal-950/40 border-teal-500/30' },
  { id: 'CUSTOM', label: 'Custom Warp', icon: Compass, color: 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30' },
];

const SIZE_PRESETS = [
  { label: '1×1 Single', w: 1, h: 1, desc: 'Single doorway / step' },
  { label: '2×1 Wide', w: 2, h: 1, desc: 'Double path entrance' },
  { label: '3×1 Wide', w: 3, h: 1, desc: 'Wide road / archway' },
  { label: '1×2 Tall', w: 1, h: 2, desc: 'Vertical corridor gate' },
  { label: '2×2 Grand', w: 2, h: 2, desc: 'Town / castle gate' },
  { label: '3×3 Giant', w: 3, h: 3, desc: 'Colossal portal / landmark' },
];

export const GateConnectModal: React.FC = () => {
  const modalState = useEditorStore((s) => s.gateConnectModal);
  const closeModal = useEditorStore((s) => s.closeGateConnectModal);
  const setPendingGate = useEditorStore((s) => s.setPendingGateConnection);
  const activeMapData = useGameStore((s) => s.activeMapData);
  const showToast = useGameStore((s) => s.showToast);

  const [maps, setMaps] = useState<MapIndexEntry[]>([]);
  const [isLoadingMaps, setIsLoadingMaps] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMapId, setSelectedMapId] = useState<string>('');
  const [category, setCategory] = useState<string>('MAP');
  const [sizeW, setSizeW] = useState<number>(1);
  const [sizeH, setSizeH] = useState<number>(1);
  const [gateName, setGateName] = useState<string>('');

  useEffect(() => {
    if (!modalState?.isOpen) return;

    let active = true;
    setIsLoadingMaps(true);
    if (modalState.initialCategory) {
      setCategory(modalState.initialCategory);
    }

    listMaps()
      .then((data) => {
        if (!active) return;
        setMaps(data);
        const filtered = data.filter((m) => m.id !== activeMapData?.id);
        if (filtered.length > 0) {
          setSelectedMapId(filtered[0].id);
        }
      })
      .catch((err) => {
        console.error('Failed to list maps:', err);
      })
      .finally(() => {
        if (active) setIsLoadingMaps(false);
      });

    return () => {
      active = false;
    };
  }, [modalState?.isOpen, modalState?.initialCategory, activeMapData?.id]);

  const filteredMaps = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return maps.filter((m) => {
      if (!q) return true;
      return (
        m.id.toLowerCase().includes(q) ||
        (m.name && m.name.toLowerCase().includes(q))
      );
    });
  }, [maps, searchQuery]);

  if (!modalState?.isOpen) return null;

  const originMapId = activeMapData?.id || 'DEMO_SANDBOX';
  const originC = modalState.originC;
  const originR = modalState.originR;

  const handleProceedToDestinationPlacement = async () => {
    if (!selectedMapId) {
      showToast('Please select a destination map.');
      return;
    }

    try {
      showToast(`Loading destination map: ${selectedMapId}...`);

      // Store pending connection
      setPendingGate({
        originMapId,
        originPosition: { x: originC, y: originR },
        originSize: { w: sizeW, h: sizeH },
        originGateId: `gate_${originC}_${originR}`,
        category,
        name: gateName.trim() || undefined,
        targetMapId: selectedMapId,
        bidirectional: true,
      });

      // Close modal
      closeModal();

      // Load destination map
      const rawMap = await loadMap(selectedMapId);
      const loaded = ensureMapHasStudioTilesets(rawMap);
      useGameStore.setState({ currentMapId: selectedMapId, activeMapData: loaded });
      useEditorStore.getState().openMapInTab(selectedMapId);
      useEditorStore.getState().setShowWarpOverlays(true);
      window.dispatchEvent(new CustomEvent(STUDIO_MAP_HOT_RELOAD_EVENT, { detail: { mapDoc: loaded } }));

      showToast(`🎯 Click anywhere on ${selectedMapId} to place the entrance point.`);
    } catch (e: any) {
      console.error('Failed to load destination map:', e);
      showToast(`Failed to load ${selectedMapId}: ${e?.message || 'Error'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl rounded-2xl bg-[#090e17]/95 border border-[#cbb26a]/40 shadow-2xl p-5 text-slate-100 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#cbb26a]/20 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300">
              <DoorOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Create Gate Connection</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                  {originMapId} [{originC}, {originR}]
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Define entrance size and select destination map to place the paired entrance point.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section 1: Physical Entrance Size */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#cbb26a] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>Physical Entrance Size</span>
            </label>
            <span className="text-[10px] text-slate-400 font-mono">
              Footprint: {sizeW} × {sizeH} tile{sizeW * sizeH === 1 ? '' : 's'}
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {SIZE_PRESETS.map((preset) => {
              const isSelected = sizeW === preset.w && sizeH === preset.h;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setSizeW(preset.w);
                    setSizeH(preset.h);
                  }}
                  className={`p-2 rounded-xl border text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                    isSelected
                      ? 'bg-[#cbb26a]/20 border-[#cbb26a] text-white shadow-lg'
                      : 'bg-black/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span className="text-[11px] font-bold">{preset.label}</span>
                  <div
                    className="border border-dashed border-cyan-400/60 bg-cyan-500/20 rounded-sm my-0.5"
                    style={{
                      width: `${Math.min(32, preset.w * 10)}px`,
                      height: `${Math.min(24, preset.h * 10)}px`,
                    }}
                  />
                  <span className="text-[8px] text-slate-500 truncate w-full">{preset.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Gate Category */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#cbb26a] flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            <span>Connection Type</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`p-2 rounded-xl border flex items-center gap-2 text-left transition cursor-pointer ${
                    isSelected
                      ? `${cat.color} font-bold shadow-md`
                      : 'bg-black/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-[11px] truncate">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 3: Select Destination Map */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#cbb26a] flex items-center gap-1.5">
              <MapIcon className="w-3.5 h-3.5" />
              <span>Select Destination Map</span>
            </label>
            <span className="text-[10px] text-slate-400">
              {filteredMaps.length} available map{filteredMaps.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search destination map by name or ID..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-black/60 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto custom-scrollbar pr-1">
            {isLoadingMaps ? (
              <div className="col-span-2 text-center py-6 text-xs text-slate-500">
                Loading world maps...
              </div>
            ) : filteredMaps.length === 0 ? (
              <div className="col-span-2 text-center py-6 text-xs text-slate-500">
                No matching maps found.
              </div>
            ) : (
              filteredMaps.map((m) => {
                const isSelected = selectedMapId === m.id;
                const isCurrent = m.id === originMapId;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMapId(m.id)}
                    className={`p-2 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500 text-cyan-200 shadow-md'
                        : 'bg-black/40 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-900/40'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-white truncate">
                          {m.name || m.id}
                        </span>
                        {isCurrent && (
                          <span className="text-[8px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Current
                          </span>
                        )}
                      </div>
                      <span className="block text-[9px] text-slate-500 font-mono truncate">
                        ID: {m.id}
                      </span>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Guidance Alert */}
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3 text-[11px] text-cyan-200/90 leading-relaxed flex items-start gap-2">
          <Sparkles className="w-4 h-4 shrink-0 text-cyan-400 mt-0.5" />
          <span>
            Selecting a destination will switch to <strong>{selectedMapId || 'the target map'}</strong> so you can click where players will arrive. Once placed, both ends are saved and you will automatically return here.
          </span>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={closeModal}
            className="px-3 py-1.5 rounded-xl border border-slate-700 bg-black/40 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleProceedToDestinationPlacement}
            disabled={!selectedMapId}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg transition ${
              selectedMapId
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
            }`}
          >
            <span>Place Destination Point</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
