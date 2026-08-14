'use client';

import React from 'react';
import { HudPanelShell } from '../hud/HudPanelShell';

interface GamePanelShellProps {
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  title?: string;
  neonAccent?: 'cyan' | 'magenta' | 'pink' | 'lime' | 'red';
  onClose?: () => void;
}

export function GamePanelShell({ 
  children, 
  className = '', 
  bodyClassName = '',
  title,
  neonAccent = 'cyan',
  onClose,
}: GamePanelShellProps) {
  const stateMapping = {
    cyan: 'none' as const,
    magenta: 'active' as const,
    pink: 'active' as const,
    lime: 'active' as const,
    red: 'alert' as const,
  }[neonAccent];

  return (
    <HudPanelShell
      title={title}
      onClose={onClose}
      className={className}
      bodyClassName={bodyClassName}
      accentState={stateMapping}
    >
      {children}
    </HudPanelShell>
  );
}

export default GamePanelShell;
