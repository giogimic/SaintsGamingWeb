'use client';

import React from 'react';
import { useGameStore } from '../../store';
import { useEditorStore } from '../editor-store';
import { LogicTagPalette } from '../LogicTagPalette';
import { Shield, Sparkles, Tag, Layers, RefreshCw, Trash2, Eye } from 'lucide-react';
import {
  WindowMenuBar,
  WindowMenuDropdown,
  WindowMenuButton,
  WindowMenuDivider,
} from '../WindowMenuBar';
import { soundSynth } from '@/engine/sound-synth';

/**
 * Dedicated dockable window for the Logic Painter.
 * Allows creators to select gameplay rule tags, collision boundaries, and interactive triggers
 * with a standardized application sub-menu bar under the title bar.
 */
export const LogicPainterPanel: React.FC = () => {
  const activeMapData = useGameStore((s) => s.activeMapData);
  const activeLogicTileId = useEditorStore((s) => s.activeLogicTileId);
  const activeLayerIdx = useEditorStore((s) => s.activeLayerIdx);
  const setActiveLayerIdx = useEditorStore((s) => s.setActiveLayerIdx);
  const setStudioMode = useEditorStore((s) => s.setStudioMode);
  const showToast = useGameStore((s) => s.showToast);

  const handleClearLogic = () => {
    if (!activeMapData) return;
    if (confirm('Clear all logic tags from the map? Collision & warp triggers will be removed.')) {
      soundSynth?.playActionSound?.();
      const updated = {
        ...activeMapData,
        logicGrid: undefined,
        logicLayers: undefined,
      };
      useGameStore.getState().setActiveMapData(updated);
      useEditorStore.getState().markMapDirty();
      showToast('Cleared map logic layer');
    }
  };

  return (
    <div className="h-full w-full flex flex-col font-mono text-xs bg-[#050b14]/50 -m-3 mb-0">
      {/* ── WINDOW SUB-MENU APP BAR ── */}
      <WindowMenuBar>
        <WindowMenuDropdown
          label="Logic Tools"
          icon={Shield}
          items={[
            {
              label: 'Switch to Visual Paint (Layer 0)',
              icon: Layers,
              onClick: () => {
                setActiveLayerIdx(0);
                showToast('Switched to Visual Layer 0');
              },
            },
            {
              label: 'Open Rule Debugger',
              icon: Sparkles,
              onClick: () => window.dispatchEvent(new CustomEvent('studio_open_rule_debugger')),
            },
            { divider: true, label: '' },
            {
              label: 'Clear Logic Layer',
              icon: Trash2,
              danger: true,
              onClick: handleClearLogic,
            },
          ]}
        />
        <WindowMenuDivider />
        <WindowMenuButton
          label="Visual Layer (0)"
          icon={Layers}
          onClick={() => {
            setActiveLayerIdx(0);
            showToast('Switched to Visual Layer 0');
          }}
          title="Switch to Visual Paint Mode"
        />
        <div className="flex-1" />
        <span className="rounded bg-cyan-500/15 border border-cyan-500/40 px-2 py-0.5 text-[9px] font-bold text-cyan-300 shrink-0">
          Tag #{activeLogicTileId}
        </span>
      </WindowMenuBar>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        <LogicTagPalette />
      </div>
    </div>
  );
};
