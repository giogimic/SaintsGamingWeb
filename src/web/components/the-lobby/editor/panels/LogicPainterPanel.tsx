'use client';

import React from 'react';
import { useGameStore } from '../../store';
import { useEditorStore } from '../editor-store';
import { LogicTagPalette } from '../LogicTagPalette';
import { Shield, Sparkles, Tag, MousePointerClick } from 'lucide-react';

/**
 * Dedicated dockable window for the Logic Painter.
 * Allows creators to select gameplay rule tags, collision boundaries, and interactive triggers
 * as a first-class window beside the active map editor.
 */
export const LogicPainterPanel: React.FC = () => {
  const activeMapData = useGameStore((s) => s.activeMapData);
  const activeLogicTileId = useEditorStore((s) => s.activeLogicTileId);
  const activeLayerIdx = useEditorStore((s) => s.activeLayerIdx);
  const setActiveLayerIdx = useEditorStore((s) => s.setActiveLayerIdx);
  const setStudioMode = useEditorStore((s) => s.setStudioMode);

  return (
    <div className="h-full w-full overflow-y-auto custom-scrollbar p-3 font-mono text-xs bg-card/90 backdrop-blur-md">
      <div className="mb-2 flex items-center justify-between border-b border-border/50 pb-2">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-cyan-400" />
          <span className="font-bold text-foreground">Logic Painter</span>
          <span className="rounded bg-cyan-500/10 border border-cyan-500/30 px-1.5 py-0.5 text-[9px] font-bold text-cyan-300">
            Tag #{activeLogicTileId}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setActiveLayerIdx(-1);
            setStudioMode('logic');
          }}
          className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold transition-colors cursor-pointer ${
            activeLayerIdx === -1
              ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/50'
              : 'bg-muted/40 text-muted-foreground hover:text-foreground'
          }`}
        >
          <Tag className="h-3 w-3" />
          <span>{activeLayerIdx === -1 ? 'Logic (−1) Active' : 'Switch to Logic'}</span>
        </button>
      </div>

      <div className="space-y-3">
        <LogicTagPalette />
      </div>
    </div>
  );
};
