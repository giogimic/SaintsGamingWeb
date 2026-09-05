'use client';

import React, { useState } from 'react';
import { useGameStore } from '../store';
import { Move, Eye, EyeOff, Minimize2, Maximize2, ChevronDown, ChevronUp } from 'lucide-react';
import { WidgetSize } from './dock-types';
import { WIDGET_METADATA } from './default-presets';
import { soundSynth } from '@/engine/sound-synth';

interface DockableWidgetProps {
  id: string;
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  allowCollapse?: boolean;
}

export function DockableWidget({
  id,
  title,
  icon,
  children,
  className = '',
  allowCollapse = false,
}: DockableWidgetProps) {
  const isEditing = useGameStore((s) => s.isEditingInterface || s.isUiEditMode);
  const activePreset = useGameStore((s) => s.activeHudPreset);
  const setWidgetVisibility = useGameStore((s) => s.setWidgetVisibility);
  const setWidgetSize = useGameStore((s) => s.setWidgetSize);
  const setWidgetCollapsed = useGameStore((s) => s.setWidgetCollapsed);

  const meta = WIDGET_METADATA[id];
  const displayTitle = title || meta?.label || id;
  const config = activePreset?.widgets?.[id] || {
    widgetId: id,
    zoneId: 'floating',
    order: 0,
    sizeVariant: 'standard' as WidgetSize,
    visible: true,
    collapsed: false,
  };

  const [isDraggingLocal, setIsDraggingLocal] = useState(false);

  // Hidden in normal gameplay if toggled off
  if (!config.visible && !isEditing) {
    return null;
  }

  const handleDragStart = (e: React.DragEvent) => {
    if (!isEditing) return;
    setIsDraggingLocal(true);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setIsDraggingLocal(false);
  };

  const cycleSize = () => {
    soundSynth?.playSelectSound?.();
    const current = config.sizeVariant || 'standard';
    const next: WidgetSize =
      current === 'standard' ? 'compact' : current === 'compact' ? 'expanded' : 'standard';
    setWidgetSize(id, next);
  };

  const toggleVisibility = () => {
    soundSynth?.playUiClick?.();
    setWidgetVisibility(id, !config.visible);
  };

  const toggleCollapsed = () => {
    soundSynth?.playUiClick?.();
    setWidgetCollapsed(id, !config.collapsed);
  };

  const sizeClasses: Record<WidgetSize, string> = {
    compact: 'scale-90 origin-top-left',
    standard: 'scale-100 origin-top-left',
    expanded: 'scale-105 origin-top-left',
  };

  const currentSizeClass = sizeClasses[config.sizeVariant || 'standard'] || '';

  return (
    <div
      draggable={isEditing}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      data-widget-id={id}
      className={`relative transition-all duration-150 ${className} ${
        isEditing
          ? `rounded-lg border-2 border-dashed ${
              !config.visible
                ? 'border-red-500/50 bg-red-950/20 opacity-60'
                : isDraggingLocal
                ? 'border-cyan-400 bg-cyan-950/40 opacity-40 shadow-[0_0_20px_rgba(6,182,212,0.5)]'
                : 'border-emerald-500/70 bg-black/60 shadow-[0_0_15px_rgba(16,185,129,0.25)] hover:border-emerald-400'
            } p-1`
          : ''
      }`}
    >
      {/* Edit Mode Header Overlay */}
      {isEditing && (
        <div className="mb-1 flex items-center justify-between gap-1.5 rounded border border-cyan-500/30 bg-black/95 px-2 py-1 text-xs font-semibold text-white shadow-lg backdrop-blur-md font-mono">
          {/* Drag Handle */}
          <div
            className="flex cursor-grab items-center gap-1.5 rounded px-1 py-0.5 text-emerald-400 hover:bg-emerald-950/40 active:cursor-grabbing"
            title="Drag to another Dock Zone"
          >
            <Move className="h-3.5 w-3.5" />
            <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold">
              {displayTitle}
            </span>
          </div>

          {/* Controls Cluster */}
          <div className="flex items-center gap-1">
            {/* Size Token Switcher */}
            <button
              type="button"
              onClick={cycleSize}
              title={`Size: ${config.sizeVariant || 'standard'} (Click to cycle)`}
              className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/80 hover:bg-cyan-950/60 hover:text-cyan-300 border border-transparent hover:border-cyan-500/30 cursor-pointer"
            >
              {config.sizeVariant === 'compact' ? (
                <Minimize2 className="h-3 w-3 text-amber-400" />
              ) : config.sizeVariant === 'expanded' ? (
                <Maximize2 className="h-3 w-3 text-purple-400" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
              )}
              <span>{config.sizeVariant || 'std'}</span>
            </button>

            {/* Collapse Toggle */}
            {allowCollapse && (
              <button
                type="button"
                onClick={toggleCollapsed}
                title={config.collapsed ? 'Expand Widget' : 'Collapse Widget'}
                className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                {config.collapsed ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronUp className="h-3.5 w-3.5" />
                )}
              </button>
            )}

            {/* Visibility Toggle */}
            <button
              type="button"
              onClick={toggleVisibility}
              title={config.visible ? 'Hide Widget' : 'Show Widget'}
              className={`rounded p-1 transition cursor-pointer ${
                config.visible
                  ? 'text-emerald-400 hover:bg-emerald-950/50'
                  : 'text-red-400 hover:bg-red-950/50'
              }`}
            >
              {config.visible ? (
                <Eye className="h-3.5 w-3.5" />
              ) : (
                <EyeOff className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Widget Content Container */}
      <div
        className={`${currentSizeClass} ${
          config.collapsed ? 'hidden' : ''
        } ${isEditing ? 'pointer-events-none opacity-90' : 'pointer-events-auto'}`}
      >
        {children}
      </div>
    </div>
  );
}
