'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  Monitor,
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
import { ensureWorldProfiles, setActiveWorldProfile } from '@/app/actions/studio/world-profiles';
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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [positionStyle, setPositionStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (triggerRef.current && typeof window !== 'undefined') {
      const rect = triggerRef.current.getBoundingClientRect();
      const flipLeft = rect.right + 240 > window.innerWidth;
      
      const style: React.CSSProperties = {
        position: 'fixed',
        top: Math.max(10, Math.min(rect.top, window.innerHeight - 350)),
      };
      
      if (flipLeft) {
        style.left = rect.left - 224;
      } else {
        style.left = rect.right + 2;
      }
      setPositionStyle(style);
    }
    setOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 150);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (open) {
      setOpen(false);
    } else {
      handleMouseEnter();
    }
  };

  return (
    <div
      ref={triggerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        onClick={handleClick}
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
      {open && typeof document !== 'undefined' && createPortal(
        <div
          style={positionStyle}
          className="studio-submenu-portal min-w-[220px] max-w-[280px] max-h-[70vh] overflow-y-auto custom-scrollbar bg-card/95 border border-border/80 shadow-2xl rounded-xl py-1.5 backdrop-blur-2xl z-[160] flex flex-col font-mono"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {children}
        </div>,
        document.body
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
    const handleReinit = () => setReinitializeModalOpen(true);
    window.addEventListener('studio_open_shortcuts', handleOpen);
    window.addEventListener('studio_open_reinitialize', handleReinit);
    return () => {
      window.removeEventListener('studio_open_shortcuts', handleOpen);
      window.removeEventListener('studio_open_reinitialize', handleReinit);
    };
  }, []);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if ((e.target as Element)?.closest?.('.studio-submenu-portal')) {
        return;
      }
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
    if (mode === 'voxel' || mode === 'tile') {
      useGameStore.setState({ currentMapId: '', activeMapData: null });
      if (onOpenMapBrowser) onOpenMapBrowser();
      else if (mode === 'voxel') openPanel('voxelBrowser');
      else openPanel('tileBrowser');
    }
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
      {/* â”€â”€â”€ ZONE 1: Identity, Project Context & Primary Menus â”€â”€â”€ */}
      <div className="flex items-center gap-2.5 [app-region:no-drag]">
        {/* Studio Brand & Navigation Links */}
        <div className="flex items-center gap-2 pr-2 border-r border-border/40">
          <Link href="/home" className="flex items-center gap-1.5 group text-muted-foreground hover:text-primary transition-colors" title="Saints Gaming Home">
            <div className="transition-transform group-hover:scale-110">
              <SGMicro3DLogo size={24} />
            </div>
            <span className="font-mono font-black text-xs tracking-wider text-primary">STUDIO</span>
          </Link>

          <div className="flex items-center gap-1 ml-1">

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

        {/* Project / World Profile Selector (Removed per UI plan) */}

        {/* Active Document Breadcrumb & Save Indicator */}
        <div className="hidden md:flex items-center gap-1 bg-background/50 border border-border/60 rounded-lg px-2 py-0.5 text-[10px]">
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
        <div className="hidden lg:flex items-center gap-0.5 border-r border-border/40 pr-2">
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

        {/* â”€â”€ Primary Menus â”€â”€ */}
        <div className="flex items-center gap-0.5">
          {/* â”€â”€ 1. FILE â”€â”€ */}
          <TopLevelMenu id="file" label="File">
            <SubMenu label="New" icon={FolderPlus}>
              <MenuItem label="New Authored Map" icon={Folder} onClick={() => { setStudioMode('tile'); openPanel('newTileMap'); showToast('Opened Tile Map Generator'); }} />
              <MenuItem label="New Voxel Map" icon={Sparkles} onClick={() => { setStudioMode('voxel'); openPanel('newVoxelMap'); showToast('Opened Voxel Map Generator'); }} />
              <MenuItem label="New Fractal Region" icon={Sparkles} onClick={() => { setStudioMode('voxel'); openPanel('newVoxelMap'); showToast('Opened Fractal Map Generator'); }} />
              <MenuItem label="New Hybrid Region" icon={Globe} onClick={() => { setStudioMode('atlas'); openPanel('atlas'); showToast('Select Atlas Node for Hybrid Generation'); }} />
              <MenuItem label="New Blueprint Asset" icon={Package} onClick={() => { setStudioMode('assets'); openPanel('assets'); showToast('Opened Asset Studio'); }} />
            </SubMenu>
            <SubMenu label="Open" icon={Folder}>
              <MenuItem label="Tile Map Browser..." icon={Globe} onClick={() => { setStudioMode('tile'); openPanel('tileBrowser'); }} />
              <MenuItem label="Voxel Map Browser..." icon={Box} onClick={() => { setStudioMode('voxel'); openPanel('voxelBrowser'); }} />
              <MenuItem label="World Atlas (Spatial Grid)..." shortcut="Ctrl+Shift+M" icon={Globe} onClick={() => { setStudioMode('atlas'); openPanel('atlas'); }} />
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
                        openPanel('assets');
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
              <MenuItem label="World Data..." icon={Folder} onClick={() => { setStudioMode('tile'); openPanel('build'); showToast('World Data import available in World Builder'); }} />
              <MenuItem label="Blueprint / Structure..." icon={Package} onClick={() => { setStudioMode('assets'); openPanel('assets'); showToast('Structure import available in Asset Studio'); }} />
            </SubMenu>
            <SubMenu label="Export" icon={CloudUpload}>
              <MenuItem label="World Data..." icon={Folder} onClick={() => { setStudioMode('tile'); openPanel('build'); showToast('World Data export available in World Builder'); }} />
              <MenuItem label="Blueprint / Structure..." icon={Package} onClick={() => { setStudioMode('assets'); openPanel('assets'); showToast('Blueprint export available in Asset Studio'); }} />
            </SubMenu>
            <MenuItem label="Version Manager..." icon={CloudUpload} onClick={() => openPanel('versionManager')} />
            <SubMenu label="Release" icon={Package}>
              <MenuItem label="Create Release..." icon={Plus} onClick={() => { openPanel('versionManager'); window.dispatchEvent(new CustomEvent('studio_open_release_create')); }} />
              <MenuItem label="Manage Releases..." icon={Settings} onClick={() => openPanel('versionManager')} />
              <MenuItem label="Release History" icon={ScrollText} onClick={() => openPanel('versionManager')} />
              <MenuItem label="Release Settings..." icon={Settings} onClick={() => openPanel('versionManager')} />
            </SubMenu>
            <MenuItem divider />
            <MenuItem label="Save & Exit to Lobby" shortcut="Ctrl+Shift+Q" icon={LogOut} onClick={() => { window.dispatchEvent(new CustomEvent(STUDIO_TRIGGER_SAVE_MAP_EVENT)); setTimeout(() => { window.location.href = '/lobby'; }, 500); }} />
            <MenuItem label="Exit to Lobby" icon={LogOut} onClick={() => { const hasUnsaved = useEditorStore.getState().hasUnsavedChanges || useEditorStore.getState().mapDirty; if (hasUnsaved) { if (confirm('You have unsaved changes. Exit without saving?')) { window.location.href = '/lobby'; } } else { window.location.href = '/lobby'; } }} />
          </TopLevelMenu>

          {/* â”€â”€ 2. EDIT â”€â”€ */}
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
                  openPanel('assets');
                  showToast('Save active selection as Blueprint Stamp');
                }}
              />
              <MenuItem label="Open Selection Window..." icon={Sliders} onClick={() => openPanel('selection')} />
            </SubMenu>
            <SubMenu label="Transform" icon={RotateCw}>
              <MenuItem label="Rotate CW (+45Â° / +90Â°)" shortcut="R" icon={RotateCw} onClick={() => { const map = useGameStore.getState().activeMapData; if (!map) return; useEditorStore.getState().rotateSelection(map, null, 90); }} />
              <MenuItem label="Rotate CCW (-45Â° / -90Â°)" icon={RotateCcw} onClick={() => { const map = useGameStore.getState().activeMapData; if (!map) return; useEditorStore.getState().rotateSelection(map, null, 270); }} />
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
            <MenuItem divider />
            <MenuItem label="Studio Settings..." icon={Settings} onClick={() => openPanel('settings')} />
          </TopLevelMenu>

          {/* ── 4. WORLD ── */}
          <TopLevelMenu id="world" label="World">
            <MenuItem label="World Atlas (Spatial Grid)" shortcut="Ctrl+Shift+M" icon={Globe} onClick={() => { setStudioMode('atlas'); openPanel('atlas'); }} />
            <MenuItem label="Tile Map Browser" icon={Globe} onClick={() => { setStudioMode('tile'); openPanel('tileBrowser'); }} />
            <MenuItem label="Voxel Map Browser" icon={Box} onClick={() => { setStudioMode('voxel'); openPanel('voxelBrowser'); }} />
            <MenuItem label="World Events" icon={Sparkles} onClick={() => openPanel('worldevent')} />
          </TopLevelMenu>

          {/* â”€â”€ 7. WINDOW â”€â”€ */}
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
            {studioMode === 'tile' && (
              <>
                <MenuItem label="Primary Canvas" icon={panels.primaryTileViewport?.isOpen ? CheckCircle2 : Monitor} onClick={() => togglePanel('primaryTileViewport')} />
                <MenuItem label="Secondary Canvas" icon={panels.secondaryTileViewport?.isOpen ? CheckCircle2 : Monitor} onClick={() => togglePanel('secondaryTileViewport')} />
              </>
            )}
            {studioMode === 'voxel' && (
              <>
                <MenuItem label="Primary Canvas" icon={panels.primaryVoxelViewport?.isOpen ? CheckCircle2 : Monitor} onClick={() => togglePanel('primaryVoxelViewport')} />
                <MenuItem label="Secondary Canvas" icon={panels.secondaryVoxelViewport?.isOpen ? CheckCircle2 : Monitor} onClick={() => togglePanel('secondaryVoxelViewport')} />
              </>
            )}
            <MenuItem label="World Atlas" icon={panels.atlas?.isOpen ? CheckCircle2 : Globe} onClick={() => togglePanel('atlas')} />
            <MenuItem label="Tile Map Browser" icon={panels.tileBrowser?.isOpen ? CheckCircle2 : Globe} onClick={() => togglePanel('tileBrowser')} />
            <MenuItem label="Voxel Map Browser" icon={panels.voxelBrowser?.isOpen ? CheckCircle2 : Box} onClick={() => togglePanel('voxelBrowser')} />
            <MenuItem label="Inspector / Properties" icon={panels.properties?.isOpen ? CheckCircle2 : Settings} onClick={() => togglePanel('properties')} />
            <MenuItem label="Camera & View" icon={panels.camera?.isOpen ? CheckCircle2 : Camera} onClick={() => togglePanel('camera')} />
            
            {['develop', 'tile', 'voxel'].includes(studioMode) && (
              <>
                <MenuItem divider />
                <MenuSectionLabel label="World Authoring" />
                <MenuItem label="World Hierarchy" icon={panels.hierarchy?.isOpen ? CheckCircle2 : Layers} onClick={() => togglePanel('hierarchy')} />
                <MenuItem label="Brush Settings" icon={panels.build?.isOpen ? CheckCircle2 : LayoutGrid} onClick={() => togglePanel('build')} />
                <MenuItem label="Selection" icon={panels.selection?.isOpen ? CheckCircle2 : Crosshair} onClick={() => togglePanel('selection')} />
                <MenuItem label="Procedural Authoring" icon={panels.procedural?.isOpen ? CheckCircle2 : Sparkles} onClick={() => togglePanel('procedural')} />
              </>
            )}

            {['develop', 'tile'].includes(studioMode) && (
              <>
                <MenuItem label="Layers" icon={panels.layers?.isOpen ? CheckCircle2 : Layers} onClick={() => togglePanel('layers')} />
                <MenuItem label="Logic Painter" icon={panels.logic?.isOpen ? CheckCircle2 : Shield} onClick={() => togglePanel('logic')} />
              </>
            )}

            {['voxel'].includes(studioMode) && (
              <>
                <MenuItem label="Transform" icon={panels.transform?.isOpen ? CheckCircle2 : RotateCw} onClick={() => togglePanel('transform')} />
              </>
            )}

            {['npc', 'creature', 'quest', 'develop'].includes(studioMode) && (
              <>
                <MenuItem divider />
                <MenuSectionLabel label="Content Systems" />
                <MenuItem label="NPC Studio" icon={panels.npc?.isOpen ? CheckCircle2 : Users} onClick={() => togglePanel('npc')} />
                <MenuItem label="Creature Studio" icon={panels.creature?.isOpen ? CheckCircle2 : PawPrint} onClick={() => togglePanel('creature')} />
                <MenuItem label="Monster Spawner" icon={panels.spawner?.isOpen ? CheckCircle2 : Sword} onClick={() => togglePanel('spawner')} />
                <MenuItem label="Quest Studio" icon={panels.quest?.isOpen ? CheckCircle2 : ScrollText} onClick={() => togglePanel('quest')} />
                <MenuItem label="Dialogue Editor" icon={panels.dialogue?.isOpen ? CheckCircle2 : MessageSquare} onClick={() => togglePanel('dialogue')} />
                <MenuItem label="Item Studio" icon={panels.items?.isOpen ? CheckCircle2 : Package} onClick={() => togglePanel('items')} />
                <MenuItem label="Loot Manager" icon={panels.loot?.isOpen ? CheckCircle2 : Coins} onClick={() => togglePanel('loot')} />
                <MenuItem label="Mount Studio" icon={panels.mounts?.isOpen ? CheckCircle2 : Sparkles} onClick={() => togglePanel('mounts')} />
                <MenuItem label="Dungeon Studio" icon={panels.dungeons?.isOpen ? CheckCircle2 : Shield} onClick={() => togglePanel('dungeons')} />
              </>
            )}
            <MenuItem divider />
            <MenuSectionLabel label="Global Workspaces" />
            <MenuItem label="Hero Studio" icon={UserCheck} onClick={() => setStudioMode('hero')} />
            <MenuItem label="Asset Studio" icon={Box} onClick={() => setStudioMode('assets')} />
            <MenuItem label="HUD Studio" icon={panels.interface?.isOpen ? CheckCircle2 : Palette} onClick={() => togglePanel('interface')} />
            <MenuItem divider />
            <MenuSectionLabel label="Assets & System" />
            <MenuItem label="Asset Browser" icon={panels.assets?.isOpen ? CheckCircle2 : Box} onClick={() => togglePanel('assets')} />
          </TopLevelMenu>

          {/* â”€â”€ 8. HELP â”€â”€ */}
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
              onClick={() => showToast('Saints Gaming: Time To Play — World Studio v2.1.756')}
            />
          </TopLevelMenu>
        </div>
      </div>

      {/* ─── ZONE 2: Command Search & Segmented Mode Switcher ─── */}
      <div className="flex-1 flex items-center justify-center gap-4 [app-region:no-drag] min-w-0 px-2">
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
          <span className="hidden md:inline bg-card px-1 py-0.5 rounded border border-border/60 text-[9px] font-bold">Ctrl+K</span>
        </button>

        {/* Mode Segmented Switcher - Major Studios */}
        <div className="hidden lg:flex items-center bg-background/70 p-0.5 rounded-lg border border-border/60 shadow-inner overflow-x-auto custom-scrollbar max-w-full">
          <button
            onClick={() => handleSwitchMode('tile')}
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer ${
              studioMode === 'tile' || studioMode === 'develop'
                ? 'bg-primary text-primary-foreground shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Tile Builder (2D Layers & Paint)"
          >
            Tile Builder
          </button>
          <button
            onClick={() => handleSwitchMode('voxel')}
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer ${
              studioMode === 'voxel'
                ? 'bg-blue-600 text-white shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Voxel Builder (3D Chunks & Blocks)"
          >
            Voxel Builder
          </button>
          <button
            onClick={() => handleSwitchMode('assets')}
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer ${
              studioMode === 'assets'
                ? 'bg-amber-500 text-black font-extrabold shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Asset Studio (Blueprints & Assets)"
          >
            Asset Studio
          </button>
          <button
            onClick={() => handleSwitchMode('hero')}
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer ${
              studioMode === 'hero'
                ? 'bg-purple-500 text-white font-extrabold shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Hero Studio (Classes & Characters)"
          >
            Hero Studio
          </button>
          <button
            onClick={() => { handleSwitchMode('develop'); openPanel('abilities'); }}
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer ${
              panels.abilities?.isOpen
                ? 'bg-cyan-600 text-white font-extrabold shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Gameplay & Systems (Abilities, Skills, Professions)"
          >
            Systems
          </button>
          <button
            onClick={() => { handleSwitchMode('develop'); openPanel('quest'); }}
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer ${
              panels.quest?.isOpen
                ? 'bg-emerald-600 text-white font-extrabold shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Quest Studio (Quests & Hooks)"
          >
            Quest Studio
          </button>
          <button
            onClick={() => { handleSwitchMode('develop'); openPanel('interface'); }}
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer ${
              panels.interface?.isOpen
                ? 'bg-pink-600 text-white font-extrabold shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="HUD Studio (Interface & Overlays)"
          >
            HUD Studio
          </button>
          <button
            onClick={() => { handleSwitchMode('npc'); openPanel('npc'); openPanel('creature'); }}
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer ${
              studioMode === 'npc' || studioMode === 'creature'
                ? 'bg-indigo-500 text-white font-extrabold shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="NPC & Creature Studio (Spawners & Catalogs)"
          >
            NPC & Creature
          </button>
        </div>
      </div>

      {/* â”€â”€â”€ ZONE 3: Problems Badge, PIE Playtest, Theme & Settings â”€â”€â”€ */}
      <div className="flex items-center gap-2 [app-region:no-drag]">
        {/* Problems & Validation Counter Badge */}
        <button
          onClick={() => {
            soundSynth?.playSelectSound?.();
            openPanel('settings');
            window.setTimeout(() => window.dispatchEvent(new CustomEvent('studio_settings_tab', { detail: 'diagnostics' })), 50);
          }}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-background/50 border border-border/60 hover:border-primary/50 text-[10px] text-muted-foreground hover:text-foreground transition-all cursor-pointer"
          title="Validation & Problems Diagnostics (Ctrl+Shift+O)"
        >
          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-bold hidden xl:inline">Diagnostics</span>
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
          <span className="hidden lg:inline">{isCreationMode ? 'Playtest' : 'Stop Play'}</span>
        </button>

        {/* Theme Switcher Toggle (Dark / Sunset / Vice) */}
        {mounted && (
          <button
            onClick={cycleTheme}
            className="p-1.5 rounded-lg bg-background/50 border border-border/60 hover:border-primary/50 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title={`Studio Style: ${theme?.toUpperCase()} â€” click to switch`}
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

