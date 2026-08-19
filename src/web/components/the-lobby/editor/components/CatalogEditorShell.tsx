'use client';

import React from 'react';
import {
  Redo2,
  Undo2,
  Search,
  Plus,
  Save,
  Trash2,
  RotateCcw,
  AlertTriangle,
  FileJson,
} from 'lucide-react';

export type CatalogEditorShellProps<T = any> = {
  /** Catalog title (e.g. Creatures, NPCs, Items, Loot). */
  title: string;
  /** One-line purpose. */
  blurb?: string;
  /** General unsaved / dirty state indicator. */
  dirty?: boolean;
  /** Optional actions: Seed, Import, New… */
  toolbar?: React.ReactNode;
  /** Definition-form undo (bible 30 — separate from map paint). */
  canUndoDefinition?: boolean;
  canRedoDefinition?: boolean;
  onUndoDefinition?: () => void;
  onRedoDefinition?: () => void;
  /** Optional custom left list column (slot pattern). */
  list?: React.ReactNode;
  /** Main detail view content. */
  children: React.ReactNode;

  // ─── Optional Master-Detail List Pattern (Items / Loot / Typed Catalogs) ───
  items?: T[];
  activeId?: string | null;
  getItemId?: (item: T) => string;
  getItemName?: (item: T) => string;
  isDirty?: ((item: T) => boolean) | boolean;

  search?: string;
  onSearchChange?: (val: string) => void;

  onSelect?: (id: string) => void;
  onCreateNew?: () => void;
  onSave?: () => Promise<void> | void;
  onRevert?: () => void;
  onDelete?: () => Promise<void> | void;

  saving?: boolean;
  validationError?: string | null;
};

/**
 * Unified chrome for definition catalogs (bible 30 CatalogEditorShell).
 * Supports both Slot-based layouts (Creatures, Quests, NPCs) and Typed Master-Detail lists (Items, Loot).
 */
