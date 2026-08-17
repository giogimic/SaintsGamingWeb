'use client';

/**
 * Saints Gaming — Studio CatalogEditorShell Standard (Bible 30 §2)
 * Unified shell template providing standard header, search/filter, virtualized master list,
 * detail form pane, footer validation chips, save/revert triggers, and dirty state management.
 */

import React, { useState, useMemo } from 'react';
import { Search, Plus, Save, RotateCcw, MoreVertical, X, AlertCircle } from 'lucide-react';

export interface CatalogItem {
  id: string;
  name: string;
  subtitle?: string;
  isDirty?: boolean;
}

export interface CatalogEditorShellProps<T extends CatalogItem> {
  title: string;
  icon?: React.ReactNode;
  items: T[];
  selectedId?: string;
  onSelect: (item: T) => void;
  onNew?: () => void;
  onSave?: (selectedItem: T) => void;
  onRevert?: (selectedItem: T) => void;
  onClose?: () => void;
  filterCategories?: string[];
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
  renderDetail: (selectedItem: T) => React.ReactNode;
  validationErrors?: string[];
}

export function CatalogEditorShell<T extends CatalogItem>({
  title,
  icon,
  items,
  selectedId,
  onSelect,
  onNew,
  onSave,
  onRevert,
  onClose,
  filterCategories,
  selectedCategory,
  onCategoryChange,
  renderDetail,
  validationErrors = [],
}: CatalogEditorShellProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSearch;
    });
  }, [items, searchQuery]);

  const activeItem = useMemo(() => {
    return items.find((it) => it.id === selectedId) || null;
  }, [items, selectedId]);

  return (
    <div className="flex flex-col h-full w-full bg-[#0d1117] text-white border border-white/10 rounded-lg overflow-hidden shadow-2xl text-xs select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#161b22] border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2 font-semibold text-white/90">
          {icon}
          <span>{title}</span>
          <span className="text-[10px] text-white/40 bg-white/5 px-1.5 py-0.5 rounded">
            {filteredItems.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {onNew && (
            <button
              onClick={onNew}
              className="flex items-center gap-1 px-2 py-1 bg-emerald-600/80 hover:bg-emerald-500 text-white rounded font-medium transition text-[11px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main split workspace */}
      <div className="flex flex-1 min-h-0 divide-x divide-white/10">
        {/* Left Master List */}
        <div className="w-1/3 min-w-[180px] max-w-[280px] flex flex-col bg-[#0d1117]/80">
          {/* Search bar */}
          <div className="p-2 border-b border-white/10">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-white/40" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2 py-1 bg-black/40 border border-white/10 rounded text-white placeholder-white/30 text-xs focus:outline-none focus:border-amber-500/60"
              />
            </div>
          </div>

          {/* Item List */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {filteredItems.map((item) => {
              const isSelected = item.id === selectedId;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelect(item)}
                  className={`w-full text-left px-3 py-2 flex flex-col gap-0.5 transition ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-300 font-medium'
                      : 'hover:bg-white/5 text-white/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{item.name}</span>
                    {item.isDirty && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    )}
                  </div>
                  {item.subtitle && (
                    <span className="text-[10px] text-white/40 truncate">
                      {item.subtitle}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Detail Pane */}
        <div className="flex-1 flex flex-col min-h-0 bg-[#12161f]">
          <div className="flex-1 overflow-y-auto p-3">
            {activeItem ? (
              renderDetail(activeItem)
            ) : (
              <div className="h-full flex items-center justify-center text-white/40 italic">
                Select an item to inspect or edit details.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#161b22] border-t border-white/10 shrink-0 text-[11px]">
        <div className="flex items-center gap-2 text-white/50">
          {validationErrors.length > 0 ? (
            <div className="flex items-center gap-1 text-rose-400 font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{validationErrors.length} validation issues</span>
            </div>
          ) : (
            <span className="text-emerald-400/80">Valid definition</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onRevert && activeItem?.isDirty && (
            <button
              onClick={() => onRevert(activeItem)}
              className="flex items-center gap-1 px-2 py-0.5 bg-white/5 hover:bg-white/10 rounded text-white/70 hover:text-white transition"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Revert</span>
            </button>
          )}
          {onSave && activeItem && (
            <button
              onClick={() => onSave(activeItem)}
              disabled={!activeItem.isDirty}
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded font-medium transition ${
                activeItem.isDirty
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-white/5 text-white/30 cursor-not-allowed'
              }`}
            >
              <Save className="w-3 h-3" />
              <span>Save</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
