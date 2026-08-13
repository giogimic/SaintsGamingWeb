import React from 'react';
import { Search, Plus, Save, Trash2, RotateCcw, AlertTriangle, FileJson } from 'lucide-react';

export interface CatalogEditorShellProps<T> {
  title: string;
  items: T[];
  activeId: string | null;
  getItemId: (item: T) => string;
  getItemName: (item: T) => string;
  isDirty?: (item: T) => boolean;
  
  search: string;
  onSearchChange: (val: string) => void;
  
  onSelect: (id: string) => void;
  onCreateNew: () => void;
  onSave: () => Promise<void>;
  onRevert: () => void;
  onDelete: () => Promise<void>;
  
  saving?: boolean;
  validationError?: string | null;
  children: React.ReactNode;
}

export function CatalogEditorShell<T>({
  title,
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
  children
}: CatalogEditorShellProps<T>) {

  return (
    <div className="flex flex-col h-full bg-[#0b1320] text-[#e2d5b3] font-mono text-[11px] select-none">
      <div className="flex items-center justify-between p-2 bg-[#050b14] border-b border-[#806f47]/30 shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-[13px] font-bold text-[#cbb26a] tracking-wide uppercase">{title}</h2>
          
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-[#806f47]" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="bg-[#111a2a] border border-[#806f47]/40 rounded pl-7 pr-2 py-1 outline-none focus:border-[#cbb26a] w-48 text-[#e2d5b3]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onCreateNew}
            className="flex items-center gap-1.5 px-2 py-1 bg-[#23354f] hover:bg-[#2d4263] border border-[#405c87] rounded transition-colors text-white shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="w-64 border-r border-[#806f47]/30 flex flex-col bg-[#050b14]/50 shrink-0 overflow-y-auto custom-scrollbar">
          {items.length === 0 ? (
            <div className="p-4 text-[#806f47]/60 italic text-center">No items found.</div>
          ) : (
            <div className="flex flex-col p-1 gap-0.5">
              {items.map(item => {
                const id = getItemId(item);
                const isActive = id === activeId;
                const dirty = isDirty ? isDirty(item) : false;
                return (
                  <button
                    key={id}
                    onClick={() => onSelect(id)}
                    className={`flex items-center justify-between px-2 py-1.5 rounded text-left transition-colors truncate ${
                      isActive 
                        ? 'bg-[#cbb26a]/20 text-[#cbb26a] font-bold shadow-[inset_2px_0_0_#cbb26a]' 
                        : 'hover:bg-[#806f47]/10 text-[#a59981]'
                    }`}
                  >
                    <span className="truncate">{getItemName(item)}</span>
                    {dirty && <span className="text-[#e5c07b] font-bold shrink-0">*</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col min-w-0 bg-[#0b1320]">
          {activeId !== null ? (
            <>
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {children}
              </div>
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
                  <button
                    onClick={onDelete}
                    className="flex items-center gap-1.5 px-3 py-1 bg-[#1a0b0b] hover:bg-[#331111] text-[#e06c75] border border-[#e06c75]/40 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                  <button
                    onClick={onRevert}
                    className="flex items-center gap-1.5 px-3 py-1 bg-[#1a2333] hover:bg-[#23354f] border border-[#806f47]/40 rounded transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#a59981]" />
                    <span>Revert</span>
                  </button>
                  <button
                    onClick={onSave}
                    disabled={saving}
                    className={`flex items-center gap-1.5 px-4 py-1 rounded font-bold shadow-sm transition-colors ${
                      saving
                        ? 'bg-[#1a2333] text-[#5c6370] cursor-not-allowed'
                        : 'bg-[#cbb26a] text-[#050b14] hover:bg-[#d4c38d] shadow-[0_0_10px_rgba(203,178,106,0.3)]'
                    }`}
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? 'Saving...' : 'Save'}</span>
                  </button>
                </div>
              </div>
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
