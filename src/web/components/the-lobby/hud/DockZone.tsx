'use client';

import React, { useState } from 'react';
import { useGameStore } from '../store';
import { DockZoneId, DOCK_ZONE_DEFINITIONS } from './dock-types';

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
    // Only clear if leaving the zone container
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!isEditing) return;
    e.preventDefault();
    setIsOver(false);
    const widgetId = e.dataTransfer.getData('text/plain');
    if (widgetId) {
      moveWidgetToZone(widgetId, zoneId);
    }
  };

  // Convert default orientation into layout flex classes
  const orientationClasses =
    zoneDef.defaultOrientation === 'horizontal'
      ? 'flex flex-row flex-wrap items-end gap-2'
      : zoneDef.defaultOrientation === 'tabbed'
      ? 'flex flex-col gap-2'
      : 'flex flex-col gap-2';

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
                ? 'border-cyan-400 bg-cyan-950/40 shadow-[0_0_25px_rgba(34,211,238,0.4)] scale-[1.02]'
                : 'border-white/20 bg-black/20 hover:border-emerald-400/50'
            }`
          : 'pointer-events-none'
      } ${className}`}
    >
      {/* Zone Identifier Badge in Edit Mode */}
      {isEditing && (
        <div className="pointer-events-none mb-1 flex items-center justify-between gap-1 px-1">
          <span className="font-mono text-[9px] font-black uppercase tracking-widest text-white/50">
            {zoneDef.label}
          </span>
          <span className="text-[8px] text-white/30">{zoneDef.defaultOrientation}</span>
        </div>
      )}

      {/* Widgets Area */}
      <div className={`pointer-events-none ${orientationClasses}`}>
        {children}
      </div>
    </div>
  );
}
