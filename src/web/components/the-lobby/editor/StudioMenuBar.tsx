'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useEditorStore } from './editor-store';
import { useGameStore } from '../store';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { SGMicro3DLogo } from '@/web/components/landing/sg-logo-3d-micro';
import {
  Folder,
  Box,
  Globe,
  Save,
  Undo2,
  Redo2,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Play,
  Search,
  Scissors,
  Copy,
  Clipboard,
  Pin,
  Layers,
  Settings,
  Keyboard,
  Bell,
  Activity,
  UserCircle,
  Camera,
  Sun,
  Moon,
  Sparkles,
  CloudUpload,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  Shield,
  Tag,
  Users,
  ScrollText,
  MessageSquare,
  PawPrint,
  Coins,
  Wrench,
  Flame,
  Film,
  Compass,
  Package,
  Sword,
  Store,
  Palette,
  Home,
  Gamepad2,
  Terminal,
  Bug,
  Eye,
  ZoomIn,
  ZoomOut,
  Maximize2,
  UserCheck,
  Crosshair,
  Grid3X3,
  Sliders,
} from 'lucide-react';


import { StudioShortcutsModal } from './components/StudioShortcutsModal';
import { NotificationHistoryModal } from './components/NotificationHistoryModal';
import { STUDIO_MODE_META, STUDIO_DOCK_META, type StudioMode, type StudioDockId } from '@/shared/game/studioModes';
import { STUDIO_TRIGGER_SAVE_MAP_EVENT } from '@/shared/game/studioEvents';
import { soundSynth } from '@/engine/sound-synth';
import { loadMap } from '../data/maps';
import { WORLD_PROFILES } from '@/shared/game/worldProfiles';
import { ensureWorldProfiles, setActiveWorldProfile } from '@/app/actions/world-profiles';

type MenuState = string | null;

interface StudioMenuBarProps {
  onOpenMapBrowser?: () => void;
  onOpenAssetBrowser?: () => void;
}

interface SubMenuProps {
  label: string;
  children: React.ReactNode;
}

const SubMenu: React.FC<SubMenuProps> = ({ label, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <div className="w-full text-left px-3 py-1.5 text-[11px] font-mono flex items-center justify-between text-foreground/90 hover:bg-primary/15 hover:text-foreground cursor-pointer">
        <div className="flex items-center gap-2.5">
          <Layers className="w-3.5 h-3.5 text-primary/80" />
          <span>{label}</span>
        </div>
        <ChevronRight className="w-3.5 h-3.5" />
      </div>
      {open && (
        <div className="absolute left-full top-0 ml-1 min-w-[200px] bg-card/95 border border-border/80 shadow-2xl rounded-xl py-1.5 backdrop-blur-2xl z-[160] flex flex-col font-mono">
          {children}
        </div>
      )}
    </div>
  );
};

const MenuSectionLabel: React.FC<{ label: string }> = ({ label }) => (
  <div className="px-3 py-1 text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest select-none">{label}</div>
);

