import { CyberTerminal } from '@/components/cyber-terminal/dynamic';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sub-Network Terminal',
};

export default async function TerminalPage(props: { searchParams: Promise<{ characterId?: string, create?: string }> }) {
  const params = await props.searchParams;
  
  return (
    <div className="container py-8 max-w-4xl mx-auto flex flex-col items-center">
      <div className="w-full mb-8 text-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-cyan-500 bg-clip-text text-transparent mb-2 font-mono">
          SUB-NETWORK TERMINAL
        </h1>
        <p className="text-slate-400 font-mono text-sm">
          S.A.I.N.T. Authorized Personnel Only
        </p>
      </div>

      <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden aspect-video">
        <CyberTerminal characterId={params.characterId} forceCreate={params.create === 'true'} />
      </div>
      
      <div className="mt-8 text-slate-500 font-mono text-xs text-center max-w-md">
        <p>Controls: Click to pathfind, or use WASD/Arrows.</p>
        <p>Encrypted Sectors (Dark Green) have a 10% chance to trigger Decryption Protocol.</p>
      </div>
    </div>
  );
}