export function CatalogEditorShell<T = any>({
  title,
  blurb,
  dirty,
  toolbar,
  canUndoDefinition,
  canRedoDefinition,
  onUndoDefinition,
  onRedoDefinition,
  list,
  children,
  items,
  activeId,
  getItemId,
  getItemName,
  isDirty,
  search,
  onSearchChange,
  onSelect,
  onCreateNew,
  onSave,
  onRevert,
  onDelete,
  saving,
  validationError,
}: CatalogEditorShellProps<T>) {
  const showDefHistory =
    typeof onUndoDefinition === 'function' || typeof onRedoDefinition === 'function';

  // If `items` is provided, render the integrated master-detail shell (Items / Loot mode)
  if (items !== undefined && getItemId && getItemName) {
    const isOverallDirty =
      typeof dirty === 'boolean'
        ? dirty
        : typeof isDirty === 'boolean'
        ? isDirty
        : false;

    return (
      <div className="flex flex-col h-full bg-[#0b1320] text-[#e2d5b3] font-mono text-[11px] select-none">
        {/* Master Header */}
        <div className="flex items-center justify-between p-2 bg-[#050b14] border-b border-[#806f47]/30 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-[13px] font-bold text-[#cbb26a] tracking-wide uppercase">
              {title}
            </h2>

            {onSearchChange && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-[#806f47]" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search ?? ''}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="bg-[#111a2a] border border-[#806f47]/40 rounded pl-7 pr-2 py-1 outline-none focus:border-[#cbb26a] w-48 text-[#e2d5b3]"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {showDefHistory && (
              <div className="flex items-center gap-0.5 mr-2">
                <button
                  type="button"
                  disabled={!canUndoDefinition}
                  onClick={() => onUndoDefinition?.()}
                  className="rounded p-1.5 text-slate-400 hover:bg-white/5 disabled:opacity-30 cursor-pointer"
                  title="Undo definition edit"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={!canRedoDefinition}
                  onClick={() => onRedoDefinition?.()}
                  className="rounded p-1.5 text-slate-400 hover:bg-white/5 disabled:opacity-30 cursor-pointer"
                  title="Redo definition edit"
                >
                  <Redo2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            {isOverallDirty && (
              <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-200">
                Unsaved
              </span>
            )}
            {toolbar}
            {onCreateNew && (
              <button
                onClick={onCreateNew}
                className="flex items-center gap-1.5 px-2 py-1 bg-[#23354f] hover:bg-[#2d4263] border border-[#405c87] rounded transition-colors text-white shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            )}
          </div>
        </div>

        {/* Master Body */}
        <div className="flex flex-1 min-h-0">
          {/* Left item list */}
          <div className="w-64 border-r border-[#806f47]/30 flex flex-col bg-[#050b14]/50 shrink-0 overflow-y-auto custom-scrollbar">
            {items.length === 0 ? (
              <div className="p-4 text-[#806f47]/60 italic text-center">No items found.</div>
            ) : (
              <div className="flex flex-col p-1 gap-0.5">
                {items.map((item) => {
                  const id = getItemId(item);
                  const isActive = id === activeId;
                  const itemDirty =
                    typeof isDirty === 'function' ? isDirty(item) : false;
                  return (
                    <button
                      key={id}
                      onClick={() => onSelect?.(id)}
                      className={`flex items-center justify-between px-2 py-1.5 rounded text-left transition-colors truncate cursor-pointer ${
                        isActive
                          ? 'bg-[#cbb26a]/20 text-[#cbb26a] font-bold shadow-[inset_2px_0_0_#cbb26a]'
                          : 'hover:bg-[#806f47]/10 text-[#a59981]'
                      }`}
                    >
                      <span className="truncate">{getItemName(item)}</span>
                      {itemDirty && <span className="text-[#e5c07b] font-bold shrink-0">*</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right detail view */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#0b1320]">
            {activeId !== null && activeId !== undefined ? (
              <>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  {children}
                </div>
                {(onSave || onDelete || onRevert || validationError) && (
                  <div className="flex items-center justify-between p-2 bg-[#050b14] border-t border-[#806f47]/30 shrink-0">
                    <div className="flex items-center gap-3">
                      {validationError && (
                        <div className="flex items-center gap-1.5 text-[#e06c75] bg-[#e06c75]/10 px-2 py-1 rounded border border-[#e06c75]/30">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{validationError}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {onDelete && (
                        <button
                          onClick={onDelete}
                          className="flex items-center gap-1.5 px-3 py-1 bg-[#1a0b0b] hover:bg-[#331111] text-[#e06c75] border border-[#e06c75]/40 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      )}
                      {onRevert && (
                        <button
                          onClick={onRevert}
                          className="flex items-center gap-1.5 px-3 py-1 bg-[#1a2333] hover:bg-[#23354f] border border-[#806f47]/40 rounded transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-[#a59981]" />
                          <span>Revert</span>
                        </button>
                      )}
                      {onSave && (
                        <button
                          onClick={onSave}
                          disabled={saving}
                          className={`flex items-center gap-1.5 px-4 py-1 rounded font-bold shadow-sm transition-colors cursor-pointer ${
                            saving
                              ? 'bg-[#1a2333] text-[#5c6370] cursor-not-allowed'
                              : 'bg-[#cbb26a] text-[#050b14] hover:bg-[#d4c38d] shadow-[0_0_10px_rgba(203,178,106,0.3)]'
                          }`}
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{saving ? 'Saving...' : 'Save'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-[#806f47]/60 p-8 text-center">
                <FileJson className="w-12 h-12 mb-4 opacity-20" />
                <p>Select an item from the list to view its properties.</p>
                <p className="mt-2 text-[10px]">Or click + New to create a blank definition.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Otherwise, render Slot-Based layout (Creatures, NPCs, Quests, etc.)
  return (
    <div className="flex h-full min-h-0 flex-col gap-2 font-mono text-xs text-slate-200">
      <header className="shrink-0 space-y-1.5 border-b border-[#806f47]/30 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#cbb26a]">
            {title}
          </h3>
          <div className="flex items-center gap-1.5">
            {showDefHistory && (
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  disabled={!canUndoDefinition}
                  onClick={() => onUndoDefinition?.()}
                  className="rounded p-1.5 text-slate-400 hover:bg-white/5 disabled:opacity-30 cursor-pointer"
                  title="Undo definition edit"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={!canRedoDefinition}
                  onClick={() => onRedoDefinition?.()}
                  className="rounded p-1.5 text-slate-400 hover:bg-white/5 disabled:opacity-30 cursor-pointer"
                  title="Redo definition edit"
                >
                  <Redo2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            {dirty && (
              <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-200">
                Unsaved
              </span>
            )}
          </div>
        </div>
        {blurb && (
          <p className="text-[10px] leading-relaxed text-slate-500">{blurb}</p>
        )}
        {toolbar && <div className="flex flex-wrap items-center gap-1.5">{toolbar}</div>}
      </header>

      <div className={`flex min-h-0 flex-1 gap-2 ${list ? 'flex-row' : 'flex-col'}`}>
        {list && (
          <aside className="max-h-[40vh] w-[42%] shrink-0 overflow-auto rounded-lg border border-slate-800 bg-black/30 p-1.5 lg:max-h-none">
            {list}
          </aside>
        )}
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
