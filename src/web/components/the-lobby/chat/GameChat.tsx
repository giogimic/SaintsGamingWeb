'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store';
import { FriendsList } from '@/web/components/messenger/friends-list';
import { ChatWindow } from '@/web/components/messenger/chat-window';
import { useMessenger } from '@/web/components/messenger/messenger-provider';

type TabType = 'LOCAL' | 'GLOBAL' | 'PARTY' | 'FRIENDS';

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  type: 'LOCAL' | 'GLOBAL' | 'PARTY' | 'SYSTEM';
}

function FriendsWrapper() {
  const { activeChat } = useMessenger();
  return activeChat ? (
    <div className="h-full bg-background"><ChatWindow /></div>
  ) : (
    <div className="h-full bg-background"><FriendsList /></div>
  );
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

    // Phase 8: Social Commands
    if (text.startsWith('/p join ')) {
      const leaderName = text.replace('/p join ', '').trim();
      emitSocketEvent?.('party_join', leaderName);
      setChatInput('');
      return;
    }
    if (text === '/p leave') {
      emitSocketEvent?.('party_leave', {});
      setChatInput('');
      return;
    }

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
    <div className="w-[480px] h-[200px] flex flex-col z-50 pointer-events-auto shadow-[2px_2px_10px_rgba(0,0,0,0.8)]" style={{
      backgroundColor: '#52493d',
      border: '2px solid #383024',
      borderTopColor: '#7a6f5d',
      borderLeftColor: '#7a6f5d',
      borderRadius: '4px'
    }}>
      {/* CONTENT AREA */}
      <div className="flex-1 overflow-hidden relative m-[3px] bg-[#d5c3a3] border border-[#383024] border-t-[#221c13] border-left-[#221c13]">
        {activeTab === 'FRIENDS' ? (
          <FriendsWrapper />
        ) : (
          <div ref={scrollRef} className="h-full w-full p-2 overflow-y-auto space-y-0.5 scrollbar-thin scrollbar-thumb-[#52493d] scrollbar-track-[#d5c3a3]">
            {filteredMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-[#7a6f5d] text-sm italic font-serif">
                <span>No messages in this channel.</span>
              </div>
            ) : (
              filteredMessages.map((msg) => {
                
                // Color coding based on channel (RS style)
                let prefix = '';
                let textStyle = { color: 'black', textShadow: 'none' };
                let senderStyle = { color: 'black' };
                
                if (msg.type === 'PARTY') {
                  prefix = '[Clan] ';
                  textStyle = { color: '#7e22ce', textShadow: '1px 1px 0px rgba(255,255,255,0.3)' }; // Purple
                  senderStyle = { color: '#000000' };
                } else if (msg.type === 'GLOBAL') {
                  prefix = '[Global] ';
                  textStyle = { color: '#0284c7', textShadow: '1px 1px 0px rgba(255,255,255,0.3)' }; // Cyan/blue
                  senderStyle = { color: '#000000' };
                } else {
                  // LOCAL chat
                  textStyle = { color: '#0000ff', textShadow: '1px 1px 0px rgba(255,255,255,0.3)' }; // RS blue chat
                  senderStyle = { color: '#000000' };
                }

                return (
                  <div
                    key={msg.id}
                    className="flex text-[14px] leading-tight font-serif"
                  >
                    <span style={senderStyle} className="mr-1">
                      {prefix}{msg.sender}:
                    </span>
                    <span style={textStyle} className="break-words">
                      {msg.text}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* EMOTE POPUP */}
      {showEmotes && activeTab !== 'FRIENDS' && (
        <div className="absolute bottom-16 left-2 p-2 bg-[#52493d] border-2 border-[#383024] rounded-sm flex gap-1.5 text-lg z-50">
          {['👋', '⚔️', '🔥', '🏆', 'GG', '❤️', '👀', '🎉'].map((e) => (
            <button
              key={e}
              onClick={() => handleEmoteClick(e)}
              className="hover:bg-[#7a6f5d] transition-colors p-1 rounded-sm"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {/* INPUT AREA */}
      {activeTab !== 'FRIENDS' && (
        <div className="flex items-center px-1 pb-1 pt-0.5 gap-1 h-[24px]">
          <span className="text-[#d5c3a3] font-serif text-[14px] leading-none whitespace-nowrap pl-1 font-bold shadow-black drop-shadow-md">
            {player.name || 'You'}: 
          </span>
          <input
            type="text"
            placeholder=""
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            className="flex-1 bg-transparent text-[#0000ff] font-serif font-bold text-[14px] px-1 h-full border-none outline-none"
            style={{ textShadow: '1px 1px 0px rgba(255,255,255,0.3)' }}
          />
        </div>
      )}
      
      {/* HEADER & TABS (Moved to bottom RS style) */}
      <div className="flex px-[3px] pb-[3px] gap-[2px] h-[24px]">
        {[
          { id: 'LOCAL', label: 'Public' },
          { id: 'GLOBAL', label: 'Global' },
          { id: 'PARTY', label: 'Clan' },
          { id: 'FRIENDS', label: 'Friends' }
        ].map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as TabType)}
              className={`flex-1 flex items-center justify-center text-[12px] font-bold font-serif transition-colors border ${
                isActive
                  ? 'bg-[#7a6f5d] text-[#ffffff] border-[#383024] border-t-[#a89b88] border-l-[#a89b88]'
                  : 'bg-[#52493d] text-[#d5c3a3] hover:text-white border-[#383024] border-t-[#7a6f5d] border-l-[#7a6f5d]'
              }`}
              style={isActive ? { textShadow: '1px 1px 1px black' } : {}}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
