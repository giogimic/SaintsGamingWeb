import React from 'react';

interface GamePanelShellProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  neonAccent?: 'cyan' | 'magenta' | 'pink' | 'lime' | 'red';
}

export function GamePanelShell({ 
  children, 
  className = '', 
  title,
  neonAccent = 'cyan'
}: GamePanelShellProps) {
  // Map our semantic accents to tailwind colors from the Neon Miami palette
  const accentClasses = {
    cyan: 'border-[#22d3ee] shadow-[0_0_8px_rgba(34,211,238,0.2)]',
    magenta: 'border-[#f472b6] shadow-[0_0_8px_rgba(244,114,182,0.2)]',
    pink: 'border-[#ec4899] shadow-[0_0_8px_rgba(236,72,153,0.2)]',
    lime: 'border-[#bef264] shadow-[0_0_8px_rgba(190,242,100,0.2)]',
    red: 'border-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.2)]',
  };

  const borderClass = accentClasses[neonAccent];

  return (
    <div className={`flex flex-col bg-[rgba(5,8,14,0.82)] backdrop-blur-sm border ${borderClass} rounded shadow-xl overflow-hidden ${className}`}>
      {title && (
        <div className="px-3 py-1.5 border-b border-white/10 bg-black/40 flex items-center shrink-0">
          <span className="text-xs font-bold uppercase tracking-wider text-white/90 drop-shadow-sm font-mono">
            {title}
          </span>
        </div>
      )}
      <div className="relative flex-1">
        {children}
      </div>
    </div>
  );
}
