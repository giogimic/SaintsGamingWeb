'use client';

import React from 'react';
import { X, Keyboard, Command, Sparkles } from 'lucide-react';

type ShortcutEntry = {
  key: string;
  description: string;
};

type ShortcutCategory = {
  title: string;
  items: ShortcutEntry[];
};

const SHORTCUT_GROUPS: ShortcutCategory[] = [
  {
    title: 'Tools & Brushes',
    items: [
      { key: 'B', description: 'Brush / Paint Tool' },
      { key: 'E', description: 'Eraser Tool' },
      { key: 'G', description: 'Bucket Fill Tool' },
      { key: 'I', description: 'Eyedropper / Sample Tile' },
      { key: 'M', description: 'Marquee / Selection Box' },
      { key: 'H', description: 'Hand / Pan Tool' },
    ],
  },
  {
    title: 'Clipboard & Edit',
    items: [
      { key: 'Ctrl + Z', description: 'Undo tile operation' },
      { key: 'Ctrl + Y', description: 'Redo tile operation' },
      { key: 'Ctrl + X', description: 'Cut selection to clipboard' },
      { key: 'Ctrl + C', description: 'Copy selection to clipboard' },
      { key: 'Ctrl + V', description: 'Paste stamp from clipboard' },
      { key: 'Del / Backspace', description: 'Delete / clear selected tiles' },
      { key: 'Ctrl + A', description: 'Select entire layer' },
      { key: 'Escape', description: 'Clear selection / cancel stamp' },
    ],
  },
  {
    title: 'Stamp Transforms',
    items: [
      { key: 'X', description: 'Flip stamp horizontally' },
      { key: 'Y', description: 'Flip stamp vertically' },
      { key: 'Z', description: 'Rotate stamp 90° clockwise' },
    ],
  },
  {
    title: 'Modes & Workspaces',
    items: [
      { key: 'Ctrl + E', description: 'Toggle Playtest / Edit mode' },
      { key: 'Ctrl + Shift + A', description: 'Asset Studio workspace' },
      { key: 'Ctrl + K', description: 'Studio Omnisearch palette' },
      { key: 'Ctrl + S', description: 'Save map to database' },
      { key: 'Ctrl + Shift + Q', description: 'Save & exit to character select' },
    ],
  },
  {
    title: 'Navigation & View',
    items: [
      { key: '1 – 5', description: 'Quick select tile layer 1 to 5' },
      { key: 'Ctrl + Shift + P', description: 'Open World Atlas dock' },
      { key: 'Ctrl + Shift + M', description: 'Full-screen map explorer' },
      { key: 'Ctrl + Shift + O', description: 'Problems & diagnostics' },
      { key: '? / F1', description: 'Open this shortcuts cheat sheet' },
    ],
  },
];

export const StudioShortcutsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 pointer-events-auto animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-[#0b1320] border border-[#806f47]/50 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#050b14] border-b border-[#806f47]/30">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 tracking-wide">Studio Keyboard Shortcuts</h2>
              <p className="text-[10px] text-slate-400">Master cheat sheet for map building & studio workflows</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer"
            title="Close (Escape)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-5">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title} className="bg-[#050b14]/70 border border-slate-800 rounded-lg p-3 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#cbb26a] flex items-center gap-1.5 pb-1 border-b border-slate-800/80">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>{group.title}</span>
              </div>
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <div key={item.key} className="flex items-center justify-between text-xs py-0.5">
                    <span className="text-slate-300 text-[11px]">{item.description}</span>
                    <kbd className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-300 font-mono text-[10px] shadow-sm font-bold shrink-0 ml-2">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-[#050b14] border-t border-[#806f47]/30 flex items-center justify-between text-[10px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Command className="w-3 h-3 text-[#cbb26a]" />
            <span>Tip: Press <kbd className="px-1 py-0.2 rounded bg-slate-800 text-amber-300 font-mono">?</kbd> anywhere in the studio to bring up this sheet.</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 rounded font-bold transition-colors cursor-pointer text-[11px]"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
