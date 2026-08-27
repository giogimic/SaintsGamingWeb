'use client';

import React, { useState, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { Search, ChevronDown, Check } from 'lucide-react';

export interface RegistryOption {
  value: string;
  label: string;
  description?: string;
  icon?: string;
}

export interface RegistryComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: RegistryOption[];
  placeholder?: string;
  className?: string;
  emptyText?: string;
  disabled?: boolean;
}

export const RegistryCombobox: React.FC<RegistryComboboxProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  className,
  emptyText = 'No matching options found.',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectedOption = options.find((o) => o.value === value) || null;
  
  const filteredOptions = options.filter((o) => 
    o.label.toLowerCase().includes(search.toLowerCase()) || 
    o.value.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={clsx('relative w-full text-[11px] font-mono', className)} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "flex items-center justify-between w-full bg-input border rounded-lg px-2.5 py-1.5 transition-colors text-left outline-none",
          disabled ? "opacity-50 cursor-not-allowed border-border/50 text-foreground/50" : "border-border hover:border-sg-gold focus:border-sg-gold text-foreground",
          isOpen && "border-sg-gold ring-1 ring-sg-gold/20"
        )}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : <span className="text-muted-foreground">{placeholder}</span>}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-2" />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-[#090f1b] border border-border rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-1 duration-150 ease-out origin-top">
          <div className="flex items-center px-2 py-1.5 border-b border-border/50 bg-[#0c1322]">
            <Search className="w-3.5 h-3.5 text-muted-foreground mr-2 shrink-0" />
            <input
              type="text"
              autoFocus
              className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="max-h-48 overflow-y-auto p-1 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="px-2 py-3 text-center text-muted-foreground italic">
                {emptyText}
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={clsx(
                    "flex items-center w-full px-2 py-1.5 rounded-md hover:bg-white/5 transition-colors text-left",
                    value === opt.value ? "bg-sg-gold/10 text-sg-gold" : "text-slate-300"
                  )}
                >
                  <div className="flex-1 truncate">
                    <div className="font-semibold">{opt.label}</div>
                    {opt.description && (
                      <div className="text-[9px] text-muted-foreground truncate">{opt.description}</div>
                    )}
                  </div>
                  {value === opt.value && (
                    <Check className="w-3.5 h-3.5 ml-2 shrink-0 text-sg-gold" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
