'use client';

import React from 'react';
import { useEditorStore } from './editor-store';
import { useGameStore } from '../store';
import {
  Crosshair,
  Box,
  Mountain,
  RotateCw,
  Package,
  Sparkles,
  Layers,
  Palette,
  Settings,
  Grid3X3,
  Sliders,
  Check,
  Lock,
  Unlock,
  Dice5,
  Trash2,
  Square,
  Circle,
  Wand2,
  FlipHorizontal,
  FlipVertical,
  ZoomIn,
  ZoomOut,
  Maximize2,
  LayoutGrid,
  Shield,
  Users,
  Sword,
  ScrollText,
  PawPrint,
  Coins,
} from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';

import { STUDIO_MODE_DEFAULTS, type StudioDockId } from '@/shared/game/studioModes';

const WORKFLOW_TOOLS = [
  { id: 'select', label: 'Select', icon: Crosshair },
  { id: 'draw', label: 'Draw', icon: Box },
  { id: 'sculpt', label: 'Sculpt', icon: Mountain },
  { id: 'transform', label: 'Transform', icon: RotateCw },
  { id: 'place', label: 'Place', icon: Package },
  { id: 'procedural', label: 'Procedural', icon: Sparkles },
] as const;

const DOCK_ICONS: Partial<Record<StudioDockId, { icon: any; label: string }>> = {
  build: { icon: LayoutGrid, label: 'Brush Settings' },
  layers: { icon: Layers, label: 'Layers' },
  hierarchy: { icon: Layers, label: 'Hierarchy' },
  logic: { icon: Shield, label: 'Logic Painter' },
  materials: { icon: Palette, label: 'Materials' },
  transform: { icon: RotateCw, label: 'Transform' },
  selection: { icon: Crosshair, label: 'Selection' },
  npc: { icon: Users, label: 'NPCs' },
  properties: { icon: Settings, label: 'Properties' },
  assets: { icon: Package, label: 'Assets' },
  spawner: { icon: Sword, label: 'Spawner' },
  quest: { icon: ScrollText, label: 'Quests' },
  creature: { icon: PawPrint, label: 'Creatures' },
  loot: { icon: Coins, label: 'Loot' },
  items: { icon: Package, label: 'Items' },
  procedural: { icon: Sparkles, label: 'Procedural' }
};

