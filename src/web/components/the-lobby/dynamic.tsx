'use client';

import dynamic from 'next/dynamic';

const loading = (
  <div className="w-full h-full min-h-[320px] bg-black border border-white/10 rounded-lg flex items-center justify-center font-mono text-[#cbb26a]">
    Initializing The Lobby...
  </div>
);

export const TheLobby = dynamic(() => import('./PlayerClient'), {
  ssr: false,
  loading: () => loading,
});

export const StudioLobby = dynamic(() => import('./StudioClient'), {
  ssr: false,
  loading: () => loading,
});

// Backwards compatibility alias
export const CyberTerminal = TheLobby;
