'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useEditorStore } from './editor-store';
import { useGameStore } from '../store';
import {
  FileText, Edit, Eye, Folder, Box, Globe, PlayCircle, Users, HelpCircle,
  Save, Undo, Redo, LogOut, CheckCircle2, ChevronRight, X, Wrench, Play, Search, AlertCircle
} from 'lucide-react';
import { STUDIO_MODE_META, type StudioMode } from '@/shared/game/studioModes';
import { STUDIO_TRIGGER_SAVE_MAP_EVENT } from '@/shared/game/studioEvents';

type MenuState = string | null;

export function StudioMenuBar() {
  const [activeMenu, setActiveMenu] = useState<MenuState>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const isCreationMode = useEditorStore((s) => s.isCreationMode);
  const studioMode = useEditorStore((s) => s.studioMode);
  const setStudioMode = useEditorStore((s) => s.setStudioMode);
  const toggleCreationMode = useEditorStore((s) => s.toggleCreationMode);
  const mapDirty = useEditorStore((s) => s.mapDirty);
  const currentMapId = useGameStore((s) => s.currentMapId);
  const showToast = useGameStore((s) => s.showToast);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    }
    if (activeMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenu]);

  const handleMenuClick = (menuId: string) => {
    setActiveMenu((prev) => (prev === menuId ? null : menuId));
  };

  const handleItemClick = (action: () => void) => {
    setActiveMenu(null);
    action();
  };

  const TopLevelMenu = ({ id, label, children }: { id: string; label: string; children: React.ReactNode }) => {
    const isActive = activeMenu === id;
    return (
      <div className="relative">
        <button
          onClick={() => handleMenuClick(id)}
          onMouseEnter={() => {
            if (activeMenu && activeMenu !== id) setActiveMenu(id);
          }}
          className={`px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase font-mono rounded transition-colors ${
            isActive ? 'bg-[#cbb26a]/20 text-[#cbb26a]' : 'text-slate-400 hover:text-[#cbb26a] hover:bg-[#806f47]/10'
          }`}
        >
          {label}
        </button>
        {isActive && (
          <div className="absolute top-full left-0 mt-1 min-w-[220px] bg-[#050b14]/95 border border-[#806f47]/40 shadow-2xl rounded-lg py-1 backdrop-blur-xl z-[150] flex flex-col pointer-events-auto">
            {children}
          </div>
        )}
      </div>
    );
  };

  const MenuItem = ({ label, shortcut, icon: Icon, onClick, disabled, divider }: any) => {
    if (divider) {
      return <div className="h-px w-full bg-[#806f47]/20 my-1" />;
    }
    return (
      <button
        onClick={() => handleItemClick(onClick)}
        disabled={disabled}
        className={`w-full text-left px-3 py-1.5 text-[11px] font-mono flex items-center justify-between group transition-colors ${
          disabled ? 'opacity-40 cursor-not-allowed text-slate-500' : 'text-slate-300 hover:bg-[#806f47]/20 hover:text-white'
        }`}
      >
        <div className="flex items-center gap-2">
          {Icon ? <Icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#cbb26a]" /> : <div className="w-3.5 h-3.5" />}
          <span>{label}</span>
        </div>
        {shortcut && <span className="text-slate-500 text-[10px]">{shortcut}</span>}
      </button>
    );
  };

  return (
    <div 
      ref={menuRef}
      className="pointer-events-auto absolute top-0 left-0 right-0 h-9 z-[110] bg-[#050b14]/95 border-b border-[#806f47]/30 flex items-center justify-between px-3 select-none backdrop-blur-md shadow-md"
    >
      {/* Zone 1: Left - Identity & Menus */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 pr-2 border-r border-[#806f47]/30">
          <span className="font-mono font-black text-xs tracking-wider text-[#cbb26a]">STUDIO</span>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/40 border border-[#806f47]/30 text-[10px] font-mono text-slate-300">
            <Globe className="w-3 h-3 text-[#cbb26a]" />
            <span>{currentMapId || 'LOBBY'}</span>
            {mapDirty && (
              <span className="text-amber-400 font-bold" title="Unsaved changes">*</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          <TopLevelMenu id="file" label="File">
            <MenuItem
              label="New Map..."
              icon={Folder}
              onClick={() => {
                useEditorStore.getState().openPanel('build');
                showToast('Opened World Builder (Create Map)');
              }}
            />
            <MenuItem
              label="Open Map / Quick Search..."
              shortcut="Ctrl+K"
              icon={Globe}
              onClick={() => {
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
              }}
            />
            <MenuItem
              label="Map Diagnostics & Problems"
              icon={CheckCircle2}
              onClick={() => {
                useEditorStore.getState().openPanel('problems');
              }}
            />
            <MenuItem divider />
            <MenuItem label="Save Map" shortcut="Ctrl+S" icon={Save} onClick={() => {
              window.dispatchEvent(new CustomEvent(STUDIO_TRIGGER_SAVE_MAP_EVENT));
            }} />
            <MenuItem divider />
            <MenuItem label="Export JSON (Advanced)" disabled />
            <MenuItem label="Publish..." disabled />
          </TopLevelMenu>

          <TopLevelMenu id="edit" label="Edit">
            <MenuItem 
              label="Undo" 
              shortcut="Ctrl+Z" 
              icon={Undo} 
              onClick={() => {
                const map = useGameStore.getState().activeMapData;
                if (!map) return;
                const res = useEditorStore.getState().triggerUndo(map);
                if (res.ok) showToast('Undo');
                else showToast('Nothing to undo');
              }} 
            />
            <MenuItem 
              label="Redo" 
              shortcut="Ctrl+Y" 
              icon={Redo} 
              onClick={() => {
                const map = useGameStore.getState().activeMapData;
                if (!map) return;
                const res = useEditorStore.getState().triggerRedo(map);
                if (res.ok) showToast('Redo');
                else showToast('Nothing to redo');
              }} 
            />
            <MenuItem divider />
            <MenuItem label="Cut" shortcut="Ctrl+X" disabled />
            <MenuItem label="Copy" shortcut="Ctrl+C" disabled />
            <MenuItem label="Paste" shortcut="Ctrl+V" disabled />
          </TopLevelMenu>

          <TopLevelMenu id="view" label="View">
            <MenuItem label="World Atlas" shortcut="Ctrl+Shift+P" icon={Globe} onClick={() => useEditorStore.getState().openPanel('atlas')} />
            <MenuItem label="Inspector" onClick={() => useEditorStore.getState().openPanel('properties')} />
            <MenuItem label="World Builder" onClick={() => useEditorStore.getState().openPanel('build')} />
            <MenuItem label="Assets" onClick={() => useEditorStore.getState().openPanel('assets')} />
            <MenuItem label="Problems & Diagnostics" shortcut="Ctrl+Shift+O" icon={AlertCircle} onClick={() => useEditorStore.getState().openPanel('problems')} />
            <MenuItem divider />
            <MenuItem label="Reset Layout" onClick={() => {
              window.localStorage.removeItem('saints.panelLayouts');
              window.location.reload();
            }} />
          </TopLevelMenu>

          <TopLevelMenu id="mode" label="Mode">
            {Object.entries(STUDIO_MODE_META).map(([key, meta]) => {
              if (key === 'test') return null;
              return (
                <MenuItem 
                  key={key} 
                  label={meta.canonical.charAt(0).toUpperCase() + meta.canonical.slice(1)} 
                  icon={studioMode === key ? CheckCircle2 : undefined}
                  onClick={() => setStudioMode(key as StudioMode)}
                />
              );
            })}
          </TopLevelMenu>

          <TopLevelMenu id="help" label="Help">
            <MenuItem label="Shortcuts" onClick={() => showToast('Shortcuts: Ctrl+E (Play/Edit), Ctrl+K (Search), Ctrl+S (Save)')} />
            <MenuItem label="Fun-First Checklist" disabled />
          </TopLevelMenu>
        </div>
      </div>

      {/* Zone 2: Center - Mode Transition Switcher */}
      <div className="flex items-center bg-[#000000]/80 p-0.5 rounded-lg border border-[#806f47]/40 shadow-inner">
        <button
          onClick={() => {
            if (!isCreationMode) toggleCreationMode();
          }}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-mono font-bold tracking-wider uppercase transition-all ${
            isCreationMode
              ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Editor Mode — World & Entity Tools (Ctrl+E)"
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Edit</span>
        </button>
        <button
          onClick={() => {
            if (isCreationMode) toggleCreationMode();
          }}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-mono font-bold tracking-wider uppercase transition-all ${
            !isCreationMode
              ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Playtest Mode — Test in Private Shard (Ctrl+E)"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Play Test</span>
        </button>
      </div>

      {/* Zone 3: Right - Quick Global Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            const map = useGameStore.getState().activeMapData;
            if (!map) return;
            const res = useEditorStore.getState().triggerUndo(map);
            if (res.ok) showToast('Undo');
          }}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => {
            const map = useGameStore.getState().activeMapData;
            if (!map) return;
            const res = useEditorStore.getState().triggerRedo(map);
            if (res.ok) showToast('Redo');
          }}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          title="Redo (Ctrl+Y)"
        >
          <Redo className="w-3.5 h-3.5" />
        </button>

        <button 
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
          }} 
          className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#806f47]/15 text-slate-300 hover:text-white hover:bg-[#806f47]/30 transition-colors text-[10px] font-mono border border-[#806f47]/40 shadow-sm"
        >
          <Search className="w-3 h-3 text-[#cbb26a]" />
          <span>Omnisearch</span>
          <span className="bg-black/60 px-1 rounded text-slate-400 text-[9px]">Ctrl+K</span>
        </button>
      </div>
    </div>
  );
}
