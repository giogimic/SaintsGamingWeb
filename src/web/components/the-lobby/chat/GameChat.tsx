'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store';
import { FriendsList } from '@/web/components/messenger/friends-list';
import { ChatWindow } from '@/web/components/messenger/chat-window';
import { useMessenger } from '@/web/components/messenger/messenger-provider';
import { useAuth } from '@/shared/hooks/use-auth';
import { Radio } from 'lucide-react';

type TabType = 'LOCAL' | 'GLOBAL' | 'PARTY' | 'FRIENDS';

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  type: 'LOCAL' | 'GLOBAL' | 'PARTY' | 'WHISPER' | 'SYSTEM';
  recipient?: string;
}

function FriendsWrapper() {
  const { activeChat } = useMessenger();
  return activeChat ? (
    <div className="h-full bg-lobby-bg/95"><ChatWindow /></div>
  ) : (
    <div className="h-full bg-lobby-bg/95"><FriendsList /></div>
  );
}

function msgClass(type: ChatMessage['type']) {
  switch (type) {
    case 'PARTY':
      return 'lobby-chat-msg-party';
    case 'GLOBAL':
      return 'lobby-chat-msg-global';
    case 'SYSTEM':
      return 'lobby-chat-msg-system';
    case 'WHISPER':
      return 'lobby-chat-msg-whisper';
    default:
      return 'lobby-chat-msg-local';
  }
}

