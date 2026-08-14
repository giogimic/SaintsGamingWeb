'use client';

import React, { useState } from 'react';
import { useGameStore } from '../store';
import { Move, Eye, EyeOff, Minimize2, Maximize2, ChevronDown, ChevronUp } from 'lucide-react';
import { WidgetSize } from './dock-types';
import { WIDGET_METADATA } from './default-presets';

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
    const current = config.sizeVariant || 'standard';
    const next: WidgetSize =
      current === 'standard' ? 'compact' : current === 'compact' ? 'expanded' : 'standard';
    setWidgetSize(id, next);
  };

  const toggleVisibility = () => {
    setWidgetVisibility(id, !config.visible);
  };

  const toggleCollapsed = () => {
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
                ? 'border-cyan-400 bg-cyan-950/40 opacity-40 shadow-[0_0_20px_rgba(34,211,238,0.4)]'
                : 'border-emerald-500/70 bg-black/40 shadow-[0_0_15px_rgba(16,185,129,0.25)] hover:border-emerald-400'
            } p-1`
          : ''
      }`}
    >
      {/* Edit Mode Header Overlay */}
      {isEditing && (
        <div className="mb-1 flex items-center justify-between gap-1.5 rounded-md border border-white/10 bg-[#0A0B10]/95 px-2 py-1 text-xs font-semibold text-white shadow-lg backdrop-blur-md">
          {/* Drag Handle */}
          <div
            className="flex cursor-grab items-center gap-1.5 rounded px-1 py-0.5 text-emerald-400 hover:bg-white/10 active:cursor-grabbing"
            title="Drag to another Dock Zone"
          >
            <Move className="h-3.5 w-3.5" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-300">
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
              className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/70 hover:bg-white/10 hover:text-white"
            >
              {config.sizeVariant === 'compact' ? (
                <Minimize2 className="h-3 w-3 text-yellow-400" />
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
                className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white"
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
              className={`rounded p-1 transition ${
                config.visible
                  ? 'text-emerald-400 hover:bg-white/10'
                  : 'text-red-400 hover:bg-white/10'
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
