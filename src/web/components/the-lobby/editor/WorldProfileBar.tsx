'use client';

import React, { useEffect, useState } from 'react';
import { Globe2, Plus, Copy } from 'lucide-react';
import { useEditorStore } from './editor-store';
import {
  ensureWorldProfiles,
  setActiveWorldProfile,
  createBlankWorldProfile,
  cloneTrailWorldProfile,
} from '@/app/actions/world-profiles';
import { WORLD_PROFILES } from '@/shared/game/worldProfiles';

export function WorldProfileBar() {
  const activeGameId = useEditorStore((s) => s.activeGameId);
  const setActiveGameId = useEditorStore((s) => s.setActiveGameId);
  const [profiles, setProfiles] = useState(WORLD_PROFILES.map((p) => ({ ...p, isActive: p.id === activeGameId })));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    // Hydrate from localStorage once on client
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
        // Prefer local Studio selection; fall back to server active
        if (!stored && res.activeId) setActiveGameId(res.activeId);
      }
    })();
  }, [setActiveGameId]);

  const onSwitch = async (id: string) => {
    setBusy(true);
    setMsg(null);
    setActiveGameId(id);
    const res = await setActiveWorldProfile(id);
    setBusy(false);
    if (!res.success) setMsg(res.error || 'Switch failed');
    else setMsg(`Active: ${id}`);
  };

  const onCreateBlank = async () => {
    const name = window.prompt('New world display name?', 'Custom World');
    if (!name) return;
    const slug = window.prompt('Profile id (slug)?', 'custom_2') || 'custom_2';
    setBusy(true);
    const res = await createBlankWorldProfile({ slug, name });
    setBusy(false);
    if (!res.success) {
      setMsg(res.error || 'Create failed');
      return;
    }
    setActiveGameId(res.slug!);
    await setActiveWorldProfile(res.slug!);
    const refreshed = await ensureWorldProfiles();
    if (refreshed.success) setProfiles(refreshed.profiles);
    setMsg(`Created ${res.slug} · map ${res.starterMapId}`);
  };

  const onCloneTrail = async () => {
    const slug = window.prompt('Clone Saints Trail into profile id?', 'custom_2') || 'custom_2';
    const name = window.prompt('Display name?', 'Custom 2 (Trail)') || undefined;
    setBusy(true);
    setMsg(null);
    const res = await cloneTrailWorldProfile({ slug, name, force: true });
    setBusy(false);
    if (!res.success) {
      setMsg(res.error || 'Clone failed');
      return;
    }
    const { targetSlug, mapId, quests } = res;
    setActiveGameId(targetSlug);
    await setActiveWorldProfile(targetSlug);
    const refreshed = await ensureWorldProfiles();
    if (refreshed.success) setProfiles(refreshed.profiles);
    setMsg(`Cloned Trail → ${targetSlug} · ${mapId} · ${quests} quests`);
  };

  return (
    <div className="pointer-events-auto absolute top-4 left-1/2 -translate-x-1/2 z-[110]">
      <div className="flex items-center gap-2 px-3 py-2 rounded-2xl border border-[#806f47]/40 bg-[#050b14]/92 shadow-2xl backdrop-blur-md">
        <Globe2 className="w-4 h-4 text-[#cbb26a] shrink-0" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#806f47]">World</span>
        <select
          disabled={busy}
          value={activeGameId}
          onChange={(e) => void onSwitch(e.target.value)}
          className="bg-[#0b1320] border border-[#806f47]/30 rounded-lg px-2 py-1 text-[11px] font-mono text-[#e2d5b3] outline-none focus:border-[#cbb26a]/60 min-w-[140px]"
        >
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
          {/* Allow selecting store id even if not yet in list */}
          {!profiles.some((p) => p.id === activeGameId) && (
            <option value={activeGameId}>{activeGameId}</option>
          )}
        </select>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onCreateBlank()}
          className="flex items-center gap-1 px-2 py-1 rounded-lg border border-emerald-800/40 text-emerald-300/90 text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-900/30 disabled:opacity-40"
          title="Create blank world profile + starter map"
        >
          <Plus className="w-3.5 h-3.5" />
          New
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onCloneTrail()}
          className="flex items-center gap-1 px-2 py-1 rounded-lg border border-sky-800/40 text-sky-300/90 text-[10px] font-bold uppercase tracking-wider hover:bg-sky-900/30 disabled:opacity-40"
          title="Clone Saints Trail template into a profile (namespaced)"
        >
          <Copy className="w-3.5 h-3.5" />
          Clone Trail
        </button>
        {msg && <span className="text-[9px] text-slate-500 font-mono max-w-[180px] truncate">{msg}</span>}
      </div>
    </div>
  );
}
