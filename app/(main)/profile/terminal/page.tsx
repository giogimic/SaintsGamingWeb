import { CyberTerminal } from '@/components/cyber-terminal/dynamic';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sub-Network Terminal',
};

export default async function TerminalPage(props: { searchParams: Promise<{ characterId?: string, create?: string }> }) {
  const params = await props.searchParams;
  
  return (
    <div className="container py-4 md:py-8 w-full max-w-5xl mx-auto flex flex-col items-center min-h-[calc(100vh-100px)]">
      <div className="w-full mb-4 md:mb-8 text-center px-2">
        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-400 to-cyan-500 bg-clip-text text-transparent mb-1 md:mb-2 font-mono">
          SUB-NETWORK TERMINAL
        </h1>
        <p className="text-slate-400 font-mono text-xs md:text-sm">
          S.A.I.N.T. Authorized Personnel Only
        </p>
      </div>

      <div className="w-full flex-grow flex items-center justify-center bg-slate-950 md:bg-slate-900 md:border border-slate-800 md:rounded-xl shadow-2xl overflow-hidden relative">
        <CyberTerminal characterId={params.characterId} forceCreate={params.create === 'true'} />
      </div>
      
      <div className="mt-4 md:mt-8 text-slate-500 font-mono text-[10px] md:text-xs text-center max-w-md px-4">
        <p>Controls: Click/Tap to pathfind, use WASD/Arrows, or use the on-screen D-Pad (Mobile).</p>
        <p className="mt-1">Encrypted Sectors (Dark Green) have a 10% chance to trigger Decryption Protocol.</p>
      </div>
    </div>
  );
}
