'use client';

import dynamic from 'next/dynamic';

export const CyberTerminal = dynamic(() => import('./index'), {
  ssr: false,
  loading: () => (
    <div className="w-[480px] h-[480px] bg-black border border-white/10 rounded-lg flex items-center justify-center font-mono text-green-500">
      Initializing Sub-Network Terminal...
    </div>
  ),
});
