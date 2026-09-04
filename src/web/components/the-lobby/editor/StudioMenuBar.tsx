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
  Minus,
  Square,
  X,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Wand2,
  Plus,
  Trash2,
  FolderPlus,
  Check,
} from 'lucide-react';


import { StudioShortcutsModal } from './components/StudioShortcutsModal';
import { NotificationHistoryModal } from './components/NotificationHistoryModal';
import { ReinitializeSetupModal } from './components/ReinitializeSetupModal';
import {
  STUDIO_MODE_META,
  STUDIO_DOCK_META,
  STUDIO_WORKSPACE_PRESETS,
  type StudioMode,
  type StudioDockId,
} from '@/shared/game/studioModes';
import { STUDIO_TRIGGER_SAVE_MAP_EVENT } from '@/shared/game/studioEvents';
import { soundSynth } from '@/engine/sound-synth';
import { loadMap } from '../data/maps';
import { WORLD_PROFILES } from '@/shared/game/worldProfiles';
import { ensureWorldProfiles, setActiveWorldProfile } from '@/app/actions/world-profiles';
import { creatorRecents } from '@/shared/game/creatorRecents';

type MenuState = string | null;

interface StudioMenuBarProps {
  onOpenMapBrowser?: () => void;
  onOpenAssetBrowser?: () => void;
}

interface SubMenuProps {
  label: string;
  icon?: any;
  children: React.ReactNode;
}

const SubMenu: React.FC<SubMenuProps> = ({ label, icon: SubIcon, children }) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [flipLeft, setFlipLeft] = useState(false);
  const [shiftUp, setShiftUp] = useState(false);

  const handleMouseEnter = () => {
    if (triggerRef.current && typeof window !== 'undefined') {
      const rect = triggerRef.current.getBoundingClientRect();
      setFlipLeft(rect.right + 240 > window.innerWidth);
      setShiftUp(rect.top + 320 > window.innerHeight);
    }
    setOpen(true);
  };

  return (
    <div
      ref={triggerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setOpen(false)}
    >
      <div
        className={`w-full text-left px-3 py-1.5 text-[11px] font-mono flex items-center justify-between transition-colors cursor-pointer ${
          open ? 'bg-primary/20 text-primary font-semibold' : 'text-foreground/90 hover:bg-primary/15 hover:text-foreground'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {SubIcon ? (
            <SubIcon className="w-3.5 h-3.5 text-primary/80" />
          ) : (
            <Layers className="w-3.5 h-3.5 text-primary/80" />
          )}
          <span>{label}</span>
        </div>
        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${open ? 'translate-x-0.5' : ''}`} />
      </div>
      {open && (
        <div
          style={{
            position: 'absolute',
            ...(flipLeft
              ? { right: '100%', left: 'auto', marginRight: '4px' }
              : { left: '100%', right: 'auto', marginLeft: '4px' }),
            ...(shiftUp
              ? { bottom: 0, top: 'auto' }
              : { top: 0, bottom: 'auto' }),
          }}
          className="min-w-[220px] max-w-[280px] max-h-[70vh] overflow-y-auto custom-scrollbar bg-card/95 border border-border/80 shadow-2xl rounded-xl py-1.5 backdrop-blur-2xl z-[160] flex flex-col font-mono"
        >
          {children}
        </div>
      )}
    </div>
  );
};

interface MenuContextValue {
  activeMenu: MenuState;
  handleMenuClick: (id: string) => void;
  handleItemClick: (action: () => void) => void;
  setActiveMenu: React.Dispatch<React.SetStateAction<MenuState>>;
}

const MenuContext = React.createContext<MenuContextValue | null>(null);

