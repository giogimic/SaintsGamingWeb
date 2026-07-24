'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store';
import { FriendsList } from '@/components/messenger/friends-list';
import { ChatWindow } from '@/components/messenger/chat-window';
import { useMessenger } from '@/components/messenger/messenger-provider';
import { ScrollArea } from '@/components/ui/scroll-area';

type TabType = 'LOCAL' | 'GLOBAL' | 'PARTY' | 'FRIENDS';

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  type: 'LOCAL' | 'GLOBAL' | 'PARTY' | 'SYSTEM';
}

export function GameChat() {
  const [activeTab, setActiveTab] = useState<TabType>('LOCAL');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const emitSocketEvent = useGameStore((state) => state.emitSocketEvent);
  const player = useGameStore((state) => state.player);
  
  const { activeChat } = useMessenger();

  useEffect(() => {
    // Listen for custom window events dispatched by index.tsx when a socket message arrives
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
  }, [messages, activeTab, activeChat]);

  const handleSend = () => {
    if (chatInput.trim().length > 0) {
      if (activeTab === 'LOCAL') {
        emitSocketEvent?.('chat_message', chatInput.trim());
        useGameStore.getState().setPlayerChat(chatInput.trim());
        
        // Add locally to history
        const msg: ChatMessage = {
          id: Date.now().toString(),
          sender: player.name || 'You',
          text: chatInput.trim(),
          timestamp: Date.now(),
          type: 'LOCAL'
        };
        setMessages((prev) => [...prev, msg].slice(-100));
        
      } else if (activeTab === 'GLOBAL') {
        emitSocketEvent?.('global_chat', chatInput.trim());
      } else if (activeTab === 'PARTY') {
        emitSocketEvent?.('party_chat', chatInput.trim());
      }

      setChatInput('');
    }
  };

  return (
    <div className="absolute bottom-4 left-4 w-[350px] h-[400px] bg-black/85 backdrop-blur border border-[#333] rounded-lg shadow-[0_0_20px_rgba(0,0,0,0.8)] flex flex-col z-50 overflow-hidden pointer-events-auto">
      {/* TABS */}
      <div className="flex bg-slate-900/80 border-b border-[#333]">
        {['LOCAL', 'GLOBAL', 'PARTY', 'FRIENDS'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as TabType)}
            className={`flex-1 py-1.5 text-[10px] font-bold font-mono transition-colors tracking-widest ${
              activeTab === tab
                ? 'bg-cyan-950/80 text-cyan-300 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'FRIENDS' ? (
          activeChat ? (
            <div className="h-full bg-background"><ChatWindow /></div>
          ) : (
            <div className="h-full bg-background"><FriendsList /></div>
          )
        ) : (
          <div ref={scrollRef} className="h-full w-full p-2 text-xs font-mono overflow-y-auto">
            {messages.filter(m => activeTab === 'LOCAL' ? m.type === 'LOCAL' : m.type === activeTab).map((msg) => (
              <div key={msg.id} className="mb-1 leading-tight hover:bg-white/5 p-1 rounded transition-colors">
                <span className="text-slate-500">[{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}] </span>
                <span className={`font-bold ${msg.sender === (player.name || 'You') ? 'text-cyan-400' : 'text-amber-300'}`}>
                  {msg.sender}: 
                </span>
                <span className="text-white ml-1 break-words">{msg.text}</span>
              </div>
            ))}
            {messages.filter(m => activeTab === 'LOCAL' ? m.type === 'LOCAL' : m.type === activeTab).length === 0 && (
              <div className="text-slate-500 italic text-center mt-10">No messages yet.</div>
            )}
          </div>
        )}
      </div>

      {/* INPUT AREA */}
      {activeTab !== 'FRIENDS' && (
        <div className="flex border-t border-[#333]">
          <input
            type="text"
            placeholder={`Chat in ${activeTab.toLowerCase()}...`}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            className="flex-1 bg-black/60 text-white font-mono text-[11px] p-2 focus:outline-none focus:bg-black/90 transition-colors"
          />
          <button
            onClick={handleSend}
            className="bg-cyan-900/40 hover:bg-cyan-800/80 text-cyan-300 font-bold font-mono text-[10px] px-4 transition-colors border-l border-[#333]"
          >
            SEND
          </button>
        </div>
      )}
    </div>
  );
}
