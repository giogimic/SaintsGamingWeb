import { CyberTerminal } from '@/components/cyber-terminal/dynamic';
import type { Metadata } from 'next';
import { Gamepad2, Navigation, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'The Lobby | Saints Gaming',
  description: 'The main online social hub and virtual metaverse for Saints Gaming community members.',
};

export default async function TerminalPage(props: { searchParams: Promise<{ characterId?: string, create?: string }> }) {
  const params = await props.searchParams;
  
  return (
    <div className="container py-6 md:py-10 w-full max-w-6xl mx-auto flex flex-col items-center min-h-[calc(100vh-100px)]">
      <div className="w-full mb-6 md:mb-8 text-center px-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3">
          <ShieldCheck className="w-3.5 h-3.5" /> Official Community World
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold bg-gradient-to-r from-purple-400 via-emerald-400 to-amber-400 bg-clip-text text-transparent tracking-tight mb-2">
          THE LOBBY
        </h1>
        <p className="text-muted-foreground text-sm md:text-base max-w-lg mx-auto">
          The main online social hub & virtual universe of Saints Gaming.
        </p>
      </div>

      <div className="w-full flex-grow flex items-center justify-center bg-card/70 border border-border/50 rounded-2xl sg-glass shadow-2xl overflow-hidden relative p-1 md:p-4 backdrop-blur-xl">
        <CyberTerminal characterId={params.characterId} forceCreate={params.create === 'true'} />
      </div>
      
      <div className="mt-6 text-muted-foreground text-xs text-center max-w-xl px-4 flex flex-wrap items-center justify-center gap-4 font-medium">
        <span className="flex items-center gap-1.5 bg-muted/40 px-3 py-1.5 rounded-lg border border-border/40">
          <Navigation className="w-3.5 h-3.5 text-emerald-400" /> Click / Tap to Pathfind
        </span>
        <span className="flex items-center gap-1.5 bg-muted/40 px-3 py-1.5 rounded-lg border border-border/40">
          <Gamepad2 className="w-3.5 h-3.5 text-purple-400" /> WASD / Touch D-Pad Controls
        </span>
      </div>
    </div>
  );
}