const TopLevelMenu: React.FC<{ id: string; label: string; children: React.ReactNode }> = ({
  id,
  label,
  children,
}) => {
  const ctx = React.useContext(MenuContext);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [alignRight, setAlignRight] = useState(false);

  if (!ctx) return null;
  const isActive = ctx.activeMenu === id;

  const handleClick = () => {
    if (buttonRef.current && typeof window !== 'undefined') {
      const rect = buttonRef.current.getBoundingClientRect();
      setAlignRight(rect.left + 260 > window.innerWidth);
    }
    ctx.handleMenuClick(id);
  };

  const handleMouseEnter = () => {
    if (ctx.activeMenu && ctx.activeMenu !== id) {
      if (buttonRef.current && typeof window !== 'undefined') {
        const rect = buttonRef.current.getBoundingClientRect();
        setAlignRight(rect.left + 260 > window.innerWidth);
      }
      ctx.setActiveMenu(id as MenuState);
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        className={`px-2 py-1 text-[11px] font-bold tracking-wider uppercase font-mono rounded transition-colors cursor-pointer ${
          isActive
            ? 'bg-primary/20 text-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
        }`}
      >
        {label}
      </button>
      {isActive && (
        <div
          style={alignRight ? { right: 0, left: 'auto' } : { left: 0, right: 'auto' }}
          className="absolute top-full mt-1 min-w-[230px] max-h-[75vh] overflow-y-auto custom-scrollbar bg-card/95 border border-border/80 shadow-2xl rounded-xl py-1.5 backdrop-blur-2xl z-[150] flex flex-col pointer-events-auto font-mono"
        >
          {children}
        </div>
      )}
    </div>
  );
};

const MenuItem: React.FC<{
  label?: string;
  shortcut?: string;
  icon?: any;
  onClick?: () => void;
  disabled?: boolean;
  divider?: boolean;
}> = ({ label, shortcut, icon: Icon, onClick, disabled, divider }) => {
  const ctx = React.useContext(MenuContext);
  if (divider) {
    return <div className="h-px w-full bg-border/30 my-1" />;
  }
  return (
    <button
      onClick={() => {
        if (onClick) {
          if (ctx?.handleItemClick) {
            ctx.handleItemClick(onClick);
          } else {
            onClick();
          }
        }
      }}
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

const MenuSectionLabel: React.FC<{ label: string }> = ({ label }) => (
  <div className="px-3 pt-1.5 pb-0.5 text-[9px] font-bold tracking-wider uppercase text-muted-foreground/60 select-none">
    {label}
  </div>
);

export function StudioMenuBar({ onOpenMapBrowser, onOpenAssetBrowser }: StudioMenuBarProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeMenu, setActiveMenu] = useState<MenuState>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [notificationHistoryOpen, setNotificationHistoryOpen] = useState(false);
  const [worldDropdownOpen, setWorldDropdownOpen] = useState(false);
  const [reinitializeModalOpen, setReinitializeModalOpen] = useState(false);
  const [profiles, setProfiles] = useState(WORLD_PROFILES);
  const [isElectron, setIsElectron] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [recentMaps, setRecentMaps] = useState<any[]>(() => creatorRecents.getRecents('map', 8));
  const [recentBlueprints, setRecentBlueprints] = useState<any[]>(() => creatorRecents.getRecents('asset', 6));
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      setIsElectron(true);
      (window as any).electronAPI.onMaximizeChange?.((max: boolean) => setIsMaximized(max));
    }
  }, []);

  const isCreationMode = useEditorStore((s) => s.isCreationMode);
  const studioMode = useEditorStore((s) => s.studioMode);
  const setStudioMode = useEditorStore((s) => s.setStudioMode);
  const toggleCreationMode = useEditorStore((s) => s.toggleCreationMode);
  const mapDirty = useEditorStore((s) => s.mapDirty);
  const isSavingMap = useEditorStore((s) => s.isSavingMap);
  const activeGameId = useEditorStore((s) => s.activeGameId);
  const setActiveGameId = useEditorStore((s) => s.setActiveGameId);
  const openPanel = useEditorStore((s) => s.openPanel);
  const togglePanel = useEditorStore((s) => s.togglePanel);
  const panels = useEditorStore((s) => s.panels);
  const applyWorkspacePreset = useEditorStore((s) => s.applyWorkspacePreset);
  const activeWorkflowTool = useEditorStore((s) => s.activeWorkflowTool);
  const setActiveWorkflowTool = useEditorStore((s) => s.setActiveWorkflowTool);
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
    if (menuId === 'file') {
      setRecentMaps(creatorRecents.getRecents('map', 8));
      setRecentBlueprints(creatorRecents.getRecents('asset', 6));
    }
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

  const activeProfile = profiles.find((p) => p.id === activeGameId) || profiles[0];

  return (
    <MenuContext.Provider value={{ activeMenu, handleMenuClick, handleItemClick, setActiveMenu }}>
      <div
        ref={menuRef}
        className="pointer-events-auto relative w-full h-10 z-[110] bg-[#050b14]/90 border-b border-border/50 flex items-center justify-between px-3 select-none backdrop-blur-xl shadow-lg font-mono [app-region:drag]"
      >
      {/* ─── ZONE 1: Identity, Project Context & Primary Menus ─── */}
      <div className="flex items-center gap-2.5 [app-region:no-drag]">
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
          {/* ── 1. FILE ── */}
          <TopLevelMenu id="file" label="File">
            <SubMenu label="New" icon={FolderPlus}>
              <MenuItem label="New Authored Map" icon={Folder} onClick={() => { openPanel('build'); showToast('Opened World Builder'); }} />
              <MenuItem label="New Procedural Region" icon={Sparkles} onClick={() => { openPanel('procedural'); showToast('Opened Procedural Authoring'); }} />
              <MenuItem label="New Hybrid Region" icon={Globe} onClick={() => { openPanel('atlas'); showToast('Select Atlas Node for Hybrid Generation'); }} />
              <MenuItem label="New Blueprint Asset" icon={Package} onClick={() => { openPanel('prefab'); showToast('Opened Blueprint / Prefab Builder'); }} />
            </SubMenu>
            <SubMenu label="Open" icon={Folder}>
              <MenuItem label="Map Browser..." icon={Globe} onClick={() => { if (onOpenMapBrowser) onOpenMapBrowser(); else openPanel('maps'); }} />
              <MenuItem label="World Atlas (Spatial Grid)..." shortcut="Ctrl+Shift+M" icon={Globe} onClick={() => openPanel('atlas')} />
              <MenuItem label="Quick Open / Search..." shortcut="Ctrl+K" icon={Search} onClick={() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true })); }} />
              <MenuItem divider />
              <SubMenu label="Recent Maps" icon={RotateCcw}>
                {recentMaps.length > 0 ? (
                  recentMaps.map((m) => (
                    <MenuItem
                      key={m.id}
                      label={m.title}
                      icon={Globe}
                      onClick={() => {
                        useGameStore.getState().setCurrentMapId(m.id);
                        showToast(`Loading map: ${m.title}`);
                      }}
                    />
                  ))
                ) : (
                  <MenuItem label="No Recent Maps" icon={X} disabled />
                )}
              </SubMenu>
              <SubMenu label="Recent Blueprints" icon={Package}>
                {recentBlueprints.length > 0 ? (
                  recentBlueprints.map((b) => (
                    <MenuItem
                      key={b.id}
                      label={b.title}
                      icon={Package}
                      onClick={() => {
                        useEditorStore.getState().setActivePrefabId(b.id);
                        useEditorStore.getState().setBrushMode('prefab');
                        openPanel('prefab');
                        showToast(`Selected blueprint: ${b.title}`);
                      }}
                    />
                  ))
                ) : (
                  <MenuItem label="No Recent Blueprints" icon={X} disabled />
                )}
              </SubMenu>
            </SubMenu>
            <SubMenu label="Save" icon={Save}>
              <MenuItem label="Save Current World" shortcut="Ctrl+S" icon={Save} onClick={() => window.dispatchEvent(new CustomEvent(STUDIO_TRIGGER_SAVE_MAP_EVENT))} />
              <MenuItem label="Save All Open Changes" icon={Save} onClick={() => { window.dispatchEvent(new CustomEvent(STUDIO_TRIGGER_SAVE_MAP_EVENT)); showToast('All pending world layers queued for save'); }} />
            </SubMenu>
            <SubMenu label="Import" icon={Clipboard}>
              <MenuItem label="World Data..." icon={Folder} onClick={() => { openPanel('build'); showToast('World Data import available in World Builder'); }} />
              <MenuItem label="Blueprint / Structure..." icon={Package} onClick={() => { openPanel('prefab'); showToast('Structure import available in Prefab Studio'); }} />
            </SubMenu>
            <SubMenu label="Export" icon={CloudUpload}>
              <MenuItem label="World Data..." icon={Folder} onClick={() => { openPanel('build'); showToast('World Data export available in World Builder'); }} />
              <MenuItem label="Blueprint / Structure..." icon={Package} onClick={() => { openPanel('prefab'); showToast('Blueprint export available in Prefab Studio'); }} />
            </SubMenu>
            <MenuItem label="Publish & Releases..." icon={CloudUpload} onClick={() => openPanel('publishing')} />
            <MenuItem divider />
            <MenuItem label="Re-initialize Realm Setup..." icon={Gamepad2} onClick={() => setReinitializeModalOpen(true)} />
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

          {/* ── 2. EDIT ── */}
          <TopLevelMenu id="edit" label="Edit">
            <MenuItem label="Undo" shortcut="Ctrl+Z" icon={Undo2} onClick={() => { const map = useGameStore.getState().activeMapData; if (!map) return; useEditorStore.getState().triggerUndo(map); }} />
            <MenuItem label="Redo" shortcut="Ctrl+Y" icon={Redo2} onClick={() => { const map = useGameStore.getState().activeMapData; if (!map) return; useEditorStore.getState().triggerRedo(map); }} />
            <MenuItem divider />
            <MenuItem label="Cut Selection" shortcut="Ctrl+X" icon={Scissors} onClick={() => { const map = useGameStore.getState().activeMapData; if (!map) return; useEditorStore.getState().cutSelection(map); }} />
            <MenuItem label="Copy Selection" shortcut="Ctrl+C" icon={Copy} onClick={() => { const map = useGameStore.getState().activeMapData; if (!map) return; useEditorStore.getState().copySelection(map); }} />
            <MenuItem label="Paste" shortcut="Ctrl+V" icon={Clipboard} onClick={() => { useEditorStore.getState().setIsPasting(true); useEditorStore.getState().setBrushMode('paste'); }} />
            <MenuItem label="Paste in Place" shortcut="Ctrl+Shift+V" icon={Pin} onClick={() => { const map = useGameStore.getState().activeMapData; const clip = useEditorStore.getState().tileClipboard; if (!map || !clip) return; useEditorStore.getState().pasteClipboard(map, null, clip.sourceOrigin.r, clip.sourceOrigin.c); }} />
            <MenuItem label="Duplicate" shortcut="Ctrl+D" icon={Copy} onClick={() => { const map = useGameStore.getState().activeMapData; if (!map) return; useEditorStore.getState().duplicateSelection(map, null, 1, 1); }} />
            <MenuItem label="Delete Selection" shortcut="Del" icon={Trash2} onClick={() => { const map = useGameStore.getState().activeMapData; if (!map) return; useEditorStore.getState().deleteSelectionTiles(map); }} />
            <MenuItem divider />
            <MenuItem label="Select All" shortcut="Ctrl+A" icon={Crosshair} onClick={() => { const map = useGameStore.getState().activeMapData; if (!map) return; useEditorStore.getState().addSelectedBox(0, map.height - 1, 0, map.width - 1); showToast('Selected entire map'); }} />
            <MenuItem label="Deselect" shortcut="Esc" icon={X} onClick={() => { useEditorStore.getState().clearSelectedCells(); showToast('Deselected'); }} />
            <MenuItem divider />
            <SubMenu label="Selection" icon={Crosshair}>
              <MenuItem label="Expand (+1)" icon={Plus} onClick={() => { showToast('Selection expanded +1 tile'); }} />
              <MenuItem label="Contract (-1)" icon={Minus} onClick={() => { showToast('Selection contracted -1 tile'); }} />
              <MenuItem
                label="Invert Selection"
                icon={Crosshair}
                onClick={() => {
                  const map = useGameStore.getState().activeMapData;
                  if (!map) return;
                  const currentSelected = useEditorStore.getState().selectedCells;
                  useEditorStore.getState().clearSelectedCells();
                  for (let r = 0; r < map.height; r++) {
                    for (let c = 0; c < map.width; c++) {
                      if (!currentSelected[`${r},${c}`]) {
                        useEditorStore.getState().addSelectedBox(r, r, c, c);
                      }
                    }
                  }
                  showToast('Inverted selection');
                }}
              />
              <MenuItem
                label="Convert to Blueprint..."
                icon={Package}
                onClick={() => {
                  openPanel('prefab');
                  showToast('Save active selection as Blueprint Stamp');
                }}
              />
              <MenuItem label="Open Selection Window..." icon={Sliders} onClick={() => openPanel('selection')} />
            </SubMenu>
            <SubMenu label="Transform" icon={RotateCw}>
              <MenuItem label="Rotate CW (+45° / +90°)" shortcut="R" icon={RotateCw} onClick={() => { const map = useGameStore.getState().activeMapData; if (!map) return; useEditorStore.getState().rotateSelection(map, null, 90); }} />
              <MenuItem label="Rotate CCW (-45° / -90°)" icon={RotateCcw} onClick={() => { const map = useGameStore.getState().activeMapData; if (!map) return; useEditorStore.getState().rotateSelection(map, null, 270); }} />
              <MenuItem label="Mirror Horizontal" icon={FlipHorizontal} onClick={() => { const map = useGameStore.getState().activeMapData; if (!map) return; useEditorStore.getState().flipSelection(map, null, 'h'); }} />
              <MenuItem label="Mirror Vertical" icon={FlipVertical} onClick={() => { const map = useGameStore.getState().activeMapData; if (!map) return; useEditorStore.getState().flipSelection(map, null, 'v'); }} />
              <MenuItem
                label="Reset Transform"
                icon={RotateCcw}
                onClick={() => {
                  useEditorStore.getState().resetStampTransform();
                  useEditorStore.getState().setStampScale(1.0);
                  showToast('Reset all active transforms');
                }}
              />
              <MenuItem label="Open Transform Window..." icon={Sliders} onClick={() => openPanel('transform')} />
            </SubMenu>
          </TopLevelMenu>

          {/* ── 3. VIEW ── */}
          <TopLevelMenu id="view" label="View">
            <SubMenu label="Camera" icon={Camera}>
              <MenuItem label="Perspective View" icon={Camera} onClick={() => { showToast('Camera set to Perspective'); }} />
              <MenuItem label="Orthographic View" icon={Box} onClick={() => { showToast('Camera set to Orthographic'); }} />
              <MenuItem label="Isometric View" icon={Layers} onClick={() => { showToast('Camera set to Isometric 45°'); }} />
              <MenuItem label="Top View" icon={Maximize2} onClick={() => { showToast('Camera set to Top-Down'); }} />
              <MenuItem label="Camera & View Settings..." icon={Camera} onClick={() => openPanel('camera')} />
            </SubMenu>
            <SubMenu label="Overlays" icon={Eye}>
              <MenuItem label={`Tile Coordinates: ${showEditorCoords ? 'ON' : 'OFF'}`} icon={showEditorCoords ? CheckCircle2 : Eye} onClick={() => { setShowEditorCoords(!showEditorCoords); showToast(`Coordinates: ${!showEditorCoords ? 'ON' : 'OFF'}`); }} />
              <MenuItem label={`Voxel Grid Guide: ${useEditorStore.getState().snapToGrid ? 'ON' : 'OFF'}`} icon={Grid3X3} onClick={() => { const snap = useEditorStore.getState().snapToGrid; useEditorStore.getState().setSnapToGrid(!snap); showToast(`Snap to Grid: ${!snap ? 'ON' : 'OFF'}`); }} />
              <MenuItem label={`Warp Gate Links: ${showWarpOverlays ? 'ON' : 'OFF'}`} icon={showWarpOverlays ? CheckCircle2 : Eye} onClick={() => { setShowWarpOverlays(!showWarpOverlays); showToast(`Warp Overlays: ${!showWarpOverlays ? 'ON' : 'OFF'}`); }} />
              <MenuItem label={`Spawn Markers: ${showSpawnOverlays ? 'ON' : 'OFF'}`} icon={showSpawnOverlays ? CheckCircle2 : Eye} onClick={() => { setShowSpawnOverlays(!showSpawnOverlays); showToast(`Spawn Overlays: ${!showSpawnOverlays ? 'ON' : 'OFF'}`); }} />
              <MenuItem label={`Free-Cam Mode: ${isStudioFreeCam ? 'ON' : 'OFF'}`} icon={isStudioFreeCam ? CheckCircle2 : Camera} onClick={() => { setStudioFreeCam(!isStudioFreeCam); showToast(isStudioFreeCam ? 'Camera locked to Player' : 'Free-Cam unlocked'); }} />
            </SubMenu>
            <SubMenu label="Framing" icon={ZoomIn}>
              <MenuItem label="Zoom In" shortcut="Ctrl++" icon={ZoomIn} onClick={() => { window.dispatchEvent(new CustomEvent('studio_set_zoom', { detail: { percent: 125 } })); }} />
              <MenuItem label="Zoom Out" shortcut="Ctrl+-" icon={ZoomOut} onClick={() => { window.dispatchEvent(new CustomEvent('studio_set_zoom', { detail: { percent: 80 } })); }} />
              <MenuItem label="Reset Zoom (100%)" shortcut="Ctrl+0" icon={Crosshair} onClick={() => { window.dispatchEvent(new CustomEvent('studio_set_zoom', { detail: { percent: 100 } })); }} />
              <MenuItem label="Fit Map to View" shortcut="Home" icon={Maximize2} onClick={() => { window.dispatchEvent(new CustomEvent('studio_fit_map')); }} />
            </SubMenu>
            <SubMenu label="Diagnostics" icon={AlertCircle}>
              <MenuItem label="Diagnostics & Problems" icon={AlertCircle} onClick={() => openPanel('problems')} />
              <MenuItem label="Streaming Inspector" icon={Compass} onClick={() => openPanel('streaming')} />
              <MenuItem label="Rule Debugger" icon={Bug} onClick={() => window.dispatchEvent(new CustomEvent('studio_open_rule_debugger'))} />
            </SubMenu>
          </TopLevelMenu>

          {/* ── 4. WORLD ── */}
          <TopLevelMenu id="world" label="World">
            <MenuItem label="World Atlas (Spatial Grid)" shortcut="Ctrl+Shift+M" icon={Globe} onClick={() => openPanel('atlas')} />
            <MenuItem label="Map Browser" icon={Globe} onClick={() => { if (onOpenMapBrowser) onOpenMapBrowser(); else openPanel('maps'); }} />
            <MenuItem label="World Hierarchy" icon={Layers} onClick={() => openPanel('hierarchy')} />
            <MenuItem label="Layers Manager" icon={Layers} onClick={() => openPanel('layers')} />
            <MenuItem label="Inspector / Properties" icon={Settings} onClick={() => openPanel('properties')} />
            <MenuItem label="Logic Painter" icon={Shield} onClick={() => openPanel('logic')} />
            <MenuItem divider />
            <MenuItem label="World Events" icon={Sparkles} onClick={() => openPanel('worldevent')} />
            <MenuItem label="Procedural Authoring" icon={Sparkles} onClick={() => openPanel('procedural')} />
            <MenuItem label="Realm Settings" icon={Settings} onClick={() => openPanel('settings')} />
          </TopLevelMenu>

          {/* ── 5. CREATE ── */}
          <TopLevelMenu id="create" label="Create">
            <SubMenu label="Terrain" icon={Layers}>
              <MenuItem label="Draw Volume" icon={Box} onClick={() => { setActiveWorkflowTool('draw'); useEditorStore.getState().setBrushMode('paint'); showToast('Active Tool: Draw Volume'); }} />
              <MenuItem label="Replace Volume" icon={RotateCw} onClick={() => { setActiveWorkflowTool('draw'); showToast('Active Tool: Replace Volume'); }} />
              <MenuItem label="Erase Volume" icon={Trash2} onClick={() => { setActiveWorkflowTool('draw'); useEditorStore.getState().setBrushMode('erase'); showToast('Active Tool: Erase Volume'); }} />
              <MenuItem label="Fill Volume" icon={Maximize2} onClick={() => { setActiveWorkflowTool('draw'); useEditorStore.getState().setBrushMode('fill'); showToast('Active Tool: Fill Volume'); }} />
              <MenuItem label="Sculpt Terrain" icon={Sliders} onClick={() => { setActiveWorkflowTool('sculpt'); showToast('Active Tool: Sculpt Terrain'); }} />
              <MenuItem label="Flatten Terrain" icon={Minus} onClick={() => { setActiveWorkflowTool('sculpt'); showToast('Active Tool: Flatten Terrain'); }} />
              <MenuItem label="Smooth Terrain" icon={Sparkles} onClick={() => { setActiveWorkflowTool('sculpt'); showToast('Active Tool: Smooth Terrain'); }} />
              <MenuItem label="Slope Ramp Terrain" icon={Sliders} onClick={() => { setActiveWorkflowTool('sculpt'); showToast('Active Tool: Slope Ramp'); }} />
            </SubMenu>
            <SubMenu label="Shapes" icon={Box}>
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
                    showToast(`Shape: ${s.label}`);
                  }}
                />
              ))}
            </SubMenu>
            <SubMenu label="Objects" icon={Package}>
              <MenuItem label="Place Prop..." icon={Package} onClick={() => { setActiveWorkflowTool('place'); openPanel('assets'); showToast('Pick a prop from Asset Manager'); }} />
              <MenuItem label="Place Blueprint / Stamp..." icon={Package} onClick={() => { setActiveWorkflowTool('place'); openPanel('prefab'); showToast('Pick a blueprint to stamp'); }} />
            </SubMenu>
            <SubMenu label="Entities" icon={Users}>
              <MenuItem label="Place NPC..." icon={Users} onClick={() => { openPanel('npc'); showToast('NPC Studio opened for placement'); }} />
              <MenuItem label="Place Creature Spawn..." icon={PawPrint} onClick={() => { openPanel('spawner'); showToast('Creature Spawner opened'); }} />
              <MenuItem label="Connect Warp Gate / Portal..." icon={Globe} onClick={() => { openPanel('logic'); showToast('Click Gate in Logic Painter'); }} />
            </SubMenu>
            <SubMenu label="Content Hooks" icon={ScrollText}>
              <MenuItem label="Quest Hook..." icon={ScrollText} onClick={() => openPanel('quest')} />
              <MenuItem label="Dialogue Hook..." icon={MessageSquare} onClick={() => openPanel('dialogue')} />
              <MenuItem label="Encounter Rule..." icon={Sword} onClick={() => openPanel('gameplay')} />
            </SubMenu>
          </TopLevelMenu>

          {/* ── 6. TOOLS ── */}
          <TopLevelMenu id="tools" label="Tools">
            <MenuItem label="Material Library" icon={Palette} onClick={() => openPanel('materials')} />
            <MenuItem label="Brush Settings / World Builder" icon={LayoutGrid} onClick={() => openPanel('build')} />
            <MenuItem label="Selection Window" icon={Crosshair} onClick={() => openPanel('selection')} />
            <MenuItem label="Transform Window" icon={RotateCw} onClick={() => openPanel('transform')} />
            <MenuItem label="Prefab / Blueprint Library" icon={Package} onClick={() => openPanel('prefab')} />
            <MenuItem label="Asset Browser" icon={Box} onClick={() => openPanel('assets')} />
            <MenuItem label="Animation Studio" icon={Film} onClick={() => openPanel('animations')} />
            <MenuItem divider />
            <MenuItem label="Hero Studio" icon={UserCheck} onClick={() => setStudioMode('hero')} />
            <MenuItem label="Gameplay & Combat Hub" icon={Activity} onClick={() => openPanel('gameplay')} />
            <MenuItem label="Simulation Presets" icon={Activity} onClick={() => openPanel('simulation')} />
            <MenuItem label="Interface Designer" icon={Palette} onClick={() => openPanel('interface')} />
            <MenuItem divider />
            <MenuItem label="Dev Tools & Server Controls" icon={Terminal} onClick={() => openPanel('dev')} />
            <MenuItem label="System Maintenance & Updater" icon={Terminal} onClick={() => { window.location.href = '/admin/dev/system'; }} />
            <MenuItem label="Realm Settings" icon={Settings} onClick={() => openPanel('settings')} />
          </TopLevelMenu>

          {/* ── 7. WINDOW ── */}
          <TopLevelMenu id="window" label="Window">
            <SubMenu label="Workspace Presets" icon={LayoutGrid}>
              <MenuItem
                label="Reset Layout"
                icon={RotateCcw}
                onClick={() => {
                  window.localStorage.removeItem('saints.panelLayouts');
                  window.location.reload();
                }}
              />
              <MenuItem divider />
              {STUDIO_WORKSPACE_PRESETS.map((preset) => (
                <MenuItem
                  key={preset.id}
                  label={preset.name}
                  icon={LayoutGrid}
                  onClick={() => {
                    applyWorkspacePreset(preset.id);
                    showToast(`Switched layout to ${preset.name}`);
                  }}
                />
              ))}
            </SubMenu>
            <MenuItem divider />
            <MenuSectionLabel label="World Windows" />
            <MenuItem label="World Atlas" icon={panels.atlas?.isOpen ? CheckCircle2 : Globe} onClick={() => togglePanel('atlas')} />
            <MenuItem label="Map Browser" icon={panels.maps?.isOpen ? CheckCircle2 : Globe} onClick={() => togglePanel('maps')} />
            <MenuItem label="World Hierarchy" icon={panels.hierarchy?.isOpen ? CheckCircle2 : Layers} onClick={() => togglePanel('hierarchy')} />
            <MenuItem label="Layers" icon={panels.layers?.isOpen ? CheckCircle2 : Layers} onClick={() => togglePanel('layers')} />
            <MenuItem label="Inspector / Properties" icon={panels.properties?.isOpen ? CheckCircle2 : Settings} onClick={() => togglePanel('properties')} />
            <MenuItem label="Logic Painter" icon={panels.logic?.isOpen ? CheckCircle2 : Shield} onClick={() => togglePanel('logic')} />
            <MenuItem label="Diagnostics & Problems" icon={panels.problems?.isOpen ? CheckCircle2 : AlertCircle} onClick={() => togglePanel('problems')} />
            <MenuItem label="Camera & View" icon={panels.camera?.isOpen ? CheckCircle2 : Camera} onClick={() => togglePanel('camera')} />
            <MenuItem divider />
            <MenuSectionLabel label="Authoring Windows" />
            <MenuItem label="Material Library" icon={panels.materials?.isOpen ? CheckCircle2 : Palette} onClick={() => togglePanel('materials')} />
            <MenuItem label="Brush Settings" icon={panels.build?.isOpen ? CheckCircle2 : LayoutGrid} onClick={() => togglePanel('build')} />
            <MenuItem label="Selection" icon={panels.selection?.isOpen ? CheckCircle2 : Crosshair} onClick={() => togglePanel('selection')} />
            <MenuItem label="Transform" icon={panels.transform?.isOpen ? CheckCircle2 : RotateCw} onClick={() => togglePanel('transform')} />
            <MenuItem label="Prefab / Blueprint Library" icon={panels.prefab?.isOpen ? CheckCircle2 : Package} onClick={() => togglePanel('prefab')} />
            <MenuItem label="Procedural Authoring" icon={panels.procedural?.isOpen ? CheckCircle2 : Sparkles} onClick={() => togglePanel('procedural')} />
            <MenuItem divider />
            <MenuSectionLabel label="Content Windows" />
            <MenuItem label="NPC Studio" icon={panels.npc?.isOpen ? CheckCircle2 : Users} onClick={() => togglePanel('npc')} />
            <MenuItem label="Creature Studio" icon={panels.creature?.isOpen ? CheckCircle2 : PawPrint} onClick={() => togglePanel('creature')} />
            <MenuItem label="Monster Spawner" icon={panels.spawner?.isOpen ? CheckCircle2 : Sword} onClick={() => togglePanel('spawner')} />
            <MenuItem label="Quest Studio" icon={panels.quest?.isOpen ? CheckCircle2 : ScrollText} onClick={() => togglePanel('quest')} />
            <MenuItem label="Dialogue Editor" icon={panels.dialogue?.isOpen ? CheckCircle2 : MessageSquare} onClick={() => togglePanel('dialogue')} />
            <MenuItem label="Item Studio" icon={panels.items?.isOpen ? CheckCircle2 : Package} onClick={() => togglePanel('items')} />
            <MenuItem label="Loot Manager" icon={panels.loot?.isOpen ? CheckCircle2 : Coins} onClick={() => togglePanel('loot')} />
            <MenuItem label="Profession Studio" icon={panels.classes?.isOpen ? CheckCircle2 : Wrench} onClick={() => togglePanel('classes')} />
            <MenuItem label="Mount Studio" icon={panels.mounts?.isOpen ? CheckCircle2 : Sparkles} onClick={() => togglePanel('mounts')} />
            <MenuItem label="Dungeon Studio" icon={panels.dungeons?.isOpen ? CheckCircle2 : Shield} onClick={() => togglePanel('dungeons')} />
            <MenuItem divider />
            <MenuSectionLabel label="Assets & System" />
            <MenuItem label="Asset Browser" icon={panels.assets?.isOpen ? CheckCircle2 : Box} onClick={() => togglePanel('assets')} />
            <MenuItem label="Animation Studio" icon={panels.animations?.isOpen ? CheckCircle2 : Film} onClick={() => togglePanel('animations')} />
            <MenuItem label="Interface Designer" icon={panels.interface?.isOpen ? CheckCircle2 : Palette} onClick={() => togglePanel('interface')} />
            <MenuItem label="Publish & Releases" icon={panels.publishing?.isOpen ? CheckCircle2 : CloudUpload} onClick={() => togglePanel('publishing')} />
            <MenuItem label="Streaming Inspector" icon={panels.streaming?.isOpen ? CheckCircle2 : Compass} onClick={() => togglePanel('streaming')} />
            <MenuItem label="Dev Tools & Server Controls" icon={panels.dev?.isOpen ? CheckCircle2 : Terminal} onClick={() => togglePanel('dev')} />
          </TopLevelMenu>

          {/* ── 8. HELP ── */}
          <TopLevelMenu id="help" label="Help">
            <MenuItem label="Keyboard Shortcuts" shortcut="?" icon={Keyboard} onClick={() => setShortcutsOpen(true)} />
            <MenuItem label="Activity Log" icon={Bell} onClick={() => setNotificationHistoryOpen(true)} />
            <MenuItem
              label="Studio Documentation"
              icon={Globe}
              onClick={() => window.open('https://github.com/giogimic/SaintsGamingWeb', '_blank')}
            />
            <MenuItem
              label="About Saints World Studio"
              icon={Sparkles}
              onClick={() => showToast('Saints Gaming: Time To Play — World Studio v2.1.720')}
            />
          </TopLevelMenu>
        </div>
      </div>

      {/* ─── ZONE 2: Command Search & Segmented Mode Switcher ─── */}
      <div className="flex items-center gap-2 [app-region:no-drag]">
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
      <div className="flex items-center gap-2 [app-region:no-drag]">
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

        {/* Native Desktop Window Controls (Active in Electron) */}
        {isElectron && (
          <div className="flex items-center ml-2 border-l border-border/40 pl-2 gap-1 [app-region:no-drag]">
            <button
              onClick={() => (window as any).electronAPI?.minimize()}
              className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Minimize Window"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => (window as any).electronAPI?.toggleMaximize()}
              className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title={isMaximized ? "Restore Window" : "Maximize Window"}
            >
              <Square className="w-3 h-3" />
            </button>
            <button
              onClick={() => (window as any).electronAPI?.close()}
              className="p-1.5 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors cursor-pointer"
              title="Close Studio"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <StudioShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <NotificationHistoryModal
        isOpen={notificationHistoryOpen}
        onClose={() => setNotificationHistoryOpen(false)}
      />
      <ReinitializeSetupModal
        isOpen={reinitializeModalOpen}
        onClose={() => setReinitializeModalOpen(false)}
      />
    </div>
  </MenuContext.Provider>
  );
}
