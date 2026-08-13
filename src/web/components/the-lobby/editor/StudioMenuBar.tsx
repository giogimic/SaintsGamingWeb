'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useEditorStore } from './editor-store';
import { useGameStore } from '../store';
import {
  FileText, Edit, Eye, Folder, Box, Globe, PlayCircle, Users, HelpCircle,
  Save, Undo, Redo, LogOut, CheckCircle2, ChevronRight, X
} from 'lucide-react';
import { STUDIO_MODE_META, type StudioMode } from '@/shared/game/studioModes';

type MenuState = string | null;

export function StudioMenuBar() {
  const [activeMenu, setActiveMenu] = useState<MenuState>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const studioMode = useEditorStore((s) => s.studioMode);
  const setStudioMode = useEditorStore((s) => s.setStudioMode);
  const toggleCreationMode = useEditorStore((s) => s.toggleCreationMode);
  const mapDirty = useEditorStore((s) => s.mapDirty);
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
          className={`px-3 py-1 text-[11px] font-bold tracking-wider uppercase font-mono rounded transition-colors ${
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
      className="pointer-events-auto absolute top-0 left-0 right-0 h-8 z-[110] bg-[#050b14]/95 border-b border-[#806f47]/30 flex items-center px-2 select-none backdrop-blur-md shadow-md"
    >
      <div className="flex items-center gap-1">
        <TopLevelMenu id="file" label="File">
          <MenuItem label="New Map..." disabled />
          <MenuItem label="Open Map..." disabled />
          <MenuItem divider />
          <MenuItem label="Save" shortcut="Ctrl+S" icon={Save} disabled={!mapDirty} onClick={() => showToast('Save triggered')} />
          <MenuItem label="Save All" shortcut="Ctrl+Shift+S" disabled={!mapDirty} onClick={() => showToast('Save All triggered')} />
          <MenuItem divider />
          <MenuItem label="Export JSON (Advanced)" disabled />
          <MenuItem label="Import Hub..." disabled />
          <MenuItem divider />
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
          <MenuItem label="Paste Special..." disabled />
          <MenuItem divider />
          <MenuItem label="Duplicate" shortcut="Ctrl+D" disabled />
          <MenuItem label="Delete" shortcut="Del" disabled />
          <MenuItem divider />
          <MenuItem label="Select All on Layer" shortcut="Ctrl+A" disabled />
          <MenuItem label="Deselect" shortcut="Esc" disabled />
          <MenuItem divider />
          <MenuItem label="Batch Rename..." disabled />
          <MenuItem label="Preferences..." disabled />
        </TopLevelMenu>

        <TopLevelMenu id="view" label="View">
          <MenuItem label="Fit Map in View" shortcut="Home" onClick={() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Home' }));
          }} />
          <MenuItem divider />
          <MenuItem label="Outliner" onClick={() => showToast('Outliner not fully wired')} />
          <MenuItem label="Inspector" onClick={() => showToast('Inspector uses Properties dock')} />
          <MenuItem label="Project Browser" shortcut="Ctrl+Shift+P" onClick={() => showToast('Project Browser panel')} />
          <MenuItem label="Assets" onClick={() => showToast('Assets dock')} />
          <MenuItem divider />
          <MenuItem label="Reset Layout" onClick={() => {
            window.localStorage.removeItem('saints.panelLayouts');
            window.location.reload();
          }} />
          <MenuItem label="Zen" shortcut="Ctrl+." disabled />
          <MenuItem divider />
          <MenuItem label="Grid" disabled />
          <MenuItem label="Collision" disabled />
          <MenuItem label="Entity labels" disabled />
          <MenuItem label="Region channels" disabled />
          <MenuItem label="Advanced Tier" disabled />
        </TopLevelMenu>

        <TopLevelMenu id="project" label="Project">
          <MenuItem label="Switch Project..." disabled />
          <MenuItem label="Project Settings..." disabled />
          <MenuItem label="Members..." disabled />
          <MenuItem label="Packages..." disabled />
        </TopLevelMenu>

        <TopLevelMenu id="mode" label="Mode">
          {Object.entries(STUDIO_MODE_META).map(([key, meta]) => {
            if (key === 'test') return null; // Test is under Play
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

        <TopLevelMenu id="world" label="World">
          <MenuItem label="Reload from Server" onClick={() => showToast('Reloading map from server...')} />
          <MenuItem label="Validate Map" disabled />
          <MenuItem label="Soft-lock Status" disabled />
        </TopLevelMenu>

        <TopLevelMenu id="play" label="Play">
          <MenuItem label="Walk Mode" shortcut="Ctrl+E" icon={PlayCircle} onClick={() => toggleCreationMode()} />
          <MenuItem label="Quest Test Bench" disabled />
          <MenuItem label="Simulate Loot" onClick={() => showToast('Use Loot Manager panel')} />
          <MenuItem label="PIE Options..." disabled />
        </TopLevelMenu>

        <TopLevelMenu id="team" label="Team">
          <MenuItem label="Tasks" disabled />
          <MenuItem label="Audit Log" disabled />
          <MenuItem label="Request Review..." disabled />
        </TopLevelMenu>

        <TopLevelMenu id="help" label="Help">
          <MenuItem label="Shortcuts" onClick={() => showToast('Shortcuts modal')} />
          <MenuItem label="Docs dock" disabled />
          <MenuItem label="Fun-first checklist" disabled />
          <MenuItem label="Bible" disabled />
        </TopLevelMenu>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <button 
          onClick={() => {
            // Simulate Ctrl+K to open omnisearch (handled by StudioEditorShell keydown)
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
          }} 
          className="flex items-center gap-2 px-3 py-1 rounded bg-[#806f47]/10 text-slate-400 hover:text-white hover:bg-[#806f47]/30 transition-colors text-[10px] font-mono border border-transparent hover:border-[#806f47]/50"
        >
          <span>Search...</span>
          <span className="bg-black/50 px-1 rounded text-slate-500">Ctrl+K</span>
        </button>
      </div>
    </div>
  );
}