export function GameChat() {
  const [activeTab, setActiveTab] = useState<TabType>('LOCAL');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showEmotes, setShowEmotes] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const emitSocketEvent = useGameStore((state) => state.emitSocketEvent);
  const player = useGameStore((state) => state.player);
  const { isModerator } = useAuth();

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        (activeEl as HTMLElement)?.isContentEditable;

      if (e.key === 'Enter' && !isTyping) {
        e.preventDefault();
        setIsExpanded(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      } else if (e.key === 'Escape' && isExpanded) {
        inputRef.current?.blur();
        setIsExpanded(false);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isExpanded]);

  useEffect(() => {
    const handleNewMessage = (e: CustomEvent<ChatMessage>) => {
      setMessages((prev) => [...prev, e.detail].slice(-100));
    };

    window.addEventListener('game_chat_msg' as any, handleNewMessage);
    return () => window.removeEventListener('game_chat_msg' as any, handleNewMessage);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeTab]);

  const handleSend = () => {
    const text = chatInput.trim();
    if (!text) return;

    // Whispers (/w or /whisper)
    if (text.startsWith('/w ') || text.startsWith('/whisper ')) {
      const match = text.match(/^\/(?:w|whisper)\s+(\S+)\s+(.+)$/i);
      if (match) {
        const [, targetName, whisperBody] = match;
        emitSocketEvent?.('whisper', { toPlayerName: targetName, message: whisperBody });
        setMessages((prev) =>
          [
            ...prev,
            {
              id: Date.now().toString(),
              sender: `You -> ${targetName}`,
              text: whisperBody,
              timestamp: Date.now(),
              type: 'WHISPER' as const,
            },
          ].slice(-100)
        );
        setChatInput('');
        return;
      }
    }

    if (text === '/help' || text === '/commands') {
      setMessages((prev) =>
        [
          ...prev,
          {
            id: Date.now().toString(),
            sender: 'System',
            text: 'Commands: /w [player] [msg], /invite [player], /p leave, /p join [leader]' + (isModerator ? ', /announce [msg], /tp [player]' : ''),
            timestamp: Date.now(),
            type: 'SYSTEM' as const,
          },
        ].slice(-100)
      );
      setChatInput('');
      return;
    }

    if (text.startsWith('/invite ') || text.startsWith('/p invite ') || text.startsWith('/party invite ')) {
      const targetName = text.replace(/^\/(?:p\s+invite|party\s+invite|invite)\s+/i, '').trim();
      if (targetName) {
        emitSocketEvent?.('party_invite_send', { targetName });
        useGameStore.getState().showToast(`Sent party invitation to ${targetName}!`);
      }
      setChatInput('');
      return;
    }

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
    if (isModerator && text.startsWith('/announce ')) {
      const msg = text.replace('/announce ', '').trim();
      if (msg) emitSocketEvent?.('staff_announce', msg);
      setChatInput('');
      return;
    }
    if (isModerator && (text.startsWith('/tp ') || text.startsWith('/goto '))) {
      const targetName = text.replace(/^\/(?:tp|goto)\s+/i, '').trim().toLowerCase();
      const otherPlayers = useGameStore.getState().otherPlayers;
      const target = Object.values(otherPlayers || {}).find(p => p && p.name && p.name.toLowerCase() === targetName);
      if (target) {
        useGameStore.getState().setPlayerPosition({ x: target.x, y: target.y }, target.direction || 'down', false);
        emitSocketEvent?.('player_move', { x: target.x, y: target.y, direction: target.direction || 'down' });
        useGameStore.getState().showToast(`Teleported to ${target.name}`);
      } else {
        useGameStore.getState().showToast(`Player "${targetName}" not found on this map.`);
      }
      setChatInput('');
      return;
    }

    if (activeTab === 'LOCAL') {
      emitSocketEvent?.('chat_message', text);
      useGameStore.getState().setPlayerChat(text);
      setMessages((prev) =>
        [
          ...prev,
          {
            id: Date.now().toString(),
            sender: player.name || 'You',
            text,
            timestamp: Date.now(),
            type: 'LOCAL' as const,
          },
        ].slice(-100)
      );
    } else if (activeTab === 'GLOBAL') {
      emitSocketEvent?.('global_chat', text);
      setMessages((prev) =>
        [
          ...prev,
          {
            id: Date.now().toString(),
            sender: player.name || 'You',
            text,
            timestamp: Date.now(),
            type: 'GLOBAL' as const,
          },
        ].slice(-100)
      );
    } else if (activeTab === 'PARTY') {
      emitSocketEvent?.('party_chat', text);
      setMessages((prev) =>
        [
          ...prev,
          {
            id: Date.now().toString(),
            sender: player.name || 'You',
            text,
            timestamp: Date.now(),
            type: 'PARTY' as const,
          },
        ].slice(-100)
      );
    }

    setChatInput('');
    setShowEmotes(false);
  };

  const handleNameClick = (name: string) => {
    const clean = name.replace(/^\[.*?\]\s*/, '').replace(/->.*$/, '').trim();
    if (clean && clean !== 'You' && clean !== player.name && clean !== 'System') {
      setChatInput(`/w ${clean} `);
      setIsExpanded(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleEmoteClick = (emote: string) => {
    setChatInput((prev) => prev + emote);
    setShowEmotes(false);
  };

  const filteredMessages = messages.filter(
    (m) =>
      activeTab === 'LOCAL'
        ? m.type === 'LOCAL' || m.type === 'SYSTEM' || m.type === 'WHISPER'
        : m.type === activeTab
  );

  const tabs: { id: TabType; label: string }[] = [
    { id: 'LOCAL', label: 'Local' },
    { id: 'GLOBAL', label: 'Global' },
    { id: 'PARTY', label: 'Party' },
    { id: 'FRIENDS', label: 'Friends' },
  ];

  const latest = messages[messages.length - 1];

  return (
    <div
      className={`pointer-events-auto z-50 flex flex-col transition-all duration-300 ${
        isExpanded
          ? 'h-[40vh] w-[92vw] sm:h-[30vh] sm:w-[400px] md:h-[250px] md:w-[480px] rounded-xl border border-[#22d3ee]/30 bg-[#050b14]/90 shadow-[0_0_20px_rgba(34,211,238,0.15)] backdrop-blur-md'
          : 'h-auto w-[85vw] sm:w-[350px] md:w-[400px] bg-black/40 backdrop-blur-sm rounded-lg border border-white/5'
      }`}
    >
      {/* Header (Only when expanded) */}
      {isExpanded && (
        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="flex w-full items-center justify-between border-b border-[#22d3ee]/20 px-3 py-2 text-left hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-cyan-400">
            <Radio className="h-4 w-4" />
            <span>COMM LINK</span>
          </div>
          <span className="text-[10px] font-mono text-cyan-200/50">Hide</span>
        </button>
      )}

      {/* Message List (Slim vs Expanded) */}
      <div 
        className={`flex min-h-0 flex-1 flex-col ${isExpanded ? 'p-2' : 'p-1'}`}
        onClick={() => !isExpanded && setIsExpanded(true)}
      >
        <div className={`relative flex-1 overflow-hidden ${isExpanded ? 'rounded-md bg-black/40 border border-[#22d3ee]/10' : ''}`}>
          {activeTab === 'FRIENDS' && isExpanded ? (
            <FriendsWrapper />
          ) : (
            <div
              ref={scrollRef}
              className={`h-full w-full space-y-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-cyan-500/20 scrollbar-track-transparent`}
            >
              {filteredMessages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-xs italic text-cyan-200/70">
                  <span>No transmissions yet.</span>
                </div>
              ) : (
                (isExpanded ? filteredMessages : filteredMessages.slice(-5)).map((msg) => {
                
                // Color coding based on channel (RS style)
                let prefix = '';
                let textStyle = '';
                let senderStyle = '';
                
                if (msg.type === 'PARTY') {
                  prefix = '[Clan] ';
                  textStyle = 'text-[#d946ef] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]'; // Magenta
                } else if (msg.type === 'GLOBAL') {
                  prefix = '[Global] ';
                  textStyle = 'text-cyan-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]';
                } else if (msg.type === 'WHISPER') {
                  prefix = '[Whisper] ';
                  textStyle = 'text-fuchsia-300 font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]';
                } else if (msg.type === 'SYSTEM') {
                  prefix = '';
                  textStyle = 'text-amber-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]';
                } else {
                  textStyle = 'text-slate-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]';
                }

                return (
                  <div key={msg.id} className={`flex text-[12px] md:text-[13px] leading-snug font-medium ${isExpanded ? '' : 'animate-in fade-in slide-in-from-bottom-1'}`}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNameClick(msg.sender);
                      }}
                      className="mr-1.5 shrink-0 font-extrabold text-cyan-200/80 hover:text-cyan-300 hover:underline cursor-pointer drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] text-left"
                    >
                      {prefix}{msg.sender}:
                    </button>
                    <span className={`${textStyle} break-words`}>{msg.text}</span>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>

      {/* Interactive elements only show when expanded */}
      {isExpanded && (
        <>
          {showEmotes && activeTab !== 'FRIENDS' && (
            <div className="absolute bottom-20 left-2 z-50 flex gap-1.5 rounded-lg border border-[#22d3ee]/20 bg-[#050b14]/95 p-2 text-lg shadow-[0_0_15px_rgba(34,211,238,0.2)] backdrop-blur-md">
              {['👋', '⚔️', '🔥', '🏆', 'GG', '❤️', '👀', '🎉'].map((e) => (
                <button
                  key={e}
                  onClick={() => handleEmoteClick(e)}
                  className="rounded-md p-1.5 transition-all hover:bg-cyan-500/20 hover:scale-110"
                >
                  {e}
                </button>
              ))}
            </div>
          )}

          {activeTab !== 'FRIENDS' && (
            <div className="flex items-center gap-2 border-t border-[#22d3ee]/20 bg-black/40 px-3 py-2">
              <span className="shrink-0 text-[11px] font-extrabold uppercase tracking-widest text-cyan-400">
                {player.name || 'You'}
              </span>
              <input
                ref={inputRef}
                type="text"
                placeholder="Broadcast transmission…"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSend();
                  } else if (e.key === 'Escape') {
                    inputRef.current?.blur();
                    setIsExpanded(false);
                  }
                }}
                className="h-8 flex-1 rounded-md border border-[#22d3ee]/20 bg-black/60 px-3 text-[13px] text-cyan-50 outline-none transition-colors placeholder:text-cyan-200/30 focus:border-cyan-400 focus:bg-black/80"
                autoFocus // focus when expanded
              />
              <button
                type="button"
                onClick={() => setShowEmotes((v) => !v)}
                className="rounded-md border border-[#22d3ee]/30 px-2.5 py-1.5 text-sm text-cyan-300 transition-colors hover:bg-cyan-500/20"
                title="Emotes"
              >
                ✦
              </button>
            </div>
          )}

          <div className="flex gap-1 border-t border-[#22d3ee]/20 bg-black/60 px-2 py-1.5">
            {tabs.map((t) => {
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex-1 rounded-md py-1.5 text-[10px] font-extrabold uppercase tracking-widest transition-all ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300 shadow-[inset_0_0_8px_rgba(34,211,238,0.2)] border border-cyan-400/50'
                      : 'text-cyan-200/40 hover:bg-white/5 hover:text-cyan-100 border border-transparent'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
