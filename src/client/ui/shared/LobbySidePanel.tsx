'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useChatStore } from '@/client/state/useChatStore';
import { socketManager } from '@/client/net/SocketManager';
import { getTopLobbyOperatives } from '@/app/actions/game';
import { soundSynth } from '@/engine/sound-synth';
import { MessageSquare, Trophy, Send, Crown } from 'lucide-react';

export function LobbySidePanel() {
  const { data: session } = useSession();
  const [activeSideTab, setActiveSideTab] = useState<'CHAT' | 'LEADERBOARD'>('CHAT');
  
  // Leaderboard
  const [topOperatives, setTopOperatives] = useState<any[]>([]);
  const [loadingLeaderboards, setLoadingLeaderboards] = useState(false);
  
  // Chat
  const [chatInput, setChatInput] = useState('');
  const messages = useChatStore((s) => s.messages);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchLeaderboards = async () => {
      setLoadingLeaderboards(true);
      try {
        const res = await getTopLobbyOperatives();
        if (res.success && res.data) setTopOperatives(res.data.slice(0, 6));
      } catch {} finally {
        setLoadingLeaderboards(false);
      }
    };
    fetchLeaderboards();
  }, []);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, activeSideTab]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    soundSynth?.playSelectSound?.();
    const senderName = session?.user?.name || (session?.user as any)?.username || 'Player';
    
    socketManager.emit('global_chat', text);
    useChatStore.getState().addMessage({
      id: Date.now().toString(),
      sender: senderName,
      text,
      channel: 'GLOBAL',
      timestamp: Date.now(),
    });
    setChatInput('');
  };

  return (
    <section className="lg:col-span-4 flex flex-col justify-between rounded-2xl border border-border/60 p-4 bg-card/60 backdrop-blur-xl shadow-xl relative overflow-hidden h-full min-h-[350px]">
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 mb-3">
        <button onClick={() => { soundSynth?.playSelectSound?.(); setActiveSideTab('CHAT'); }} className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeSideTab === 'CHAT' ? 'bg-primary/20 text-primary border border-primary/40 shadow-sm' : 'text-muted-foreground hover:text-foreground bg-card/30 border border-transparent'}`}>
          <MessageSquare size={13} className="text-primary" />Lobby Chat
        </button>
        <button onClick={() => { soundSynth?.playSelectSound?.(); setActiveSideTab('LEADERBOARD'); }} className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeSideTab === 'LEADERBOARD' ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-sm' : 'text-muted-foreground hover:text-foreground bg-card/30 border border-transparent'}`}>
          <Trophy size={13} className="text-amber-400" />Champions
        </button>
      </div>

      {activeSideTab === 'CHAT' && (
        <div className="flex-1 flex flex-col justify-between overflow-hidden">
          <div ref={chatScrollRef} className="flex-1 space-y-2.5 overflow-y-auto pr-1 mb-3 scrollbar-thin font-mono text-xs">
            {messages.filter(m => m.channel === 'GLOBAL' || m.channel === 'SYSTEM').map((msg) => {
              const isSys = msg.channel === 'SYSTEM';
              const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <div key={msg.id} className={`p-2.5 rounded-xl border leading-relaxed ${isSys ? 'bg-primary/10 border-primary/20 text-primary text-[11px]' : 'bg-black/50 border-white/5 text-foreground'}`}>
                  <div className="flex items-center justify-between gap-1 mb-1 text-[10px] text-muted-foreground"><span className="font-bold text-primary">{msg.sender}</span><span>{time}</span></div>
                  <p className="text-xs break-words">{msg.text}</p>
                </div>
              );
            })}
          </div>
          <form onSubmit={handleSendChat} className="flex gap-2 mt-auto">
            <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Chat with lobby players..." maxLength={160} className="flex-1 px-3 py-2 rounded-xl bg-black/60 border border-border text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors" />
            <button type="submit" disabled={!chatInput.trim()} className="px-3.5 py-2 rounded-xl bg-primary hover:brightness-110 text-primary-foreground font-mono font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center shadow-sm">
              <Send size={13} />
            </button>
          </form>
        </div>
      )}

      {activeSideTab === 'LEADERBOARD' && (
        <div className="flex-1 flex flex-col justify-between overflow-hidden">
          <div className="space-y-2 overflow-y-auto pr-1 flex-1">
            {loadingLeaderboards ? (
              <div className="text-center py-10 text-xs font-mono text-muted-foreground animate-pulse">Scanning realm rankings...</div>
            ) : topOperatives.length === 0 ? (
              <div className="text-center py-10 text-xs font-mono text-muted-foreground">No champion rankings recorded yet.</div>
            ) : (
              topOperatives.map((op, idx) => {
                let st: any = { level: 1, credits: 1000 };
                try { if (op.stateData) st = JSON.parse(op.stateData); } catch {}
                const isTop = idx === 0;
                return (
                  <div key={op.id || idx} className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${isTop ? 'bg-amber-500/10 border-amber-400/40 shadow-sm' : 'bg-black/40 border-white/5'}`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono font-black ${isTop ? 'bg-amber-500 text-white font-extrabold' : idx === 1 ? 'bg-slate-500 text-white' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-white/10 text-muted-foreground'}`}>
                        {isTop ? <Crown size={12} /> : idx + 1}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold font-mono text-foreground truncate">{op.name}</div>
                        <div className="text-[10px] font-mono text-primary">{op.classId || 'WARRIOR'}</div>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-xs font-black text-amber-300">LVL {st.level || op.level || 1}</div>
                      <div className="text-[9px] text-muted-foreground">{(st.credits || 1000).toLocaleString()} C</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="p-3 bg-black/40 rounded-xl border border-white/5 mt-3 text-center">
            <p className="text-[10px] font-mono text-muted-foreground">Earn EXP & Credits in battle to rank up on the Champions Leaderboard.</p>
          </div>
        </div>
      )}
    </section>
  );
}