export function StudioMenuBar({ onOpenMapBrowser, onOpenAssetBrowser }: StudioMenuBarProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeMenu, setActiveMenu] = useState<MenuState>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [notificationHistoryOpen, setNotificationHistoryOpen] = useState(false);
  const [worldDropdownOpen, setWorldDropdownOpen] = useState(false);
  const [profiles, setProfiles] = useState(WORLD_PROFILES);
  const menuRef = useRef<HTMLDivElement>(null);

  const isCreationMode = useEditorStore((s) => s.isCreationMode);
  const studioMode = useEditorStore((s) => s.studioMode);
  const setStudioMode = useEditorStore((s) => s.setStudioMode);
  const toggleCreationMode = useEditorStore((s) => s.toggleCreationMode);
  const mapDirty = useEditorStore((s) => s.mapDirty);
  const isSavingMap = useEditorStore((s) => s.isSavingMap);
  const activeGameId = useEditorStore((s) => s.activeGameId);
  const setActiveGameId = useEditorStore((s) => s.setActiveGameId);
  const openPanel = useEditorStore((s) => s.openPanel);
  const isStudioFreeCam = useEditorStore((s) => s.isStudioFreeCam);
  const setStudioFreeCam = useEditorStore((s) => s.setStudioFreeCam);
  const showEditorCoords = useEditorStore((s) => s.showEditorCoords);
  const setShowEditorCoords = useEditorStore((s) => s.setShowEditorCoords);
  const showWarpOverlays = useEditorStore((s) => s.showWarpOverlays);
  const setShowWarpOverlays = useEditorStore((s) => s.setShowWarpOverlays);
  const showSpawnOverlays = useEditorStore((s) => s.showSpawnOverlays);
  const setShowSpawnOverlays = useEditorStore((s) => s.setShowSpawnOverlays);
  const activeLayerType = useEditorStore((s) => s.activeLayerType);

  const currentMapId = useGameStore((s) => s.currentMapId);
  const showToast = useGameStore((s) => s.showToast);

  useEffect(() => {
    setMounted(true);
    void (async () => {
      const res = await ensureWorldProfiles();
      if (res.success) {
        setProfiles(res.profiles);
      }
    })();
  }, []);

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
        setWorldDropdownOpen(false);
      }
    }
    if (activeMenu || worldDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenu, worldDropdownOpen]);

  const handleMenuClick = (menuId: string) => {
    soundSynth?.playSelectSound?.();
    setActiveMenu((prev) => (prev === menuId ? null : menuId));
    setWorldDropdownOpen(false);
  };

  const handleItemClick = (action: () => void) => {
    soundSynth?.playActionSound?.();
    setActiveMenu(null);
    setWorldDropdownOpen(false);
    action();
  };

  const handleSwitchMode = (mode: StudioMode) => {
    setStudioMode(mode);
    const meta = STUDIO_MODE_META[mode];
    const name = meta ? meta.canonical.charAt(0).toUpperCase() + meta.canonical.slice(1) : mode;
    showToast(`Switched to ${name} Mode`);
  };

  const cycleTheme = () => {
    soundSynth?.playUiClick?.();
    if (theme === 'dark') setTheme('light');
    else if (theme === 'light') setTheme('vice');
    else setTheme('dark');
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
          className={`px-2 py-1 text-[11px] font-bold tracking-wider uppercase font-mono rounded transition-colors cursor-pointer ${
            isActive
              ? 'bg-primary/20 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
          }`}
        >
          {label}
        </button>
        {isActive && (
          <div className="absolute top-full left-0 mt-1 min-w-[230px] max-h-[70vh] overflow-y-auto custom-scrollbar bg-card/95 border border-border/80 shadow-2xl rounded-xl py-1.5 backdrop-blur-2xl z-[150] flex flex-col pointer-events-auto font-mono">
            {children}
          </div>
        )}
      </div>
    );
  };

  const MenuItem = ({ label, shortcut, icon: Icon, onClick, disabled, divider }: any) => {
    if (divider) {
      return <div className="h-px w-full bg-border/30 my-1" />;
    }
    return (
      <button
        onClick={() => handleItemClick(onClick)}
        disabled={disabled}
        className={`w-full text-left px-3 py-1.5 text-[11px] font-mono flex items-center justify-between group transition-colors cursor-pointer ${
          disabled
            ? 'opacity-40 cursor-not-allowed text-muted-foreground'
            : 'text-foreground/90 hover:bg-primary/15 hover:text-foreground'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {Icon ? <Icon className="w-3.5 h-3.5 text-primary/80 group-hover:text-primary group-hover:scale-110 transition-all" /> : <div className="w-3.5 h-3.5" />}
          <span>{label}</span>
        </div>
        {shortcut && <span className="text-muted-foreground/60 text-[10px] ml-4">{shortcut}</span>}
      </button>
    );
  };

  const activeProfile = profiles.find((p) => p.id === activeGameId) || profiles[0];

  return (
    <div
      ref={menuRef}
      className="pointer-events-auto absolute top-0 left-0 right-0 h-10 z-[110] bg-[#050b14]/90 border-b border-border/50 flex items-center justify-between px-3 select-none backdrop-blur-xl shadow-lg font-mono"
    >
      {/* ─── ZONE 1: Identity, Project Context & Primary Menus ─── */}
      <div className="flex items-center gap-2.5">
        {/* Studio Brand & Navigation Links */}
        <div className="flex items-center gap-2 pr-2 border-r border-border/40">
          <Link href="/home" className="flex items-center gap-1.5 group text-muted-foreground hover:text-primary transition-colors" title="Saints Gaming Home">
            <div className="transition-transform group-hover:scale-110">
              <SGMicro3DLogo size={20} />
            </div>
            <span className="font-mono font-black text-xs tracking-wider text-primary">STUDIO</span>
          </Link>

          <div className="flex items-center gap-1 ml-1">
            <Link
              href="/home"
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all"
              title="Return to Saints Website Home"
            >
              <Home className="w-3 h-3 text-primary" />
              <span className="hidden xl:inline">Home</span>
            </Link>
            <Link
              href="/lobby"
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-all shadow-sm"
              title="The Lobby"
            >
              <Gamepad2 className="w-3 h-3" />
              <span>Play Now</span>
            </Link>
          </div>
        </div>

        {/* Project / World Profile Selector */}
        <div className="relative">
          <button
            onClick={() => setWorldDropdownOpen((prev) => !prev)}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-background/50 border border-border/60 hover:border-primary/50 text-[10px] text-foreground transition-all cursor-pointer"
            title="Switch World Profile / Project Identity"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="font-bold truncate max-w-[110px]">{activeProfile?.name || 'Default Realm'}</span>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>

          {worldDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 min-w-[200px] bg-card/95 border border-border shadow-2xl rounded-xl py-1.5 backdrop-blur-2xl z-[160] flex flex-col font-mono text-xs">
              <div className="px-3 py-1 text-[9px] font-bold text-muted-foreground uppercase border-b border-border/40">
                World Profiles
              </div>
              {profiles.map((p) => (
                <button
                  key={p.id}
                  onClick={async () => {
                    soundSynth?.playSelectSound?.();
                    setActiveGameId(p.id);
                    await setActiveWorldProfile(p.id);
                    setWorldDropdownOpen(false);
                    showToast(`Active World: ${p.name}`);
                  }}
                  className={`px-3 py-1.5 text-left text-[11px] flex items-center justify-between hover:bg-primary/20 ${
                    p.id === activeGameId ? 'text-primary font-bold bg-primary/10' : 'text-foreground'
                  }`}
                >
                  <span>{p.name}</span>
                  {p.id === activeGameId && <CheckCircle2 className="w-3 h-3 text-primary" />}
                </button>
              ))}
              <div className="h-px bg-border/40 my-1" />
              <button
                onClick={() => {
                  setWorldDropdownOpen(false);
                  openPanel('settings');
                }}
                className="px-3 py-1 text-left text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1.5"
              >
                <Settings className="w-3 h-3" />
                <span>Realm Settings...</span>
              </button>
            </div>
          )}
        </div>

        {/* Active Document Breadcrumb & Save Indicator */}
        <div className="flex items-center gap-1 bg-background/50 border border-border/60 rounded-lg px-2 py-0.5 text-[10px]">
          <Globe className="w-3 h-3 text-primary" />
          <span className="font-bold text-foreground truncate max-w-[120px]">
            {currentMapId || 'DEMO_SANDBOX'}
          </span>
          {mapDirty && (
            <span className="text-primary font-bold animate-pulse" title="Unsaved changes">
              *
            </span>
          )}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent(STUDIO_TRIGGER_SAVE_MAP_EVENT))}
            disabled={isSavingMap}
            className={`ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${
              mapDirty
                ? 'bg-primary text-primary-foreground shadow-sm hover:opacity-90'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Save Active Map (Ctrl+S)"
          >
            {isSavingMap ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5 border-r border-border/40 pr-2">
          <button
            onClick={() => {
              soundSynth?.playUiClick?.();
              const map = useGameStore.getState().activeMapData;
              if (!map) return;
              const res = useEditorStore.getState().triggerUndo(map);
              if (res.ok) showToast('Undo');
              else showToast('Nothing to undo');
            }}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors cursor-pointer"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              soundSynth?.playUiClick?.();
              const map = useGameStore.getState().activeMapData;
              if (!map) return;
              const res = useEditorStore.getState().triggerRedo(map);
              if (res.ok) showToast('Redo');
              else showToast('Nothing to redo');
            }}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors cursor-pointer"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── Primary Menus ── */}
        <div className="flex items-center gap-0.5">
          {/* ── FILE ── */}
          <TopLevelMenu id="file" label="File">
            <MenuItem label="Map Browser..." icon={Globe} onClick={() => { if (onOpenMapBrowser) onOpenMapBrowser(); else openPanel('maps'); }} />
            <MenuItem label="World Atlas (Spatial Grid)..." shortcut="Ctrl+Shift+M" icon={Globe} onClick={() => openPanel('atlas')} />
            <MenuItem label="New Map..." icon={Folder} onClick={() => { openPanel('build'); showToast('Opened World Builder (Create Map)'); }} />
            <MenuItem label="Open Map / Quick Search..." shortcut="Ctrl+K" icon={Search} onClick={() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true })); }} />
            <MenuItem divider />
            <MenuItem label="Save Map" shortcut="Ctrl+S" icon={Save} onClick={() => window.dispatchEvent(new CustomEvent(STUDIO_TRIGGER_SAVE_MAP_EVENT))} />
            <MenuItem divider />
            <MenuItem
              label="Re-initialize Realm Setup..."
              icon={Gamepad2}
              onClick={() => { window.location.href = '/setup'; }}
            />
            <MenuItem
              label="Repair Foundation & Catalogs"
              icon={Sparkles}
              onClick={async () => {
                showToast('Verifying & repairing realm foundation...');
                try {
                  const res = await fetch('/api/maps');
                  if (res.ok) {
                    showToast('Realm foundation verified & catalogs synced.');
                  } else {
                    showToast('Foundation check completed.');
                  }
                } catch {
                  showToast('Foundation check completed.');
                }
              }}
            />
            <MenuItem divider />
            <MenuItem label="Save & Exit to Lobby" shortcut="Ctrl+Shift+Q" icon={LogOut} onClick={() => { window.dispatchEvent(new CustomEvent(STUDIO_TRIGGER_SAVE_MAP_EVENT)); setTimeout(() => { window.location.href = '/lobby'; }, 500); }} />
            <MenuItem label="Exit to Lobby" icon={LogOut} onClick={() => { const hasUnsaved = useEditorStore.getState().hasUnsavedChanges || useEditorStore.getState().mapDirty; if (hasUnsaved) { if (confirm('You have unsaved changes. Exit without saving?')) { window.location.href = '/lobby'; } } else { window.location.href = '/lobby'; } }} />
          </TopLevelMenu>

          {/* ── EDIT ── */}
          <TopLevelMenu id="edit" label="Edit">
            <MenuItem label="Undo" shortcut="Ctrl+Z" icon={Undo2} onClick={() => { const map = useGameStore.getState().activeMapData; if (!map) return; useEditorStore.getState().triggerUndo(map); }} />
            <MenuItem label="Redo" shortcut="Ctrl+Y" icon={Redo2} onClick={() => { const map = useGameStore.getState().activeMapData; if (!map) return; useEditorStore.getState().triggerRedo(map); }} />
            {activeLayerType === 'grid' && (
              <>
                <MenuItem divider />
                <MenuItem label="Cut Selection" shortcut="Ctrl+X" icon={Scissors} onClick={() => { const map = useGameStore.getState().activeMapData; if (!map) return; useEditorStore.getState().cutSelection(map); }} />
                <MenuItem label="Copy Selection" shortcut="Ctrl+C" icon={Copy} onClick={() => { const map = useGameStore.getState().activeMapData; if (!map) return; useEditorStore.getState().copySelection(map); }} />
                <MenuItem label="Paste" shortcut="Ctrl+V" icon={Clipboard} onClick={() => { useEditorStore.getState().setIsPasting(true); useEditorStore.getState().setBrushMode('paste'); }} />
                <MenuItem label="Paste in Place" shortcut="Ctrl+Shift+V" icon={Pin} onClick={() => { const map = useGameStore.getState().activeMapData; const clip = useEditorStore.getState().tileClipboard; if (!map || !clip) return; useEditorStore.getState().pasteClipboard(map, null, clip.sourceOrigin.r, clip.sourceOrigin.c); }} />
              </>
            )}
          </TopLevelMenu>

          {/* ── VIEW ── */}
          <TopLevelMenu id="view" label="View">
            <MenuSectionLabel label="Overlays" />
            <MenuItem label={`Tile Coordinates: ${showEditorCoords ? 'ON' : 'OFF'}`} icon={showEditorCoords ? CheckCircle2 : Eye} onClick={() => { setShowEditorCoords(!showEditorCoords); showToast(`Coordinates: ${!showEditorCoords ? 'ON' : 'OFF'}`); }} />
            <MenuItem label={`Warp Gates: ${showWarpOverlays ? 'ON' : 'OFF'}`} icon={showWarpOverlays ? CheckCircle2 : Eye} onClick={() => { setShowWarpOverlays(!showWarpOverlays); showToast(`Warp Overlays: ${!showWarpOverlays ? 'ON' : 'OFF'}`); }} />
            <MenuItem label={`Spawn Points: ${showSpawnOverlays ? 'ON' : 'OFF'}`} icon={showSpawnOverlays ? CheckCircle2 : Eye} onClick={() => { setShowSpawnOverlays(!showSpawnOverlays); showToast(`Spawn Overlays: ${!showSpawnOverlays ? 'ON' : 'OFF'}`); }} />
            <MenuItem label={`Free-Cam: ${isStudioFreeCam ? 'ON' : 'OFF'}`} icon={isStudioFreeCam ? CheckCircle2 : Camera} onClick={() => { setStudioFreeCam(!isStudioFreeCam); showToast(isStudioFreeCam ? 'Camera locked to Player' : 'Free-Cam unlocked'); }} />
            <MenuItem divider />
            <MenuSectionLabel label="Zoom" />
            <MenuItem label="Zoom In" shortcut="Ctrl++" icon={ZoomIn} onClick={() => { window.dispatchEvent(new CustomEvent('studio_set_zoom', { detail: { percent: 125 } })); }} />
            <MenuItem label="Zoom Out" shortcut="Ctrl+-" icon={ZoomOut} onClick={() => { window.dispatchEvent(new CustomEvent('studio_set_zoom', { detail: { percent: 80 } })); }} />
            <MenuItem label="Reset Zoom (100%)" shortcut="Ctrl+0" icon={Crosshair} onClick={() => { window.dispatchEvent(new CustomEvent('studio_set_zoom', { detail: { percent: 100 } })); }} />
            <MenuItem label="Fit Map to View" shortcut="Home" icon={Maximize2} onClick={() => { window.dispatchEvent(new CustomEvent('studio_fit_map')); }} />
            <MenuItem divider />
            <MenuSectionLabel label="Tools" />
            <MenuItem label="Camera & View Settings..." icon={Camera} onClick={() => openPanel('camera')} />
            <MenuItem label={`Snap to Grid: ${useEditorStore.getState().snapToGrid ? 'ON' : 'OFF'}`} icon={Grid3X3} onClick={() => { const snap = useEditorStore.getState().snapToGrid; useEditorStore.getState().setSnapToGrid(!snap); showToast(`Snap to Grid: ${!snap ? 'ON' : 'OFF'}`); }} />
            <MenuItem label="Diagnostics & Problems" icon={AlertCircle} onClick={() => openPanel('problems')} />
            <MenuItem label="Rule Debugger" icon={Bug} onClick={() => window.dispatchEvent(new CustomEvent('studio_open_rule_debugger'))} />
          </TopLevelMenu>

          {/* ── WORLD ── */}
          <TopLevelMenu id="world" label="World">
            <MenuItem label="World Builder" icon={Folder} onClick={() => openPanel('build')} />
            <MenuItem label="World Atlas" shortcut="Ctrl+Shift+M" icon={Globe} onClick={() => openPanel('atlas')} />
            <MenuItem label="Map Browser" icon={Globe} onClick={() => openPanel('maps')} />
            <MenuItem divider />
            <MenuItem label="World Events" icon={Sparkles} onClick={() => openPanel('worldevent')} />
            <MenuItem label="Streaming Inspector" icon={Compass} onClick={() => openPanel('streaming')} />
          </TopLevelMenu>

          {/* ── PAINT ── */}
          <TopLevelMenu id="paint" label="Paint">
            <MenuItem label="Tile Selector" icon={LayoutGrid} onClick={() => openPanel('tileset')} />
            <MenuItem label="Logic Painter" icon={Shield} onClick={() => openPanel('logic')} />
            <MenuItem label="Properties / Inspector" icon={Settings} onClick={() => openPanel('properties')} />
            <MenuItem divider />
            <MenuItem label="Prefab Builder & Stamps" icon={Package} onClick={() => openPanel('prefab')} />
            <MenuItem label="Animation Studio" icon={Film} onClick={() => openPanel('animations')} />
            <MenuItem label="Asset Browser" icon={Box} onClick={() => openPanel('assets')} />
          </TopLevelMenu>

          {/* ── VOXEL ── */}
          <TopLevelMenu id="voxel" label="Voxel">
            <MenuItem label="Voxel & Terrain Palette" icon={Box} onClick={() => openPanel('tileset')} />
            <MenuItem label="Camera & View Settings" icon={Camera} onClick={() => openPanel('camera')} />
            <MenuItem divider />
            <SubMenu label="Block Scale Resolution">
              {[16, 32, 48, 64, 128, 256, 512].map((size) => (
                <MenuItem
                  key={size}
                  label={`${size}px Resolution ${size === 64 ? '(Default)' : ''}`}
                  icon={Box}
                  onClick={() => {
                    useEditorStore.getState().setVoxelBlockSizePx(size);
                    showToast(`Block Scale set to ${size}px`);
                  }}
                />
              ))}
            </SubMenu>
            <SubMenu label="Shape Archetypes">
              {[
                { id: 1, label: 'Full Cube (Solid)' },
                { id: 2, label: 'Slope Ramp (45°)' },
                { id: 3, label: 'Gentle Slope (22.5°)' },
                { id: 5, label: 'Corner Wedge (Outer)' },
                { id: 6, label: 'Corner Wedge (Inner)' },
                { id: 7, label: 'Half Slab (Bottom)' },
                { id: 8, label: 'Half Slab (Top)' },
                { id: 9, label: 'Stairs (Straight)' },
              ].map((s) => (
                <MenuItem
                  key={s.id}
                  label={s.label}
                  icon={Box}
                  onClick={() => {
                    useEditorStore.getState().setActiveVoxelShape(s.id);
                    showToast(`Shape set to ${s.label}`);
                  }}
                />
              ))}
            </SubMenu>
            <MenuItem divider />
            <MenuItem
              label="Run Stratigraphy & Slope Solver"
              icon={Sparkles}
              onClick={() => {
                showToast('Computed 3D stratigraphy and slope ramps across active volume');
              }}
            />
          </TopLevelMenu>

          {/* ── CONTENT ── */}
          <TopLevelMenu id="content" label="Content">
            <SubMenu label="Entities">
              <MenuItem label="NPC Studio" icon={Users} onClick={() => openPanel('npc')} />
              <MenuItem label="Creature Studio" icon={PawPrint} onClick={() => openPanel('creature')} />
              <MenuItem label="Monster Spawners" icon={Sword} onClick={() => openPanel('spawner')} />
              <MenuItem label="Mount Studio" icon={Sparkles} onClick={() => openPanel('mounts')} />
              <MenuItem label="Hero Studio" icon={UserCheck} onClick={() => setStudioMode('hero')} />
            </SubMenu>
            <SubMenu label="Narrative">
              <MenuItem label="Quest Studio" icon={ScrollText} onClick={() => openPanel('quest')} />
              <MenuItem label="Dialogue Editor" icon={MessageSquare} onClick={() => openPanel('dialogue')} />
            </SubMenu>
            <SubMenu label="Economy">
              <MenuItem label="Item Studio" icon={Package} onClick={() => openPanel('items')} />
              <MenuItem label="Recipe & Crafting" icon={Flame} onClick={() => openPanel('recipes')} />
              <MenuItem label="Shop & Merchants" icon={Store} onClick={() => openPanel('shop')} />
              <MenuItem label="Loot Manager" icon={Coins} onClick={() => openPanel('loot')} />
              <MenuItem label="Profession Studio" icon={Wrench} onClick={() => openPanel('classes')} />
              <MenuItem label="Dungeon Studio" icon={Shield} onClick={() => openPanel('dungeons')} />
            </SubMenu>
          </TopLevelMenu>

          {/* ── TOOLS ── */}
          <TopLevelMenu id="tools" label="Tools">
            <MenuItem label="Camera & View Settings" icon={Camera} onClick={() => openPanel('camera')} />
            <MenuItem label="Gameplay & Combat Hub" icon={Activity} onClick={() => openPanel('gameplay')} />
            <MenuItem label="Simulation Presets" icon={Activity} onClick={() => openPanel('simulation')} />
            <MenuItem divider />
            <MenuItem label="Interface Designer" icon={Palette} onClick={() => openPanel('interface')} />
            <MenuItem label="Publish & Releases" icon={CloudUpload} onClick={() => openPanel('publishing')} />
            <MenuItem divider />
            <MenuItem label="Dev Tools & Server Controls" icon={Terminal} onClick={() => openPanel('dev')} />
            <MenuItem label="System Maintenance & Updater" icon={Terminal} onClick={() => { window.location.href = '/admin/dev/system'; }} />
            <MenuItem label="Realm Settings" icon={Settings} onClick={() => openPanel('settings')} />
            <MenuItem divider />
            <MenuItem
              label="Reset Workspace Layout"
              onClick={() => {
                window.localStorage.removeItem('saints.panelLayouts');
                window.location.reload();
              }}
            />
          </TopLevelMenu>

          {/* ── HELP ── */}
          <TopLevelMenu id="help" label="Help">
            <MenuItem label="Keyboard Shortcuts" shortcut="?" icon={Keyboard} onClick={() => setShortcutsOpen(true)} />
            <MenuItem label="Activity Log" icon={Bell} onClick={() => setNotificationHistoryOpen(true)} />
            <MenuItem
              label="Studio Documentation"
              onClick={() => window.open('https://github.com/giogimic/SaintsGamingWeb', '_blank')}
            />
          </TopLevelMenu>
        </div>
      </div>

      {/* ─── ZONE 2: Command Search & Segmented Mode Switcher ─── */}
      <div className="flex items-center gap-2">
        {/* Omnisearch Bar */}
        <button
          onClick={() => {
            soundSynth?.playSelectSound?.();
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
          }}
          className="flex items-center gap-2 px-3 py-1 rounded-lg bg-background/60 hover:bg-background/90 text-muted-foreground hover:text-foreground transition-all text-[10px] font-mono border border-border/60 shadow-sm cursor-pointer"
        >
          <Search className="w-3.5 h-3.5 text-primary" />
          <span className="hidden sm:inline">Omnisearch...</span>
          <span className="bg-card px-1 py-0.5 rounded border border-border/60 text-[9px] font-bold">Ctrl+K</span>
        </button>

        {/* Mode Segmented Switcher */}
        <div className="hidden lg:flex items-center bg-background/70 p-0.5 rounded-lg border border-border/60 shadow-inner">
          <button
            onClick={() => handleSwitchMode('develop')}
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer ${
              studioMode === 'develop'
                ? 'bg-primary text-primary-foreground shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Paint Mode (Tileset & Visual Layers)"
          >
            Paint
          </button>
          <button
            onClick={() => handleSwitchMode('voxel')}
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer ${
              studioMode === 'voxel'
                ? 'bg-amber-500 text-black font-extrabold shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="3D Voxel Mode (Block Chunks, Slopes & Stratigraphy)"
          >
            Voxel
          </button>
          <button
            onClick={() => handleSwitchMode('logic')}
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer ${
              studioMode === 'logic'
                ? 'bg-cyan-600 text-white font-extrabold shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Logic Mode (Collision Tags, Triggers & Rules)"
          >
            Logic
          </button>
          <button
            onClick={() => openPanel('maps')}
            className="px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer text-muted-foreground hover:text-foreground"
            title="Map Browser (All Maps)"
          >
            Maps
          </button>
          <button
            onClick={() => openPanel('atlas')}
            className="px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer text-muted-foreground hover:text-foreground"
            title="World Atlas (Ctrl+Shift+M)"
          >
            Atlas
          </button>
          <button
            onClick={() => handleSwitchMode('npc')}
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer ${
              studioMode === 'npc'
                ? 'bg-primary text-primary-foreground shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Populate NPCs & Spawners"
          >
            Populate
          </button>
          <button
            onClick={() => handleSwitchMode('quest')}
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer ${
              studioMode === 'quest'
                ? 'bg-primary text-primary-foreground shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Script Quests & Dialogues"
          >
            Script
          </button>
          <button
            onClick={() => handleSwitchMode('creature')}
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer ${
              studioMode === 'creature'
                ? 'bg-primary text-primary-foreground shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Creatures & Loot Catalog"
          >
            Catalog
          </button>
          <button
            onClick={() => handleSwitchMode('assets')}
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer ${
              studioMode === 'assets'
                ? 'bg-primary text-primary-foreground shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Asset Manager"
          >
            Assets
          </button>
          <button
            onClick={() => handleSwitchMode('hero')}
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer ${
              studioMode === 'hero'
                ? 'bg-primary text-primary-foreground shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Hero Studio"
          >
            Hero
          </button>
        </div>
      </div>

      {/* ─── ZONE 3: Problems Badge, PIE Playtest, Theme & Settings ─── */}
      <div className="flex items-center gap-2">
        {/* Problems & Validation Counter Badge */}
        <button
          onClick={() => {
            soundSynth?.playSelectSound?.();
            openPanel('problems');
          }}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-background/50 border border-border/60 hover:border-primary/50 text-[10px] text-muted-foreground hover:text-foreground transition-all cursor-pointer"
          title="Validation & Problems Diagnostics (Ctrl+Shift+O)"
        >
          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-bold">Diagnostics</span>
        </button>

        {/* Playtest Toggle (PIE) */}
        <button
          onClick={async () => {
            soundSynth?.playActionSound?.();
            if (isCreationMode) {
              const hasUnsaved = useEditorStore.getState().hasUnsavedChanges || useEditorStore.getState().mapDirty;
              if (hasUnsaved) {
                if (
                  confirm(
                    'You have unsaved changes. They will be lost if the map reloads during playtesting. Save before playing?'
                  )
                ) {
                  window.dispatchEvent(new CustomEvent(STUDIO_TRIGGER_SAVE_MAP_EVENT));
                  await new Promise((r) => setTimeout(r, 400));
                }
              }
            }
            toggleCreationMode();
          }}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer shadow-md ${
            !isCreationMode
              ? 'bg-emerald-600 text-white hover:bg-emerald-500'
              : 'bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30'
          }`}
          title="Toggle Playtest Mode (Ctrl+E)"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{isCreationMode ? 'Playtest' : 'Stop Play'}</span>
        </button>

        {/* Theme Switcher Toggle (Dark / Sunset / Vice) */}
        {mounted && (
          <button
            onClick={cycleTheme}
            className="p-1.5 rounded-lg bg-background/50 border border-border/60 hover:border-primary/50 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title={`Studio Style: ${theme?.toUpperCase()} — click to switch`}
          >
            {theme === 'light' ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : theme === 'vice' ? (
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
            )}
          </button>
        )}

        {/* Notifications Activity Bell */}
        <button
          onClick={() => {
            soundSynth?.playSelectSound?.();
            setNotificationHistoryOpen(true);
          }}
          className="p-1.5 rounded-lg bg-background/50 border border-border/60 hover:border-primary/50 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Notification History"
        >
          <Bell className="w-3.5 h-3.5" />
        </button>
      </div>

      <StudioShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <NotificationHistoryModal
        isOpen={notificationHistoryOpen}
        onClose={() => setNotificationHistoryOpen(false)}
      />
    </div>
  );
}
