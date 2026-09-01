'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, LucideIcon } from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';

export interface WindowMenuItemProps {
  label: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  shortcut?: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  divider?: boolean;
  danger?: boolean;
}

export interface WindowMenuDropdownProps {
  label: string;
  items: WindowMenuItemProps[];
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
}

/** Container for the thin sub-menu bar under a window's title bar */
export const WindowMenuBar: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return (
    <div
      className={`
        flex items-center gap-0.5 px-2 py-1 bg-[#060e1c]/80 border-b border-border/30
        text-[10px] font-mono text-muted-foreground select-none shrink-0 overflow-x-auto custom-scrollbar
        ${className}
      `}
    >
      {children}
    </div>
  );
};

/** Dropdown menu item inside WindowMenuBar */
export const WindowMenuDropdown: React.FC<WindowMenuDropdownProps> = ({
  label,
  items,
  icon: Icon,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          soundSynth?.playUiClick?.();
          setIsOpen(!isOpen);
        }}
        className={`
          flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer
          ${isOpen
            ? 'bg-primary/20 text-primary font-bold'
            : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
          }
        `}
      >
        {Icon && <Icon className="w-3 h-3 text-primary/80" />}
        <span>{label}</span>
        <ChevronDown className="w-2.5 h-2.5 opacity-60" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 min-w-[170px] bg-[#050b14]/95 border border-border/50 rounded-lg shadow-2xl p-1 z-50 backdrop-blur-xl animate-in fade-in-50 zoom-in-95 duration-100">
          {items.map((item, idx) => {
            if (item.divider) {
              return <div key={idx} className="my-1 border-t border-border/30" />;
            }
            const ItemIcon = item.icon;
            return (
              <button
                key={idx}
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  if (item.disabled) return;
                  soundSynth?.playSelectSound?.();
                  setIsOpen(false);
                  item.onClick?.();
                }}
                className={`
                  w-full flex items-center justify-between gap-2 px-2 py-1 rounded text-left text-[10px] transition-colors cursor-pointer
                  ${item.disabled ? 'opacity-40 cursor-not-allowed' : ''}
                  ${item.danger
                    ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                    : item.active
                    ? 'bg-primary/20 text-primary font-bold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-foreground/10'
                  }
                `}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {ItemIcon && <ItemIcon className="w-3 h-3 shrink-0" />}
                  <span className="truncate">{item.label}</span>
                </div>
                {item.shortcut && (
                  <span className="text-[8.5px] font-mono text-muted-foreground/60 shrink-0 ml-2">
                    {item.shortcut}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/** Quick icon/text button on the WindowMenuBar */
export const WindowMenuButton: React.FC<{
  label?: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  title?: string;
  active?: boolean;
  disabled?: boolean;
  danger?: boolean;
  className?: string;
}> = ({
  label,
  icon: Icon,
  onClick,
  title,
  active,
  disabled,
  danger,
  className = '',
}) => {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        soundSynth?.playUiClick?.();
        onClick?.();
      }}
      className={`
        flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer shrink-0
        ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
        ${danger
          ? 'text-red-400 hover:bg-red-500/10'
          : active
          ? 'bg-primary/20 text-primary border border-primary/40 font-bold'
          : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
        }
        ${className}
      `}
    >
      {Icon && <Icon className="w-3 h-3 shrink-0" />}
      {label && <span>{label}</span>}
    </button>
  );
};

/** Segmented Tab Switcher for WindowMenuBar */
export const WindowMenuTabGroup: React.FC<{
  tabs: Array<{ id: string; label: string; icon?: LucideIcon | React.ComponentType<{ className?: string }> }>;
  activeTab: string;
  onChange: (id: string) => void;
}> = ({ tabs, activeTab, onChange }) => {
  return (
    <div className="flex items-center bg-black/40 p-0.5 rounded border border-border/30 shrink-0">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              soundSynth?.playUiClick?.();
              onChange(tab.id);
            }}
            className={`
              flex items-center gap-1 px-2 py-0.5 rounded text-[9.5px] font-bold transition-all cursor-pointer
              ${isActive
                ? 'bg-primary/25 text-primary border border-primary/40 shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent'
              }
            `}
          >
            {Icon && <Icon className="w-2.5 h-2.5" />}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

/** Thin vertical divider */
export const WindowMenuDivider: React.FC = () => {
  return <div className="h-3.5 w-px bg-border/40 mx-1 shrink-0" />;
};
