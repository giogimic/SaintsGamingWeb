'use client';

import { ReactNode } from 'react';
import { HudPanelShell } from './hud/HudPanelShell';
import { X, Sparkles } from 'lucide-react';

interface RpgPanelProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  icon?: ReactNode;
  headerRight?: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export default function RpgPanel({
  title,
  onClose,
  children,
  icon,
  headerRight,
  className = '',
  bodyClassName = '',
}: RpgPanelProps) {
  return (
    <div className={`pointer-events-auto absolute inset-2 z-30 flex animate-in fade-in zoom-in-95 duration-200 flex-col md:inset-8 ${className}`}>
      <HudPanelShell
        className="w-full h-full shadow-2xl flex flex-col min-h-0"
        bodyClassName={`flex-1 min-h-0 overflow-hidden flex flex-col p-3 md:p-5 ${bodyClassName}`}
        title={title}
        icon={icon || <Sparkles className="w-4 h-4 text-cyan-400" />}
        headerRight={headerRight}
        onClose={onClose}
        noPadding
      >
        <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden text-slate-200">
          {children}
        </div>
      </HudPanelShell>
    </div>
  );
}

