'use client';

import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store';
import {
  MapPin,
  Save,
  Globe,
  DoorOpen,
  Crosshair,
  RefreshCw,
  Loader2
} from 'lucide-react';
import {
  WindowMenuBar,
  WindowMenuButton,
  WindowMenuDivider,
} from '../WindowMenuBar';
import { getCanonicalSpawn, setCanonicalSpawn } from '@/app/actions/studio/world-project';

export const SpawnEditorPanel: React.FC = () => {
  const showToast = useGameStore((s) => s.showToast);

  const [gateId, setGateId] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchSpawn = async () => {
    setLoading(true);
    const res = await getCanonicalSpawn();
    if (res.success) {
      setGateId(res.gateId || '');
    } else {
      showToast('Failed to load spawn: ' + res.error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSpawn();
  }, []);

  const handleSaveSpawn = async () => {
    setSaving(true);
    const res = await setCanonicalSpawn(gateId);
    setSaving(false);
    if (res.success) {
      showToast('World Spawn Saved Successfully');
    } else {
      showToast('Failed to save spawn: ' + res.error);
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-[#050b14]/95 text-slate-200 font-mono text-xs -m-3 mb-0 overflow-hidden">
      {/* ── WINDOW SUB-MENU APP BAR ── */}
      <WindowMenuBar>
        <WindowMenuButton
          label={saving ? 'Saving...' : 'Save Spawn'}
          icon={Save}
          onClick={handleSaveSpawn}
          disabled={saving || loading}
          title="Save the canonical world spawn point for new players"
        />
        <WindowMenuDivider />
        <WindowMenuButton
          label="Reload"
          icon={RefreshCw}
          onClick={fetchSpawn}
          disabled={saving || loading}
          title="Reload current spawn configuration"
        />
      </WindowMenuBar>

      <div className="flex-1 p-6 overflow-y-auto space-y-8 max-w-xl mx-auto w-full">
        {/* ── Header ──────────────────────────────────────── */}
        <div className="flex items-center gap-3 border-b border-[#806f47]/30 pb-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-950/50 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="font-extrabold text-emerald-400 tracking-wider uppercase text-lg">
              World Spawn Editor
            </h2>
            <p className="text-[10px] text-slate-500 font-sans">
              Define the exact entry point and map where new players begin their journey.
            </p>
          </div>
        </div>

        {/* ── Editor Form ──────────────────────────────────────── */}
        <div className="rounded-xl border border-[#806f47]/20 bg-[#0a1120] p-6 space-y-6">
          {loading ? (
            <div className="flex items-center gap-2 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading spawn configuration...
            </div>
          ) : (
            <div className="space-y-4">
              <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-400">
                <span className="flex items-center gap-1.5"><DoorOpen className="w-4 h-4 text-amber-400"/> Canonical Gate ID</span>
                <input 
                  type="text"
                  value={gateId}
                  onChange={(e) => setGateId(e.target.value)}
                  placeholder="e.g. T001-G001"
                  className="rounded bg-black/50 px-3 py-2 border border-[#806f47]/30 text-slate-200 w-full"
                />
                <span className="text-[10px] text-slate-500 font-normal">Enter the ID of the WorldGate you want players to spawn at. Leaving this empty defaults to STARTING_MEADOW.</span>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
