'use client';

import React, { useState } from 'react';
import { useGameStore } from '../store';
import { DockZoneId, DOCK_ZONE_DEFINITIONS } from './dock-types';
import { soundSynth } from '@/engine/sound-synth';

interface DockZoneProps {
  zoneId: DockZoneId;
  children?: React.ReactNode;
  className?: string;
}

export function DockZone({ zoneId, children, className = '' }: DockZoneProps) {
  const isEditing = useGameStore((s) => s.isEditingInterface || s.isUiEditMode);
  const moveWidgetToZone = useGameStore((s) => s.moveWidgetToZone);
  const activePreset = useGameStore((s) => s.activeHudPreset);

  const [isOver, setIsOver] = useState(false);
  const zoneDef = DOCK_ZONE_DEFINITIONS[zoneId] || {
    id: zoneId,
    label: zoneId,
    description: '',
    cssAnchor: '',
    defaultOrientation: 'vertical',
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isEditing) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isOver) setIsOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!isEditing) return;
    e.preventDefault();
    setIsOver(false);
    const widgetId = e.dataTransfer.getData('text/plain');
    if (widgetId) {
      soundSynth?.playActionSound?.();
      moveWidgetToZone(widgetId, zoneId);
    }
  };

  const orientationClasses =
    zoneDef.defaultOrientation === 'horizontal'
      ? 'flex flex-row flex-wrap items-end gap-4'
      : zoneDef.defaultOrientation === 'tabbed'
      ? 'flex flex-col gap-4'
      : 'flex flex-col gap-4';

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-dock-zone={zoneId}
      className={`fixed z-40 transition-all duration-200 ${zoneDef.cssAnchor} ${
        isEditing
          ? `pointer-events-auto min-h-[60px] min-w-[120px] rounded-xl border-2 border-dashed p-1.5 backdrop-blur-[2px] ${
              isOver
                ? 'border-cyan-400 bg-cyan-950/40 shadow-[0_0_25px_rgba(6,182,212,0.5)] scale-[1.02]'
                : 'border-cyan-500/30 bg-black/40 hover:border-cyan-400/60'
            }`
          : 'pointer-events-none'
      } ${className}`}
    >
      {/* Zone Identifier Badge in Edit Mode */}
      {isEditing && (
        <div className="pointer-events-none mb-1 flex items-center justify-between gap-1 px-1.5 py-0.5 rounded bg-black/80 border border-cyan-500/20 font-mono">
          <span className="text-[9px] font-bold uppercase tracking-widest text-cyan-300">
            {zoneDef.label}
          </span>
          <span className="text-[8px] text-cyan-500/50 uppercase font-bold">{zoneDef.defaultOrientation}</span>
        </div>
      )}

      {/* Widgets Area */}
      <div className={`pointer-events-none ${orientationClasses}`}>
        {children}
      </div>
    </div>
  );
}

