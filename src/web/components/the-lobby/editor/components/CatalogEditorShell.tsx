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
  FileText,
  FolderOpen,
} from 'lucide-react';
import { Virtuoso } from 'react-virtuoso';
import {
  WindowMenuBar,
  WindowMenuDropdown,
  WindowMenuButton,
  WindowMenuDivider,
} from '../WindowMenuBar';

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
 * Features a standardized desktop application sub-menu bar under the title bar.
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
      <div className="flex flex-col h-full bg-[#050b14]/50 text-foreground font-mono text-[11px] select-none -m-3 mb-0">
        {/* ── WINDOW SUB-MENU APP BAR ── */}
        <WindowMenuBar>
          <WindowMenuDropdown
            label="File"
            icon={FileText}
            items={[
              {
                label: 'New Definition',
                icon: Plus,
                shortcut: 'Ctrl+N',
                onClick: onCreateNew || (() => {}),
                disabled: !onCreateNew,
              },
              {
                label: 'Save Changes',
                icon: Save,
                shortcut: 'Ctrl+S',
                onClick: onSave || (() => {}),
                disabled: !onSave || saving,
              },
              {
                label: 'Revert to Saved',
                icon: RotateCcw,
                onClick: onRevert || (() => {}),
                disabled: !onRevert,
              },
              { divider: true, label: '' },
              {
                label: 'Delete Definition',
                icon: Trash2,
                danger: true,
                onClick: onDelete || (() => {}),
                disabled: !onDelete,
              },
            ]}
          />
          {showDefHistory && (
            <WindowMenuDropdown
              label="Edit"
              items={[
                {
                  label: 'Undo Edit',
                  icon: Undo2,
                  shortcut: 'Ctrl+Z',
                  onClick: onUndoDefinition || (() => {}),
                  disabled: !canUndoDefinition,
                },
                {
                  label: 'Redo Edit',
                  icon: Redo2,
                  shortcut: 'Ctrl+Y',
                  onClick: onRedoDefinition || (() => {}),
                  disabled: !canRedoDefinition,
                },
              ]}
            />
          )}
          <WindowMenuDivider />
          {onCreateNew && (
            <WindowMenuButton
              label="New"
              icon={Plus}
              onClick={onCreateNew}
              title="Create new definition entry"
            />
          )}
          <div className="flex-1" />
          {isOverallDirty && (
            <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-200 shrink-0">
              Unsaved Changes*
            </span>
          )}
        </WindowMenuBar>

        {/* Master Header */}
        <div className="flex items-center justify-between p-2 bg-card/60 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-[12px] font-bold text-sg-gold tracking-wide uppercase">
              {title}
            </h2>

            {onSearchChange && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search catalog..."
                  value={search ?? ''}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="bg-input/60 border border-border/40 rounded pl-7 pr-2 py-1 outline-none focus:border-sg-gold focus:ring-1 focus:ring-sg-gold/50 w-48 text-foreground transition-all duration-200 text-[10px]"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {toolbar}
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Left item list */}
          <div className="w-64 border-r border-border/40 flex flex-col bg-[#060e1c]/40 shrink-0">
            {items.length === 0 ? (
              <div className="p-4 text-muted-foreground italic text-center text-[10px]">No items found.</div>
            ) : (
              <div className="flex-1 min-h-0 relative">
                <Virtuoso
                  className="w-full h-full custom-scrollbar absolute inset-0"
                  data={items}
                  itemContent={(_index, item) => {
                    const id = getItemId(item);
                    const isActive = id === activeId;
                    const itemDirty =
                      typeof isDirty === 'function' ? isDirty(item) : false;
                    return (
                      <div className="px-1 py-0.5">
                        <button
                          key={id}
                          onClick={() => onSelect?.(id)}
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-left transition-colors truncate cursor-pointer text-[10px] ${
                            isActive
                              ? 'bg-primary/20 text-primary font-bold border-l-2 border-primary'
                              : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground border-l-2 border-transparent'
                          }`}
                        >
                          <span className="truncate">{getItemName(item)}</span>
                          {itemDirty && <span className="text-primary font-bold shrink-0">*</span>}
                        </button>
                      </div>
                    );
                  }}
                />
              </div>
            )}
          </div>

          {/* Right detail view */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#050b14]/30">
            {activeId !== null && activeId !== undefined ? (
              <>
                <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                  {children}
                </div>
                {(onSave || onDelete || onRevert || validationError) && (
                  <div className="flex items-center justify-between p-2 bg-card/60 border-t border-border/40 shrink-0">
                    <div className="flex items-center gap-3">
                      {validationError && (
                        <div className="flex items-center gap-1.5 text-destructive bg-destructive/10 px-2 py-1 rounded border border-destructive/30 text-[10px]">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{validationError}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {onDelete && (
                        <button
                          onClick={onDelete}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/40 rounded transition-colors cursor-pointer text-[10px]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      )}
                      {onRevert && (
                        <button
                          onClick={onRevert}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-secondary hover:bg-secondary/80 border border-border/40 rounded transition-colors cursor-pointer text-secondary-foreground text-[10px]"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Revert</span>
                        </button>
                      )}
                      {onSave && (
                        <button
                          onClick={onSave}
                          disabled={saving}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded font-bold shadow-sm transition-colors cursor-pointer text-[10px] ${
                            saving
                              ? 'bg-secondary text-muted-foreground cursor-not-allowed'
                              : 'bg-primary text-black hover:bg-primary/90 shadow-lg shadow-primary/20'
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
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                <FileJson className="w-10 h-10 mb-3 opacity-20 text-primary" />
                <p className="font-bold text-foreground">No Item Selected</p>
                <p className="mt-1 text-[10px]">Select an entry from the left list or click + New to create one.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Otherwise, render Slot-Based layout (Creatures, NPCs, Quests, etc.)
  return (
    <div className="flex h-full min-h-0 flex-col font-mono text-xs text-slate-200 -m-3 mb-0">
      {/* ── WINDOW SUB-MENU APP BAR ── */}
      <WindowMenuBar>
        <WindowMenuDropdown
          label="Catalog"
          icon={FolderOpen}
          items={[
            {
              label: 'Undo Edit',
              icon: Undo2,
              shortcut: 'Ctrl+Z',
              onClick: onUndoDefinition || (() => {}),
              disabled: !canUndoDefinition,
            },
            {
              label: 'Redo Edit',
              icon: Redo2,
              shortcut: 'Ctrl+Y',
              onClick: onRedoDefinition || (() => {}),
              disabled: !canRedoDefinition,
            },
          ]}
        />
        <WindowMenuDivider />
        {toolbar}
        <div className="flex-1" />
        {dirty && (
          <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-200 shrink-0">
            Unsaved*
          </span>
        )}
      </WindowMenuBar>

      <div className="p-3 flex-1 flex flex-col min-h-0 space-y-2">
        <header className="shrink-0 space-y-1 border-b border-[#806f47]/30 pb-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#cbb26a]">
            {title}
          </h3>
          {blurb && (
            <p className="text-[10px] leading-relaxed text-slate-400">{blurb}</p>
          )}
        </header>

        <div className={`flex min-h-0 flex-1 gap-2 ${list ? 'flex-row' : 'flex-col'}`}>
          {list && (
            <aside className="max-h-[40vh] w-[38%] shrink-0 overflow-auto rounded-lg border border-slate-800 bg-black/40 p-1.5 lg:max-h-none custom-scrollbar">
              {list}
            </aside>
          )}
          <div className="min-h-0 flex-1 overflow-auto custom-scrollbar">{children}</div>
        </div>
      </div>
    </div>
  );
}
