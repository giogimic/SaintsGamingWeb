'use client';

import React from 'react';
import { PanelId } from './editor-store';

interface DraggablePanelProps {
  id: PanelId;
  children: React.ReactNode;
  icon?: React.ReactNode;
  title?: string;
}

/**
 * DEPRECATED NAME: This wrapper is now just a pass-through for FlexLayout.
 * Kept as `DraggablePanel` temporarily to avoid modifying 14+ panel files at once.
 * FlexLayout handles all dragging, resizing, and docking logic.
 */
export const DraggablePanel: React.FC<DraggablePanelProps> = ({ children }) => {
  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden bg-transparent text-slate-300 custom-scrollbar font-sans">
      <div className="flex-1 overflow-y-auto p-3 h-full">
        {children}
      </div>
    </div>
  );
};
