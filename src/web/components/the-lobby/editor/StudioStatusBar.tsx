'use client';

import React, { useEffect, useState } from 'react';
import {
  Globe2, Save, CheckCircle2, Navigation,
  PenTool, MousePointer2, Brush, Target, AlertCircle
} from 'lucide-react';
import { useEditorStore } from './editor-store';
import { useGameStore } from '../store';
import {
  ensureWorldProfiles,
  setActiveWorldProfile,
} from '@/app/actions/world-profiles';
import { WORLD_PROFILES } from '@/shared/game/worldProfiles';
import { STUDIO_TRIGGER_SAVE_MAP_EVENT } from '@/shared/game/studioEvents';
import { STUDIO_MODE_META } from '@/shared/game/studioModes';
import { useSession } from 'next-auth/react';
import { soundSynth } from '@/engine/sound-synth';

export function StudioStatusBar() {
  const { data: session } = useSession();
  const role = session?.user?.role || 'Creator'; // Simplified for UI

  const activeGameId = useEditorStore((s) => s.activeGameId);
  const setActiveGameId = useEditorStore((s) => s.setActiveGameId);
  const studioMode = useEditorStore((s) => s.studioMode);
  const mapDirty = useEditorStore((s) => s.mapDirty);
  const isSavingMap = useEditorStore((s) => s.isSavingMap);
  const definitionStack = useEditorStore((s) => s.definitionOpStack);
  const brushRadius = useEditorStore((s) => s.brushRadius);
  const hoveredTile = useEditorStore((s) => s.hoveredTile);
  const activeLocks = useEditorStore((s) => s.activeLocks);
  const activeMapData = useGameStore((s) => s.activeMapData);
  const connectionStatus = useGameStore((s) => s.connectionStatus);
  const latencyMs = useGameStore((s) => s.latencyMs);
  const otherPlayers = useGameStore((s) => s.otherPlayers);
  const peerCount = Object.keys(otherPlayers || {}).length;

  const defsDirtyCount = definitionStack.undo.length; // Approximate

  const [profiles, setProfiles] = useState(WORLD_PROFILES.map((p) => ({ ...p, isActive: p.id === activeGameId })));
  const [busy, setBusy] = useState(false);
  const [fps, setFps] = useState(0);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('saints.activeGameId');
      if (stored) setActiveGameId(stored);
    } catch { /* ignore */ }

    void (async () => {
      const res = await ensureWorldProfiles();
      if (res.success) {
        setProfiles(res.profiles);
        const stored = (() => {
          try { return window.localStorage.getItem('saints.activeGameId'); } catch { return null; }
        })();
        if (!stored && res.activeId) setActiveGameId(res.activeId);
      }
    })();
  }, [setActiveGameId]);

  useEffect(() => {
    // Basic FPS counter
    let frameCount = 0;
    let lastTime = performance.now();
    let animId = 0;
    const loop = () => {
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = now;
      }
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const onSwitch = async (id: string) => {
    soundSynth?.playSelectSound?.();
    setBusy(true);
    setActiveGameId(id);
    await setActiveWorldProfile(id);
    setBusy(false);
  };

  const getModeIcon = () => {
    switch (studioMode) {
      case 'develop': return <PenTool className="w-3.5 h-3.5 text-amber-400" />;
      case 'npc': return <Target className="w-3.5 h-3.5 text-cyan-400" />;
      case 'test': return <Navigation className="w-3.5 h-3.5 text-emerald-400" />;
      default: return <MousePointer2 className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  const hasSoftLocks = Object.keys(activeLocks).length > 0;

  return (
    <div className="pointer-events-auto absolute bottom-0 left-0 right-0 h-8 z-[110] bg-[#050b14]/95 border-t border-amber-500/30 flex items-center justify-between px-2 text-[11px] font-mono text-[#a59981] select-none shadow-[0_-4px_20px_rgba(0,0,0,0.5)] backdrop-blur-md">
      
      {/* LEFT: Dirty States & Tool Status */}
      <div className="flex items-center gap-4 h-full">
        <div className="flex items-center gap-2 border-r border-amber-500/20 pr-4 h-full">
          <span className={`font-bold ${mapDirty ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>
            Map{mapDirty ? '*' : ''}
          </span>
          <span className={`font-bold ${defsDirtyCount > 0 ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>
            Defs ({defsDirtyCount}){defsDirtyCount > 0 ? '*' : ''}
          </span>
        </div>

        <div className="flex items-center gap-3 border-r border-amber-500/20 pr-4 h-full">
          <div
            className="flex items-center gap-1.5 text-amber-200 font-bold"
            title={STUDIO_MODE_META[studioMode]?.blurb || `Active Mode: ${studioMode}`}
          >
            {getModeIcon()}{' '}
            <span className="uppercase tracking-wider">
              {STUDIO_MODE_META[studioMode]?.label || studioMode}
            </span>
          </div>
          <div className="flex items-center gap-1.5 opacity-80">
            <Brush className="w-3.5 h-3.5 text-amber-400" /> Size: {brushRadius}
          </div>
          <div className="opacity-80">
            {hoveredTile ? `[${hoveredTile.r}, ${hoveredTile.c}]` : '[-, -]'}
          </div>
        </div>

        <div className="flex items-center gap-2 border-r border-amber-500/20 pr-4 h-full">
          <div
            className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected'
                ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                : connectionStatus === 'reconnecting' || connectionStatus === 'connecting'
                ? 'bg-amber-400 animate-pulse'
                : 'bg-rose-500'
            }`}
            title={`Realtime: ${connectionStatus} (${latencyMs}ms)`}
          />
          <span className="text-[10px] text-amber-200/90 font-bold uppercase tracking-wider">
            {connectionStatus === 'connected' ? `${latencyMs}ms` : connectionStatus}
          </span>
          {peerCount > 0 && (
            <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.2 rounded border border-cyan-500/30">
              {peerCount} Peer{peerCount > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
          <CheckCircle2 className="w-3.5 h-3.5" /> OK
        </div>
      </div>

      {/* RIGHT: Project, Save, FPS */}
      <div className="flex items-center gap-4 h-full">
        {hasSoftLocks && (
          <div className="flex items-center gap-1.5 text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-500/30">
            <AlertCircle className="w-3 h-3" />
            <span>{Object.keys(activeLocks).length} Lock(s)</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 opacity-70 text-slate-400" title="Frames Per Second">
          {fps} FPS
        </div>

        <div className="flex items-center gap-2 border-l border-amber-500/20 pl-4 h-full">
          <Globe2 className="w-3.5 h-3.5 text-amber-400" />
          <select
            disabled={busy}
            value={activeGameId}
            onChange={(e) => void onSwitch(e.target.value)}
            className="bg-transparent border-none text-amber-200 outline-none cursor-pointer font-mono text-[11px]"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id} className="bg-[#0b1320] text-slate-200">{p.name || p.id}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 border-l border-amber-500/20 pl-4 h-full">
          <span className="uppercase opacity-70">{role}</span>
          <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider border border-amber-500/30">
            v{activeMapData?.version || 1}
          </span>
        </div>

        <div className="flex items-center gap-2 pl-2">
          <button
            onClick={() => {
              if (!isSavingMap && (mapDirty || defsDirtyCount > 0)) {
                soundSynth?.playActionSound?.();
                window.dispatchEvent(new CustomEvent(STUDIO_TRIGGER_SAVE_MAP_EVENT));
              }
            }}
            disabled={isSavingMap || (!mapDirty && defsDirtyCount === 0)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
              mapDirty || defsDirtyCount > 0 
                ? 'bg-amber-400 text-black font-bold hover:bg-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.4)] cursor-pointer' 
                : 'bg-slate-900 text-slate-600 cursor-not-allowed'
            }`}
            title="Save Map & Defs (Ctrl+S)"
          >
            <Save className={`w-3.5 h-3.5 ${isSavingMap ? 'animate-spin' : ''}`} /> {isSavingMap ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

