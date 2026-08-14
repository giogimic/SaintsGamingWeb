'use client';

import React, { ReactNode } from 'react';
import { HudPanelShell } from './HudPanelShell';

interface GamePanelShellProps {
  title?: string;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  neonAccent?: 'cyan' | 'magenta' | 'lime' | 'red';
}

export function GamePanelShell({ 
  title, 
  onClose, 
  children, 
  className = '', 
  bodyClassName = '',
  neonAccent = 'cyan' 
}: GamePanelShellProps) {
  const stateMapping = {
    cyan: 'none' as const,
    magenta: 'active' as const,
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
