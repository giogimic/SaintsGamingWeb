'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useGameStore } from '../store';
import { FriendsList } from '@/web/components/messenger/friends-list';
import { ChatWindow } from '@/web/components/messenger/chat-window';
import { useMessenger } from '@/web/components/messenger/messenger-provider';
import { useAuth } from '@/shared/hooks/use-auth';
import { Radio, Shield, Megaphone, Users, ExternalLink, Hammer, UserX, MapPin, X, Send } from 'lucide-react';
import { HudPanelShell } from '../hud/HudPanelShell';
import { soundSynth } from '@/engine/sound-synth';

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
    <div className="h-full bg-[#04090e]/95"><ChatWindow /></div>
  ) : (
    <div className="h-full bg-[#04090e]/95"><FriendsList /></div>
  );
}

export function GameChat() {
  const [activeTab, setActiveTab] = useState<TabType>('LOCAL');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showEmotes, setShowEmotes] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showStaffPanel, setShowStaffPanel] = useState(false);
  const [announceText, setAnnounceText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const emitSocketEvent = useGameStore((state) => state.emitSocketEvent);
  const player = useGameStore((state) => state.player);
  const otherPlayers = useGameStore((state) => state.otherPlayers);
  const showToast = useGameStore((state) => state.showToast);
  const { isModerator, isAdmin, isDeveloper } = useAuth();

  const nearby = useMemo(
    () =>
      Object.entries(otherPlayers || {}).map(([socketId, p]) => ({
        socketId,
        name: p.name || 'Unknown',
      })),
    [otherPlayers]
  );

  const sendAnnounce = () => {
    const text = announceText.trim();
    if (!text) return;
    emitSocketEvent?.('staff_announce', text);
    showToast('Announcement broadcasted to map');
    setAnnounceText('');
  };

  const tpToPlayer = (socketId: string, name: string) => {
    const peer = (otherPlayers || {})[socketId];
    if (!peer) return;
    useGameStore.getState().setPlayerPosition({ x: peer.x, y: peer.y }, peer.direction || 'down', false);
    emitSocketEvent?.('player_move', { x: peer.x, y: peer.y, direction: peer.direction || 'down' });
    showToast(`Teleported to ${name}`);
  };

  const kickPlayer = (socketId: string, name: string) => {
    if (!isAdmin) return;
    if (!confirm(`Remove ${name} from the map?`)) return;
    emitSocketEvent?.('staff_kick', socketId);
    showToast(`Kick requested for ${name}`);
  };

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
        soundSynth?.playActionSound?.();
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
            text:
              'Commands: /w [player] [msg], /invite [player], /p leave, /p join [leader]' +
              (isModerator ? ', /announce [msg], /tp [player]' : ''),
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
      const target = Object.values(otherPlayers || {}).find(
        (p) => p && p.name && p.name.toLowerCase() === targetName
      );
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

    soundSynth?.playUiClick?.();
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

  const filteredMessages = messages.filter((m) =>
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

  return (
    <div className="relative pointer-events-auto flex flex-col transition-all duration-200 ease-out select-none">
      {/* Staff Commands Attached Panel (Opens directly atop chat) */}
      {showStaffPanel && isModerator && (
        <HudPanelShell className="mb-2 w-[min(92vw,360px)] shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-teal-500/20">
            <div className="flex items-center gap-1.5 text-amber-300 font-mono text-[10px] uppercase tracking-widest font-black">
              <Shield className="w-3.5 h-3.5" />
              <span>Staff Commands</span>
            </div>
            <button
              onClick={() => setShowStaffPanel(false)}
              className="p-0.5 text-slate-400 hover:text-white rounded hover:bg-white/10"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5 max-h-[40vh] overflow-y-auto font-mono">
            <div>
              <div className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-1 flex items-center gap-1">
                <Megaphone className="w-3 h-3 text-amber-400" /> Broadcast to Map
              </div>
              <div className="flex gap-1.5">
                <input
                  value={announceText}
                  onChange={(e) => setAnnounceText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendAnnounce()}
                  placeholder="Announcement text…"
                  className="flex-1 bg-black/50 border border-teal-500/30 rounded px-2 py-1 text-xs text-white placeholder:text-slate-600 outline-none focus:border-teal-400"
                />
                <button
                  onClick={sendAnnounce}
                  className="px-2.5 py-1 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase hover:bg-amber-500/30 cursor-pointer"
                >
                  Send
                </button>
              </div>
            </div>

            <div>
              <div className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-1 flex items-center gap-1">
                <Users className="w-3 h-3 text-teal-400" /> Nearby Players ({nearby.length})
              </div>
              {nearby.length === 0 ? (
                <p className="text-[10px] text-slate-500 italic px-1">No other players visible.</p>
              ) : (
                <ul className="space-y-1">
                  {nearby.map((p) => (
                    <li
                      key={p.socketId}
                      className="flex items-center justify-between gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/5 text-xs"
                    >
                      <span className="text-slate-200 truncate">{p.name}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => tpToPlayer(p.socketId, p.name)}
                          className="p-1 rounded text-teal-300 hover:bg-teal-500/20 cursor-pointer"
                          title={`Teleport to ${p.name}`}
                        >
                          <MapPin className="w-3 h-3" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => kickPlayer(p.socketId, p.name)}
                            className="p-1 rounded text-rose-300 hover:bg-rose-500/20 cursor-pointer"
                            title="Remove from map"
                          >
                            <UserX className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <a
                href="/admin"
                className="flex items-center justify-center gap-1 px-2 py-1 rounded bg-white/5 border border-white/10 text-slate-200 text-[10px] font-bold hover:bg-white/10"
              >
                <ExternalLink className="w-3 h-3 text-amber-400" />
                Admin Panel
              </a>
              {isDeveloper && (
                <a
                  href="/studio"
                  className="flex items-center justify-center gap-1 px-2 py-1 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[10px] font-bold hover:bg-amber-500/25"
                >
                  <Hammer className="w-3 h-3" />
                  Studio
                </a>
              )}
            </div>
          </div>
        </HudPanelShell>
      )}

      {/* Main Unified Chat Panel Shell */}
      <HudPanelShell
        className={`transition-all duration-200 ${
          isExpanded
            ? 'h-[36vh] w-[92vw] sm:h-[28vh] sm:w-[380px] md:h-[240px] md:w-[440px]'
            : 'h-auto w-[85vw] sm:w-[320px] md:w-[360px]'
        }`}
        noPadding
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-teal-500/20 bg-black/40 px-2.5 py-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <Radio className="h-3.5 w-3.5 text-teal-400 shrink-0" />
            <span className="text-[9px] font-mono font-black uppercase tracking-[0.2em] text-teal-200/90 truncate">
              COMM LINK
            </span>

            {/* Integrated Staff Badge Tag inside chat header */}
            {isModerator && (
              <button
                type="button"
                onClick={() => setShowStaffPanel((v) => !v)}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-mono font-black uppercase tracking-wider transition-colors cursor-pointer ${
                  showStaffPanel
                    ? 'bg-amber-500/30 text-amber-200 border border-amber-400'
                    : 'bg-amber-500/10 text-amber-300 border border-amber-500/40 hover:bg-amber-500/20'
                }`}
                title="Staff moderation commands"
              >
                <Shield className="w-2.5 h-2.5" />
                <span>STAFF</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="text-[9px] font-mono text-teal-300/60 hover:text-teal-100 transition-colors uppercase tracking-wider px-1"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>

        {/* Message Log */}
        <div
          className="flex min-h-0 flex-1 flex-col p-1.5"
          onClick={() => !isExpanded && setIsExpanded(true)}
        >
          <div className={`relative flex-1 overflow-hidden ${isExpanded ? 'rounded bg-black/40 border border-teal-500/10' : ''}`}>
            {activeTab === 'FRIENDS' && isExpanded ? (
              <FriendsWrapper />
            ) : (
              <div
                ref={scrollRef}
                className="h-full w-full space-y-1 overflow-y-auto p-1.5 font-mono scrollbar-thin scrollbar-thumb-teal-500/20 scrollbar-track-transparent"
              >
                {filteredMessages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-[11px] italic text-teal-300/50 py-2">
                    <span>No transmissions yet.</span>
                  </div>
                ) : (
                  (isExpanded ? filteredMessages : filteredMessages.slice(-4)).map((msg) => {
                    let prefix = '';
                    let textStyle = 'text-slate-200';
                    if (msg.type === 'PARTY') {
                      prefix = '[Party] ';
                      textStyle = 'text-fuchsia-300';
                    } else if (msg.type === 'GLOBAL') {
                      prefix = '[Global] ';
                      textStyle = 'text-teal-300';
                    } else if (msg.type === 'WHISPER') {
                      prefix = '[Whisper] ';
                      textStyle = 'text-purple-300 font-semibold';
                    } else if (msg.type === 'SYSTEM') {
                      prefix = '';
                      textStyle = 'text-amber-300 font-bold';
                    }

                    return (
                      <div
                        key={msg.id}
                        className="flex text-[11px] md:text-[12px] leading-snug font-medium"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNameClick(msg.sender);
                          }}
                          className="mr-1 shrink-0 font-bold text-teal-300/80 hover:text-teal-100 hover:underline cursor-pointer text-left"
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

        {/* Input & Tabs (When expanded) */}
        {isExpanded && (
          <div className="border-t border-teal-500/20 bg-black/40 p-1.5 space-y-1.5">
            {showEmotes && activeTab !== 'FRIENDS' && (
              <div className="flex gap-1 rounded border border-teal-500/30 bg-[#02060a]/95 p-1.5 text-base shadow-lg">
                {['👋', '⚔️', '🔥', '🏆', 'GG', '❤️', '👀', '🎉'].map((e) => (
                  <button
                    key={e}
                    onClick={() => handleEmoteClick(e)}
                    className="rounded p-1 hover:bg-teal-500/20 transition-all hover:scale-110"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}

            {activeTab !== 'FRIENDS' && (
              <div className="flex items-center gap-1.5">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Broadcast message…"
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
                  className="h-7 flex-1 rounded bg-black/60 border border-teal-500/30 px-2 text-xs text-slate-100 outline-none placeholder:text-teal-300/30 focus:border-teal-400 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowEmotes((v) => !v)}
                  className="h-7 px-2 rounded border border-teal-500/30 bg-white/5 text-teal-300 hover:bg-teal-500/20 text-xs transition-colors"
                  title="Emotes"
                >
                  ✦
                </button>
                <button
                  type="button"
                  onClick={handleSend}
                  className="h-7 px-2.5 rounded bg-teal-500/20 border border-teal-500/40 text-teal-200 hover:bg-teal-500/30 text-[10px] font-mono font-bold uppercase tracking-wider transition-colors"
                >
                  Send
                </button>
              </div>
            )}

            <div className="flex gap-1 pt-0.5">
              {tabs.map((t) => {
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      soundSynth?.playSelectSound?.();
                      setActiveTab(t.id);
                    }}
                    className={`flex-1 rounded-lg py-1 text-[9px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      isActive
                        ? 'bg-cyan-950/80 text-cyan-200 border border-cyan-500/50 shadow-inner'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </HudPanelShell>
    </div>
  );
}

export default GameChat;
