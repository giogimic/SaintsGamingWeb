'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useEditorStore } from './editor-store';
import { useGameStore } from '../store';
import {
  FileText, Edit, Eye, Folder, Box, Globe, PlayCircle, Users, HelpCircle,
  Save, Undo, Redo, LogOut, CheckCircle2, ChevronRight, X, Wrench, Play, Search, AlertCircle,
  Scissors, Copy, Clipboard, Pin, Layers, Settings, Keyboard, Bell, Activity
} from 'lucide-react';
import { RealmSettingsModal } from './RealmSettingsModal';
import { StudioShortcutsModal } from './components/StudioShortcutsModal';
import { NotificationHistoryModal } from './components/NotificationHistoryModal';
import { STUDIO_MODE_META, type StudioMode } from '@/shared/game/studioModes';
import { STUDIO_TRIGGER_SAVE_MAP_EVENT } from '@/shared/game/studioEvents';
import { soundSynth } from '@/engine/sound-synth';

type MenuState = string | null;

interface StudioMenuBarProps {
  onOpenMapBrowser?: () => void;
  onOpenAssetBrowser?: () => void;
}

export function StudioMenuBar({ onOpenMapBrowser, onOpenAssetBrowser }: StudioMenuBarProps) {
  const [activeMenu, setActiveMenu] = useState<MenuState>(null);
  const [realmSettingsOpen, setRealmSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [notificationHistoryOpen, setNotificationHistoryOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const isCreationMode = useEditorStore((s) => s.isCreationMode);
  const studioMode = useEditorStore((s) => s.studioMode);
  const setStudioMode = useEditorStore((s) => s.setStudioMode);
  const toggleCreationMode = useEditorStore((s) => s.toggleCreationMode);
  const mapDirty = useEditorStore((s) => s.mapDirty);
  const currentMapId = useGameStore((s) => s.currentMapId);
  const showToast = useGameStore((s) => s.showToast);

  const handleSwitchMode = (mode: StudioMode) => {
    setStudioMode(mode);
    const meta = STUDIO_MODE_META[mode];
    const name = meta ? meta.canonical.charAt(0).toUpperCase() + meta.canonical.slice(1) : mode;
    showToast(`Switched to ${name} Mode`);
  };

  useEffect(() => {
    const handleOpen = () => setShortcutsOpen(true);
    window.addEventListener('studio_open_shortcuts', handleOpen);
    return () => window.removeEventListener('studio_open_shortcuts', handleOpen);
  }, []);

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
    soundSynth?.playSelectSound?.();
    setActiveMenu((prev) => (prev === menuId ? null : menuId));
  };

  const handleItemClick = (action: () => void) => {
    soundSynth?.playActionSound?.();
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
          className={`px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase font-mono rounded transition-colors cursor-pointer ${
            isActive ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-amber-300 hover:bg-amber-500/10'
          }`}
        >
          {label}
        </button>
        {isActive && (
          <div className="absolute top-full left-0 mt-1 min-w-[220px] bg-[#050b14]/95 border border-amber-500/40 shadow-2xl rounded-lg py-1 backdrop-blur-xl z-[150] flex flex-col pointer-events-auto font-mono">
            {children}
          </div>
        )}
      </div>
    );
  };

  const MenuItem = ({ label, shortcut, icon: Icon, onClick, disabled, divider }: any) => {
    if (divider) {
      return <div className="h-px w-full bg-amber-500/20 my-1" />;
    }
    return (
      <button
        onClick={() => handleItemClick(onClick)}
        disabled={disabled}
        className={`w-full text-left px-3 py-1.5 text-[11px] font-mono flex items-center justify-between group transition-colors cursor-pointer ${
          disabled ? 'opacity-40 cursor-not-allowed text-slate-500' : 'text-slate-300 hover:bg-amber-500/20 hover:text-white'
        }`}
      >
        <div className="flex items-center gap-2">
          {Icon ? <Icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-300" /> : <div className="w-3.5 h-3.5" />}
          <span>{label}</span>
        </div>
        {shortcut && <span className="text-slate-500 text-[10px]">{shortcut}</span>}
      </button>
    );
  };

  return (
    <div 
      ref={menuRef}
      className="pointer-events-auto absolute top-0 left-0 right-0 h-9 z-[110] bg-[#050b14]/95 border-b border-amber-500/30 flex items-center justify-between px-3 select-none backdrop-blur-md shadow-md font-mono"
    >
      {/* Zone 1: Left - Identity & Menus */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 pr-2 border-r border-amber-500/30">
          <span className="font-mono font-black text-xs tracking-wider text-amber-400">STUDIO</span>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/60 border border-amber-500/30 text-[10px] font-mono text-slate-300">
            <Globe className="w-3 h-3 text-amber-400" />
            <span>{currentMapId || 'LOBBY'}</span>
            {mapDirty && (
              <span className="text-amber-400 font-bold" title="Unsaved changes">*</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          <TopLevelMenu id="file" label="File">
            <MenuItem
              label="Browse All Maps..."
              shortcut="Ctrl+Shift+M"
              icon={Globe}
              onClick={() => {
                if (onOpenMapBrowser) onOpenMapBrowser();
                else useEditorStore.getState().openPanel('atlas');
              }}
            />
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
              icon={Search}
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
            <MenuItem
              label="Realm Settings & Identity..."
              icon={Settings}
              onClick={() => {
                setRealmSettingsOpen(true);
              }}
            />
            <MenuItem divider />
            <MenuItem label="Save Map" shortcut="Ctrl+S" icon={Save} onClick={() => {
              window.dispatchEvent(new CustomEvent(STUDIO_TRIGGER_SAVE_MAP_EVENT));
            }} />
            <MenuItem divider />
            <MenuItem
              label="Save & Exit to Character Select"
              shortcut="Ctrl+Shift+Q"
              icon={LogOut}
              onClick={() => {
                window.dispatchEvent(new CustomEvent(STUDIO_TRIGGER_SAVE_MAP_EVENT));
                setTimeout(() => { window.location.href = '/lobby'; }, 500);
              }}
            />
            <MenuItem
              label="Exit to Character Select"
              icon={LogOut}
              onClick={() => {
                const hasUnsaved = useEditorStore.getState().hasUnsavedChanges || useEditorStore.getState().mapDirty;
                if (hasUnsaved) {
                  if (confirm('You have unsaved changes. Exit without saving?')) {
                    window.location.href = '/lobby';
                  }
                } else {
                  window.location.href = '/lobby';
                }
              }}
            />
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
            <MenuItem
              label="Cut"
              shortcut="Ctrl+X"
              icon={Scissors}
              onClick={() => {
                const map = useGameStore.getState().activeMapData;
                if (!map) return;
                const res = useEditorStore.getState().cutSelection(map);
                if (res.ok) {
                  showToast(`Cut ${res.width}×${res.height} tiles (${res.count} cleared)`);
                } else {
                  showToast(res.error || 'Cut failed');
                }
              }}
            />
            <MenuItem
              label="Copy"
              shortcut="Ctrl+C"
              icon={Copy}
              onClick={() => {
                const map = useGameStore.getState().activeMapData;
                if (!map) return;
                const res = useEditorStore.getState().copySelection(map);
                if (res.ok) {
                  showToast(`Copied ${res.width}×${res.height} tiles to clipboard`);
                } else {
                  showToast(res.error || 'Copy failed');
                }
              }}
            />
            <MenuItem
              label="Paste"
              shortcut="Ctrl+V"
              icon={Clipboard}
              onClick={() => {
                const clip = useEditorStore.getState().tileClipboard;
                if (!clip) {
                  showToast('Clipboard is empty. Copy tiles first (Ctrl+C).');
                  return;
                }
                useEditorStore.getState().setIsPasting(true);
                useEditorStore.getState().setBrushMode('paste');
                showToast(`Paste active (${clip.width}×${clip.height}) — click to place`);
              }}
            />
            <MenuItem
              label="Paste in Place"
              shortcut="Ctrl+Shift+V"
              icon={Pin}
              onClick={() => {
                const map = useGameStore.getState().activeMapData;
                const clip = useEditorStore.getState().tileClipboard;
                if (!map || !clip) {
                  showToast('Clipboard is empty.');
                  return;
                }
                const res = useEditorStore.getState().pasteClipboard(
                  map,
                  null,
                  clip.sourceOrigin.r,
                  clip.sourceOrigin.c
                );
                if (res.ok) {
                  showToast(`Pasted in place at [${clip.sourceOrigin.c}, ${clip.sourceOrigin.r}]`);
                } else {
                  showToast(res.error || 'Paste failed');
                }
              }}
            />
            <MenuItem
              label="Paste to New Layer"
              icon={Layers}
              onClick={() => {
                const clip = useEditorStore.getState().tileClipboard;
                if (!clip) {
                  showToast('Clipboard is empty.');
                  return;
                }
                useEditorStore.getState().setPasteMode('new_layer');
                useEditorStore.getState().setIsPasting(true);
                useEditorStore.getState().setBrushMode('paste');
                showToast('Pasting onto a New Layer — click to place');
              }}
            />
          </TopLevelMenu>

          <TopLevelMenu id="view" label="View">
            <MenuItem
              label="World Atlas (Full Workspace)"
              shortcut="Ctrl+Shift+M"
              icon={Globe}
              onClick={() => {
                useEditorStore.getState().setStudioMode('atlas');
              }}
            />
            <MenuItem
              label="Asset Studio (Full Workspace)"
              shortcut="Ctrl+Shift+A"
              icon={Box}
              onClick={() => {
                useEditorStore.getState().setStudioMode('assets');
              }}
            />
            <MenuItem divider />
            <MenuItem label="World Atlas (Dock)" shortcut="Ctrl+Shift+P" icon={Globe} onClick={() => useEditorStore.getState().openPanel('atlas')} />
            <MenuItem label="Inspector" onClick={() => useEditorStore.getState().openPanel('properties')} />
            <MenuItem label="World Builder" onClick={() => useEditorStore.getState().openPanel('build')} />
            <MenuItem label="Problems & Diagnostics" shortcut="Ctrl+Shift+O" icon={AlertCircle} onClick={() => useEditorStore.getState().openPanel('problems')} />
            <MenuItem label="Streaming Inspector" icon={Activity} onClick={() => useEditorStore.getState().openPanel('streaming')} />
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
                  onClick={() => handleSwitchMode(key as StudioMode)}
                />
              );
            })}
          </TopLevelMenu>

          <TopLevelMenu id="help" label="Help">
            <MenuItem 
              label="Keyboard Shortcuts" 
              shortcut="?" 
              icon={Keyboard} 
              onClick={() => setShortcutsOpen(true)} 
            />
            <MenuItem 
              label="Activity & Notice Log" 
              icon={Bell} 
              onClick={() => setNotificationHistoryOpen(true)} 
            />
            <MenuItem label="Studio Documentation" onClick={() => window.open('https://github.com/giogimic/SaintsGamingWeb', '_blank')} />
          </TopLevelMenu>
        </div>
      </div>

      {/* Zone 2: Center - Mode Transition Switcher */}
      <div className="flex items-center bg-black/80 p-0.5 rounded-lg border border-amber-500/40 shadow-inner">
        <button
          onClick={() => {
            soundSynth?.playActionSound?.();
            if (!isCreationMode) toggleCreationMode();
            if (studioMode === 'assets' || studioMode === 'atlas') setStudioMode('develop');
          }}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer ${
            isCreationMode && studioMode !== 'assets' && studioMode !== 'atlas'
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
            soundSynth?.playActionSound?.();
            if (!isCreationMode) toggleCreationMode();
            setStudioMode('atlas');
          }}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer ${
            isCreationMode && studioMode === 'atlas'
              ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="World Atlas — Macro Layout, Map Library, and Seam Management (Ctrl+Shift+M)"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Atlas</span>
        </button>
        <button
          onClick={() => {
            soundSynth?.playActionSound?.();
            if (!isCreationMode) toggleCreationMode();
            setStudioMode('assets');
          }}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer ${
            isCreationMode && studioMode === 'assets'
              ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Asset Manager — Characters, Audio, Packs, and Catalog (Ctrl+Shift+A)"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Assets</span>
        </button>
        <div className="w-px h-4 bg-amber-500/30 mx-1" />
        <button
          onClick={async () => {
            soundSynth?.playActionSound?.();
            if (isCreationMode) {
              const hasUnsaved = useEditorStore.getState().hasUnsavedChanges || useEditorStore.getState().mapDirty;
              if (hasUnsaved) {
                if (confirm('You have unsaved changes. They will be lost if the map reloads during playtesting. Save before playing?')) {
                  window.dispatchEvent(new CustomEvent(STUDIO_TRIGGER_SAVE_MAP_EVENT));
                  await new Promise((r) => setTimeout(r, 400));
                }
              }
              toggleCreationMode();
            }
          }}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer ${
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
            soundSynth?.playUiClick?.();
            const map = useGameStore.getState().activeMapData;
            if (!map) return;
            const res = useEditorStore.getState().triggerUndo(map);
            if (res.ok) showToast('Undo');
          }}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          title="Undo (Ctrl+Z)"
        >
          <Undo className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => {
            soundSynth?.playUiClick?.();
            const map = useGameStore.getState().activeMapData;
            if (!map) return;
            const res = useEditorStore.getState().triggerRedo(map);
            if (res.ok) showToast('Redo');
          }}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          title="Redo (Ctrl+Y)"
        >
          <Redo className="w-3.5 h-3.5" />
        </button>

        <button 
          onClick={() => {
            soundSynth?.playSelectSound?.();
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
          }} 
          className="flex items-center gap-2 px-2.5 py-1 rounded bg-amber-500/15 text-slate-300 hover:text-white hover:bg-amber-500/30 transition-colors text-[10px] font-mono border border-amber-500/40 shadow-sm cursor-pointer"
        >
          <Search className="w-3 h-3 text-amber-400" />
          <span>Omnisearch</span>
          <span className="bg-black/60 px-1 rounded text-slate-400 text-[9px]">Ctrl+K</span>
        </button>

        <button
          onClick={() => {
            soundSynth?.playSelectSound?.();
            setNotificationHistoryOpen(true);
          }}
          className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-white/5 transition-colors cursor-pointer"
          title="Studio Activity & Notification Log"
        >
          <Bell className="w-3.5 h-3.5" />
        </button>
      </div>

      <RealmSettingsModal
        isOpen={realmSettingsOpen}
        onClose={() => setRealmSettingsOpen(false)}
      />

      <StudioShortcutsModal
        isOpen={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      <NotificationHistoryModal
        isOpen={notificationHistoryOpen}
        onClose={() => setNotificationHistoryOpen(false)}
      />
    </div>
  );
}

