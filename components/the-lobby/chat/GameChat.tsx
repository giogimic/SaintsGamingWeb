'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store';
import { FriendsList } from '@/components/messenger/friends-list';
import { ChatWindow } from '@/components/messenger/chat-window';
import { useMessenger } from '@/components/messenger/messenger-provider';
import { MapPin, Globe, Users, MessageSquare, Send, Smile } from 'lucide-react';

type TabType = 'LOCAL' | 'GLOBAL' | 'PARTY' | 'FRIENDS';

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  type: 'LOCAL' | 'GLOBAL' | 'PARTY' | 'SYSTEM';
}

function FriendsWrapper() {
  try {
    const { activeChat } = useMessenger();
    return activeChat ? (
      <div className="h-full bg-background"><ChatWindow /></div>
    ) : (
      <div className="h-full bg-background"><FriendsList /></div>
    );
  } catch (_e) {
    return (
      <div className="p-4 text-center text-xs font-mono text-slate-400">
        <p className="mb-2 text-amber-400">Messenger Not Linked</p>
        <p className="text-[11px] text-slate-500">Sign in to your Saints Gaming account to access site friends list and direct messages.</p>
      </div>
    );
  }
}

export function GameChat() {
  const [activeTab, setActiveTab] = useState<TabType>('LOCAL');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showEmotes, setShowEmotes] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const emitSocketEvent = useGameStore((state) => state.emitSocketEvent);
  const player = useGameStore((state) => state.player);

  useEffect(() => {
    // Listen for custom window events dispatched when socket messages arrive
    const handleNewMessage = (e: CustomEvent<ChatMessage>) => {
      setMessages((prev) => [...prev, e.detail].slice(-100)); // Keep last 100
    };

    window.addEventListener('game_chat_msg' as any, handleNewMessage);
    return () => window.removeEventListener('game_chat_msg' as any, handleNewMessage);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeTab]);

  const handleSend = () => {
    const text = chatInput.trim();
    if (!text) return;

    if (activeTab === 'LOCAL') {
      emitSocketEvent?.('chat_message', text);
      useGameStore.getState().setPlayerChat(text);
      
      const msg: ChatMessage = {
        id: Date.now().toString(),
        sender: player.name || 'You',
        text,
        timestamp: Date.now(),
        type: 'LOCAL'
      };
      setMessages((prev) => [...prev, msg].slice(-100));
      
    } else if (activeTab === 'GLOBAL') {
      emitSocketEvent?.('global_chat', text);
      const msg: ChatMessage = {
        id: Date.now().toString(),
        sender: player.name || 'You',
        text,
        timestamp: Date.now(),
        type: 'GLOBAL'
      };
      setMessages((prev) => [...prev, msg].slice(-100));
    } else if (activeTab === 'PARTY') {
      emitSocketEvent?.('party_chat', text);
      const msg: ChatMessage = {
        id: Date.now().toString(),
        sender: player.name || 'You',
        text,
        timestamp: Date.now(),
        type: 'PARTY'
      };
      setMessages((prev) => [...prev, msg].slice(-100));
    }

    setChatInput('');
    setShowEmotes(false);
  };

  const handleEmoteClick = (emote: string) => {
    setChatInput((prev) => prev + emote);
    setShowEmotes(false);
  };

  const filteredMessages = messages.filter(
    (m) => activeTab === 'LOCAL' ? m.type === 'LOCAL' : m.type === activeTab
  );

  return (
    <div className="absolute bottom-4 left-4 w-[380px] h-[360px] bg-[#0c1017]/90 backdrop-blur-md border border-cyan-500/30 rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col z-50 overflow-hidden pointer-events-auto transition-all">
      {/* HEADER & TABS */}
      <div className="flex bg-[#06090e]/90 border-b border-cyan-900/40">
        {[
          { id: 'LOCAL', label: 'MAP', icon: MapPin },
          { id: 'GLOBAL', label: 'WORLD', icon: Globe },
          { id: 'PARTY', label: 'PARTY', icon: Users },
          { id: 'FRIENDS', label: 'FRIENDS', icon: MessageSquare }
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as TabType)}
              className={`flex-1 py-2 text-[10px] font-bold font-mono transition-all flex items-center justify-center gap-1.5 border-b-2 ${
                isActive
                  ? 'bg-cyan-950/70 text-cyan-300 border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.3)]'
                  : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/50'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-hidden relative bg-gradient-to-b from-[#0a0d14]/40 to-[#040609]/60">
        {activeTab === 'FRIENDS' ? (
          <FriendsWrapper />
        ) : (
          <div ref={scrollRef} className="h-full w-full p-2.5 text-xs font-mono overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-cyan-900/50">
            {filteredMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-[11px] italic">
                <MessageSquare className="w-6 h-6 mb-1 opacity-30 text-cyan-400" />
                <span>No messages in {activeTab.toLowerCase()} channel yet.</span>
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isMe = msg.sender === (player.name || 'You');
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col text-[11px] leading-relaxed p-1.5 rounded-lg border transition-all ${
                      isMe
                        ? 'bg-cyan-950/30 border-cyan-500/20 text-cyan-100 ml-4'
                        : 'bg-slate-900/40 border-slate-800 text-slate-200 mr-4'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[9px] text-slate-400 mb-0.5 font-sans">
                      <span className={`font-bold ${isMe ? 'text-cyan-400' : 'text-amber-400'}`}>
                        {msg.sender}
                      </span>
                      <span className="text-slate-500">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <span className="break-words text-white">{msg.text}</span>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* EMOTE POPUP */}
      {showEmotes && activeTab !== 'FRIENDS' && (
        <div className="absolute bottom-12 left-2 p-2 bg-[#0d121d] border border-cyan-500/40 rounded-lg shadow-xl flex gap-2 text-base z-50 animate-in fade-in zoom-in-95">
          {['👋', '⚔️', '🔥', '🏆', 'GG', '❤️', '👀', '🎉'].map((e) => (
            <button
              key={e}
              onClick={() => handleEmoteClick(e)}
              className="hover:scale-125 transition-transform p-1 rounded hover:bg-cyan-950"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {/* INPUT AREA */}
      {activeTab !== 'FRIENDS' && (
        <div className="flex items-center bg-[#070a0f] border-t border-cyan-900/30 p-1.5 gap-1.5">
          <button
            onClick={() => setShowEmotes(!showEmotes)}
            className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800/60 rounded transition-colors"
            title="Quick Emotes"
          >
            <Smile className="w-4 h-4" />
          </button>
          <input
            type="text"
            placeholder={`Chat in ${activeTab.toLowerCase()}... (Press Enter)`}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            className="flex-1 bg-[#0f1522] text-white font-mono text-[11px] px-3 py-1.5 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500/50 transition-colors placeholder:text-slate-600"
          />
          <button
            onClick={handleSend}
            disabled={!chatInput.trim()}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 text-white font-bold font-mono text-[10px] px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 active:scale-95 shadow-md"
          >
            <Send className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
