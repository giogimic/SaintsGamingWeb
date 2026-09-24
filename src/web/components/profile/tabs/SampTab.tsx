"use client";

import { formatDistanceToNow } from "date-fns";
import { Server, User, Activity, Clock, Target } from "lucide-react";

type SampSession = {
  id: string;
  playerName: string;
  score: number;
  isOnline: boolean;
  lastSeen: Date;
  server: {
    name: string;
  };
};

export function SampTab({ sessions }: { sessions: SampSession[] }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sessions.map((session) => (
          <div 
            key={session.id} 
            className="group relative rounded-xl overflow-hidden border border-border/50 bg-card/40 backdrop-blur-sm transition-all hover:border-[rgb(var(--profile-accent))]/50 hover:shadow-lg p-5 flex flex-col gap-4"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">{session.playerName}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <Server className="w-3 h-3" />
                    <span className="truncate">{session.server.name}</span>
                  </div>
                </div>
              </div>
              
              {/* Online Status Badge */}
              <div className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shrink-0 ${session.isOnline ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-muted text-muted-foreground border border-border'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${session.isOnline ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'}`} />
                {session.isOnline ? 'Online' : 'Offline'}
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="bg-black/20 border border-white/5 rounded-lg p-3 flex flex-col items-center justify-center text-center">
                <Target className="w-4 h-4 text-[rgb(var(--profile-accent))] mb-1 opacity-80" />
                <span className="text-xl font-bold text-white">{session.score.toLocaleString()}</span>
                <span className="text-[10px] uppercase tracking-wider text-white/50 font-medium">Score</span>
              </div>
              <div className="bg-black/20 border border-white/5 rounded-lg p-3 flex flex-col items-center justify-center text-center">
                <Clock className="w-4 h-4 text-[rgb(var(--profile-accent))] mb-1 opacity-80" />
                <span className="text-sm font-semibold text-white/90 truncate w-full">
                  {formatDistanceToNow(new Date(session.lastSeen), { addSuffix: true })}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-white/50 font-medium mt-1">Last Seen</span>
              </div>
            </div>
            
            {/* Optional decoration line */}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[rgb(var(--profile-accent))]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        ))}
      </div>
    </div>
  );
}
