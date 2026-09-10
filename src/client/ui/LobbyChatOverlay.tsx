import React, { useState, useEffect, useRef } from 'react';
import { useSessionStore } from '../state/useSessionStore';
import { useChatStore } from '../state/useChatStore';
import { useAppStore } from '@/shared/store/useAppStore';
import { MessageSquare, Send } from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';
import { socketManager } from '../net/SocketManager';

export function LobbyChatOverlay() {
  const messages = useChatStore((s) => s.messages);
  const mmoPlayerCount = useAppStore((s) => s.mmoPlayerCount);
  const { characterName, accountId } = useSessionStore();
  const [chatInput, setChatInput] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;

    soundSynth?.playUiClick?.();

    // Just send via socket - the server will echo it back to our ChatStore
    socketManager.emit('global_chat', text);
    
    // Also optimistically add it locally
    useChatStore.getState().addMessage({
      id: Date.now().toString(),
      sender: characterName || accountId || 'Operative',
      text,
      channel: 'GLOBAL',
      timestamp: Date.now(),
    });

    setChatInput('');
  };

  return (
    <section className="flex flex-col justify-between rounded-2xl border border-border/60 p-4 bg-card/60 backdrop-blur-xl shadow-xl relative overflow-hidden h-full">
      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <MessageSquare size={14} className="text-primary" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
            Lobby Comms
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/60 border border-white/10 text-[10px] font-mono text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{mmoPlayerCount > 0 ? `${mmoPlayerCount} Online` : 'Connected'}</span>
        </div>
      </div>

      <div
        ref={chatScrollRef}
        className="space-y-2.5 overflow-y-auto max-h-[340px] pr-1 mb-3 scrollbar-thin font-mono text-xs flex-1"
      >
        {messages.filter(m => m.channel === 'GLOBAL' || m.channel === 'SYSTEM').map((msg) => {
          const isSys = msg.channel === 'SYSTEM';
          const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          return (
            <div
              key={msg.id}
              className={`p-2.5 rounded-xl border leading-relaxed ${
                isSys
                  ? 'bg-primary/10 border-primary/20 text-primary text-[11px]'
                  : 'bg-black/50 border-white/5 text-foreground'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1 text-[10px] text-muted-foreground">
                <span className="font-bold text-primary">
                  {msg.sender}
                </span>
                <span>{time}</span>
              </div>
              <p className="text-xs break-words">{msg.text}</p>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSendChat} className="flex gap-2">
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="Broadcast to lobby players..."
          maxLength={160}
          className="flex-1 px-3 py-2 rounded-xl bg-black/60 border border-border text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors"
        />
        <button
          type="submit"
          disabled={!chatInput.trim()}
          className="px-3.5 py-2 rounded-xl bg-primary hover:brightness-110 text-primary-foreground font-mono font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center shadow-sm"
        >
          <Send size={13} />
        </button>
      </form>
    </section>
  );
}