export function StudioContextualBar() {
  const studioMode = useEditorStore((s) => s.studioMode);
  const activeWorkflowTool = useEditorStore((s) => s.activeWorkflowTool);
  const setActiveWorkflowTool = useEditorStore((s) => s.setActiveWorkflowTool);
  const openPanel = useEditorStore((s) => s.openPanel);
  const togglePanel = useEditorStore((s) => s.togglePanel);
  const panels = useEditorStore((s) => s.panels);

  // Voxel / Tool properties
  const activeVoxelMaterialId = useEditorStore((s) => s.activeVoxelMaterialId);
  const activeVoxelShape = useEditorStore((s) => s.activeVoxelShape);
  const setActiveVoxelShape = useEditorStore((s) => s.setActiveVoxelShape);
  const voxelPlaneLockEnabled = useEditorStore((s) => s.voxelPlaneLockEnabled);
  const setVoxelPlaneLockEnabled = useEditorStore((s) => s.setVoxelPlaneLockEnabled);
  const voxelTargetPlaneY = useEditorStore((s) => s.voxelTargetPlaneY);
  const voxelBlockSizePx = useEditorStore((s) => s.voxelBlockSizePx);
  const setVoxelBlockSizePx = useEditorStore((s) => s.setVoxelBlockSizePx);
  const brushRadius = useEditorStore((s) => s.brushRadius);
  const setBrushRadius = useEditorStore((s) => s.setBrushRadius);
  const stampScale = useEditorStore((s) => s.stampScale);
  const setStampScale = useEditorStore((s) => s.setStampScale);
  const snapToGrid = useEditorStore((s) => s.snapToGrid);
  const setSnapToGrid = useEditorStore((s) => s.setSnapToGrid);
  const selectionMode = useEditorStore((s) => s.selectionMode);
  const setSelectionMode = useEditorStore((s) => s.setSelectionMode);
  const clearSelectedCells = useEditorStore((s) => s.clearSelectedCells);
  const rotateSelection = useEditorStore((s) => s.rotateSelection);
  const flipSelection = useEditorStore((s) => s.flipSelection);

  const activeMapData = useGameStore((s) => s.activeMapData);
  const showToast = useGameStore((s) => s.showToast);

  const handleToolClick = (toolId: typeof activeWorkflowTool) => {
    soundSynth?.playSelectSound?.();
    setActiveWorkflowTool(toolId);
    if (toolId === 'select') {
      useEditorStore.getState().setBrushMode('select');
    } else if (toolId === 'draw') {
      useEditorStore.getState().setBrushMode('paint');
    }
  };

  return (
    <div className="h-[38px] w-full bg-[#050b14]/95 border-b border-border/40 backdrop-blur-xl flex items-center justify-between px-3 font-mono text-xs select-none z-30 shrink-0 pointer-events-auto">
      {/* ── Left: Primary Workflow Tools ── */}
      <div className="flex items-center gap-1 border-r border-border/30 pr-3 shrink-0">
        {WORKFLOW_TOOLS.filter(tool => {
          if (studioMode === 'tile' && !['select', 'draw'].includes(tool.id)) return false;
          if (studioMode === 'voxel' && !['select', 'sculpt', 'transform', 'place', 'procedural'].includes(tool.id)) return false;
          if (studioMode !== 'tile' && studioMode !== 'voxel' && studioMode !== 'develop') return false;
          if (studioMode === 'develop') {
            if (tool.id === 'sculpt' && activeMapData?.mapType === 'TILE') return false;
            if (tool.id === 'draw' && activeMapData?.mapType === 'VOXEL') return false;
          }
          return true;
        }).map((tool) => {
          const Icon = tool.icon;
          const isActive = activeWorkflowTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => handleToolClick(tool.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-wider uppercase transition-all cursor-pointer ${
                isActive
                  ? 'bg-primary/20 text-primary border border-primary/50 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent'
              }`}
              title={`Activate ${tool.label} workflow tool`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tool.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Center: Contextual Parameters Pill Strip ── */}
      <div className="flex items-center gap-2 overflow-x-auto px-2 custom-scrollbar flex-1 min-w-0">
        {activeWorkflowTool === 'select' && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Shape:</span>
            {(['box', 'lasso', 'magic-wand'] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  soundSynth?.playUiClick?.();
                  setSelectionMode(m);
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                  selectionMode === m
                    ? 'bg-primary/20 text-primary border-primary/40'
                    : 'bg-black/40 border-border/30 text-muted-foreground hover:text-foreground'
                }`}
              >
                {m === 'box' ? 'Box' : m === 'lasso' ? 'Lasso' : 'Wand'}
              </button>
            ))}
            <div className="h-3 w-px bg-border/40 mx-1" />
            <button
              onClick={() => {
                if (!activeMapData) return;
                useEditorStore.getState().addSelectedBox(0, activeMapData.height - 1, 0, activeMapData.width - 1);
                showToast('Selected entire map');
              }}
              className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-border/30 text-[10px] text-foreground"
            >
              Select All
            </button>
            <button
              onClick={() => {
                clearSelectedCells();
                showToast('Cleared selection');
              }}
              className="px-2 py-0.5 rounded bg-white/5 hover:bg-red-500/10 border border-border/30 text-[10px] text-muted-foreground hover:text-red-400"
            >
              Clear
            </button>
            <button
              onClick={() => openPanel('selection')}
              className="px-2 py-0.5 rounded bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-[10px] font-bold ml-1"
            >
              More Options...
            </button>
          </div>
        )}

        {activeWorkflowTool === 'draw' && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => openPanel('materials')}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/40 border border-primary/40 text-primary text-[10px] font-bold hover:bg-primary/10"
              title="Click to open Material Library"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-primary" />
              <span>Material #{activeVoxelMaterialId}</span>
            </button>
            <div className="h-3 w-px bg-border/40 mx-1" />
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Shape:</span>
            {[
              { id: 1, label: 'Cube' },
              { id: 2, label: 'Ramp' },
              { id: 7, label: 'Slab' },
              { id: 9, label: 'Stairs' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  soundSynth?.playUiClick?.();
                  setActiveVoxelShape(s.id);
                  showToast(`Shape: ${s.label}`);
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                  activeVoxelShape === s.id
                    ? 'bg-primary/20 text-primary border-primary/40'
                    : 'bg-black/40 border-border/30 text-muted-foreground hover:text-foreground'
                }`}
              >
                {s.label}
              </button>
            ))}
            <div className="h-3 w-px bg-border/40 mx-1" />
            <button
              onClick={() => {
                setVoxelPlaneLockEnabled(!voxelPlaneLockEnabled);
                showToast(`Plane Lock Y=${voxelTargetPlaneY}: ${!voxelPlaneLockEnabled ? 'ON' : 'OFF'}`);
              }}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                voxelPlaneLockEnabled
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-white/5 border-border/30 text-muted-foreground'
              }`}
            >
              {voxelPlaneLockEnabled ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              <span>Lock Y:{voxelTargetPlaneY}</span>
            </button>
          </div>
        )}

        {activeWorkflowTool === 'sculpt' && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Brush Radius:</span>
            {[1, 2, 3, 5].map((r) => (
              <button
                key={r}
                onClick={() => {
                  soundSynth?.playUiClick?.();
                  setBrushRadius(r);
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                  brushRadius === r
                    ? 'bg-primary/20 text-primary border-primary/40'
                    : 'bg-black/40 border-border/30 text-muted-foreground hover:text-foreground'
                }`}
              >
                {r}r
              </button>
            ))}
            <div className="h-3 w-px bg-border/40 mx-1" />
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Voxel Scale:</span>
            {[16, 32, 64].map((size) => (
              <button
                key={size}
                onClick={() => {
                  soundSynth?.playUiClick?.();
                  setVoxelBlockSizePx(size);
                  showToast(`Block Resolution: ${size}px`);
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                  voxelBlockSizePx === size
                    ? 'bg-primary/20 text-primary border-primary/40'
                    : 'bg-black/40 border-border/30 text-muted-foreground hover:text-foreground'
                }`}
              >
                {size}px
              </button>
            ))}
          </div>
        )}

        {activeWorkflowTool === 'transform' && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                soundSynth?.playUiClick?.();
                if (activeMapData) rotateSelection(activeMapData, null, 90);
                showToast('Rotated CW 90°');
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/40 border border-border/30 text-[10px] text-foreground hover:border-primary/40"
            >
              <RotateCw className="w-3 h-3 text-primary" />
              <span>+90° CW</span>
            </button>
            <button
              onClick={() => {
                soundSynth?.playUiClick?.();
                if (activeMapData) flipSelection(activeMapData, null, 'h');
                showToast('Flipped Horizontal');
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/40 border border-border/30 text-[10px] text-foreground hover:border-primary/40"
            >
              <FlipHorizontal className="w-3 h-3 text-amber-400" />
              <span>Flip H</span>
            </button>
            <button
              onClick={() => {
                soundSynth?.playUiClick?.();
                if (activeMapData) flipSelection(activeMapData, null, 'v');
                showToast('Flipped Vertical');
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/40 border border-border/30 text-[10px] text-foreground hover:border-primary/40"
            >
              <FlipVertical className="w-3 h-3 text-amber-400" />
              <span>Flip V</span>
            </button>
            <button
              onClick={() => openPanel('transform')}
              className="px-2 py-0.5 rounded bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-[10px] font-bold ml-1"
            >
              Transform Panel...
            </button>
          </div>
        )}

        {activeWorkflowTool === 'place' && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => openPanel('assets')}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/40 border border-primary/40 text-primary text-[10px] font-bold hover:bg-primary/10"
            >
              <Box className="w-3 h-3" />
              <span>Pick Prop...</span>
            </button>
            <button
              onClick={() => openPanel('assets')}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/40 border border-border/40 text-foreground text-[10px] hover:border-primary/40"
            >
              <Package className="w-3 h-3 text-amber-400" />
              <span>Blueprint Stamps...</span>
            </button>
            <span className="text-[10px] text-muted-foreground ml-2">Scale: {Math.round(stampScale * 100)}%</span>
          </div>
        )}

        {activeWorkflowTool === 'procedural' && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => openPanel('procedural')}
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-purple-950/40 border border-purple-500/40 text-purple-300 text-[10px] font-bold hover:bg-purple-900/60"
            >
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>Open Procedural Studio...</span>
            </button>
            <button
              onClick={() => openPanel('biome')}
              className="px-2 py-0.5 rounded bg-black/40 border border-border/30 text-[10px] text-muted-foreground hover:text-foreground"
            >
              Biome Config
            </button>
          </div>
        )}
      </div>

      {/* ── Right: Quick Dock Toggles ── */}
      <div className="flex items-center gap-1 border-l border-border/30 pl-3 shrink-0">
        
        {/* Dynamically render closed windows assigned to this mode */}
        {(STUDIO_MODE_DEFAULTS[studioMode] || []).map((panelId) => {
          const isPanelOpen = panels[panelId]?.isOpen;
          if (isPanelOpen) return null; // Only show closed windows
          
          const dockData = DOCK_ICONS[panelId as StudioDockId];
          if (!dockData) return null;
          
          const Icon = dockData.icon;
          
          return (
            <button
              key={panelId}
              onClick={() => togglePanel(panelId as StudioDockId)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border/30 bg-black/40 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors cursor-pointer shadow-sm"
              title={`Open ${dockData.label}`}
            >
              <Icon className="w-3 h-3 text-primary" />
              <span className="font-bold">{dockData.label}</span>
            </button>
          );
        })}

        {((STUDIO_MODE_DEFAULTS[studioMode] || []).filter(id => !panels[id]?.isOpen).length > 0) && (
          <div className="w-px h-6 bg-border/40 mx-1" />
        )}

        <button
          onClick={() => window.dispatchEvent(new CustomEvent('studio_set_zoom', { detail: { percent: 125 } }))}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors cursor-pointer"
          title="Zoom In (Ctrl++)"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('studio_set_zoom', { detail: { percent: 80 } }))}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors cursor-pointer"
          title="Zoom Out (Ctrl+-)"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('studio_fit_map'))}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors cursor-pointer"
          title="Fit Map to View (Home)"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
